import { ChatMessage } from '../../../../lib/ollama';
import { TokenEstimationService, ContextUsage } from './tokenEstimationService';
import { MemoryService } from './memoryService';

/**
 * 上下文管理策略配置
 */
export interface ContextStrategy {
  name: string;
  cleanupThreshold: number;  // 触发清理的阈值百分比
  keepPercentage: number;    // 保留的上下文百分比
  memoryWeight: number;      // 记忆在上下文中的权重
  enableProactiveMemory: boolean;  // 是否启用主动记忆生成
  enableRecursiveMemory: boolean;  // 是否启用递归记忆更新
}

/**
 * 预定义的上下文管理策略（修复：降低阈值，增加强制清理策略）
 */
export const CONTEXT_STRATEGIES: Record<string, ContextStrategy> = {
  conservative: {
    name: '保守策略',
    cleanupThreshold: 70,  // 降低到70%
    keepPercentage: 70,
    memoryWeight: 0.8,
    enableProactiveMemory: true,
    enableRecursiveMemory: false
  },
  balanced: {
    name: '平衡策略',
    cleanupThreshold: 60,  // 降低到60%
    keepPercentage: 60,
    memoryWeight: 0.9,
    enableProactiveMemory: true,
    enableRecursiveMemory: true
  },
  aggressive: {
    name: '积极策略',
    cleanupThreshold: 50,  // 降低到50%
    keepPercentage: 50,
    memoryWeight: 1.0,
    enableProactiveMemory: true,
    enableRecursiveMemory: true
  },
  force_rounds: {
    name: '强制轮数策略',
    cleanupThreshold: 0,   // 强制按轮数清理，不考虑token使用率
    keepPercentage: 40,
    memoryWeight: 1.0,
    enableProactiveMemory: true,
    enableRecursiveMemory: true
  }
};

/**
 * 上下文管理结果
 */
export interface ContextManagementResult {
  optimizedMessages: ChatMessage[];
  contextUsage: ContextUsage;
  memoryGenerated: boolean;
  messagesCleanedUp: number;
  memoryUpdated: boolean;
  strategy: ContextStrategy;
}

/**
 * 智能上下文管理服务
 */
export class ContextManagerService {
  /**
   * 智能管理对话上下文
   */
  static async manageContext(
    messages: ChatMessage[],
    conversationId: string,
    agentId: number | null,
    model: string,
    strategyName: string = 'balanced'
  ): Promise<ContextManagementResult> {
    const strategy = CONTEXT_STRATEGIES[strategyName] || CONTEXT_STRATEGIES.balanced;
    
    console.log(`🧠 开始智能上下文管理 - 策略: ${strategy.name}`);
    
    // 1. 获取当前记忆上下文
    const memoryContext = agentId ? MemoryService.getMemoryContext(conversationId, agentId) : '';
    
    // 2. 分析当前上下文使用情况
    const contextUsage = TokenEstimationService.analyzeContextUsage(messages, memoryContext, model);
    
    console.log(`📊 当前上下文使用情况: ${contextUsage.usagePercentage.toFixed(1)}%`);
    
    // 3. 判断是否需要进行上下文优化
    if (contextUsage.usagePercentage < strategy.cleanupThreshold) {
      console.log('✅ 上下文使用率正常，无需优化');
      return {
        optimizedMessages: messages,
        contextUsage,
        memoryGenerated: false,
        messagesCleanedUp: 0,
        memoryUpdated: false,
        strategy
      };
    }
    
    // 4. 执行上下文优化
    console.log('🔄 开始执行上下文优化...');
    
    let optimizedMessages = [...messages];
    let memoryGenerated = false;
    let messagesCleanedUp = 0;
    let memoryUpdated = false;
    
    // 分离系统消息和其他消息
    const systemMessages = messages.filter(m => m.role === 'system');
    const nonSystemMessages = messages.filter(m => m.role !== 'system');
    
    // 计算需要清理的消息数量
    const targetKeepMessages = Math.floor(nonSystemMessages.length * strategy.keepPercentage / 100);
    const messagesToCleanup = nonSystemMessages.length - targetKeepMessages;
    
    if (messagesToCleanup > 0 && agentId) {
      // 5. 生成记忆来替代要清理的消息
      const messagesToSummarize = nonSystemMessages.slice(0, messagesToCleanup);
      
      if (messagesToSummarize.length >= 4) { // 至少2轮对话
        console.log(`📝 正在为 ${messagesToSummarize.length} 条消息生成记忆...`);
        
        const memorySettings = MemoryService.getGlobalMemorySettings();
        const memory = await MemoryService.generateMemory({
          conversationId,
          agentId,
          messages: messagesToSummarize,
          settings: memorySettings
        });
        
        if (memory) {
          memoryGenerated = true;
          console.log(`✅ 记忆生成成功，ID: ${memory.id}`);
          
          // 6. 清理旧消息
          optimizedMessages = [
            ...systemMessages,
            ...nonSystemMessages.slice(messagesToCleanup)
          ];
          messagesCleanedUp = messagesToCleanup;
          
          console.log(`🗑️ 已清理 ${messagesCleanedUp} 条旧消息`);
        }
      }
    }
    
    // 7. 如果启用了递归记忆更新，检查是否需要优化记忆
    if (strategy.enableRecursiveMemory && agentId) {
      const recursiveResult = await this.checkRecursiveMemoryUpdate(conversationId, agentId, strategy);
      if (recursiveResult.updated) {
        memoryUpdated = true;
        console.log(`🔄 递归记忆更新完成，合并了 ${recursiveResult.mergedCount} 条记忆`);
      }
    }
    
    // 8. 验证优化结果
    const newMemoryContext = agentId ? MemoryService.getMemoryContext(conversationId, agentId) : '';
    const finalContextUsage = TokenEstimationService.analyzeContextUsage(
      optimizedMessages, 
      newMemoryContext, 
      model
    );
    
    console.log(`✅ 上下文优化完成: ${finalContextUsage.usagePercentage.toFixed(1)}% (优化前: ${contextUsage.usagePercentage.toFixed(1)}%)`);
    
    return {
      optimizedMessages,
      contextUsage: finalContextUsage,
      memoryGenerated,
      messagesCleanedUp,
      memoryUpdated,
      strategy
    };
  }

  /**
   * 检查并执行递归记忆更新
   */
  private static async checkRecursiveMemoryUpdate(
    conversationId: string,
    agentId: number,
    strategy: ContextStrategy
  ): Promise<{ updated: boolean; mergedCount: number }> {
    try {
      // 获取Agent的所有记忆
      const { memoryOperations } = require('../../../../lib/database/memories');
      const agentMemories = memoryOperations.getMemoriesByAgent(agentId);
      
      // 检查是否有太多记忆需要合并
      const memorySettings = MemoryService.getGlobalMemorySettings();
      const maxMemories = memorySettings.max_memory_entries;
      
      if (agentMemories.length <= maxMemories) {
        return { updated: false, mergedCount: 0 };
      }
      
      // 按重要性分组记忆
      const sortedMemories = agentMemories.sort((a: any, b: any) => {
        // 先按重要性排序，再按创建时间排序
        if (a.importance_score !== b.importance_score) {
          return b.importance_score - a.importance_score;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      // 保留高重要性记忆，合并低重要性记忆
      const memoriesToKeep = sortedMemories.slice(0, maxMemories);
      const memoriesToMerge = sortedMemories.slice(maxMemories);
      
      if (memoriesToMerge.length < 2) {
        return { updated: false, mergedCount: 0 };
      }
      
      // 将低重要性记忆合并为一个高级记忆
      const mergedMemory = await this.mergeMemories(memoriesToMerge, conversationId, agentId);
      
      if (mergedMemory) {
        // 删除已合并的记忆
        for (const memory of memoriesToMerge) {
          memoryOperations.deleteMemory(memory.id);
        }
        
        console.log(`🔄 递归记忆更新：合并了 ${memoriesToMerge.length} 条记忆为记忆 ID: ${mergedMemory}`);
        return { updated: true, mergedCount: memoriesToMerge.length };
      }
      
      return { updated: false, mergedCount: 0 };
      
    } catch (error) {
      console.error('递归记忆更新失败:', error);
      return { updated: false, mergedCount: 0 };
    }
  }

  /**
   * 合并多个记忆为一个高级记忆
   */
  private static async mergeMemories(
    memories: any[],
    conversationId: string,
    agentId: number
  ): Promise<number | null> {
    try {
      // 提取所有记忆的内容
      const memoryContents = memories.map(memory => {
        try {
          const content = JSON.parse(memory.content);
          return `[记忆${memory.id}] ${content.summary || memory.content}`;
        } catch {
          return `[记忆${memory.id}] ${memory.content}`;
        }
      });
      
      const combinedContent = memoryContents.join('\n\n');
      
      // 使用AI来合并记忆
      const { ollamaClient } = require('../../../../lib/ollama');
      const memorySettings = MemoryService.getGlobalMemorySettings();
      
      const mergePrompt = `请将以下多个记忆合并成一个更高级的记忆总结：

${combinedContent}

请以JSON格式返回合并后的记忆，包含以下字段：
- summary: 合并后的总结
- importantTopics: 重要话题（合并去重）
- keyFacts: 关键事实（合并去重）
- preferences: 用户偏好（合并去重）
- context: 总体上下文信息

要求：
1. 保留所有重要信息
2. 去除重复内容
3. 突出共同主题和模式
4. 保持信息的连贯性`;

      const response = await ollamaClient.chat({
        model: memorySettings.memory_model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的记忆合并助手，擅长将多个相关记忆合并为一个更高级的记忆。'
          },
          {
            role: 'user',
            content: mergePrompt
          }
        ],
        stream: false,
        options: {
          temperature: 0.3,
          top_p: 0.8,
        }
      });
      
      if (!response.message?.content) {
        return null;
      }
      
      // 解析合并后的记忆
      let mergedContent: any;
      try {
        mergedContent = JSON.parse(response.message.content);
      } catch {
        mergedContent = {
          summary: response.message.content,
          importantTopics: [],
          keyFacts: [],
          preferences: [],
          context: response.message.content
        };
      }
      
      // 计算合并后的重要性评分（取平均值并略微提升）
      const avgImportance = memories.reduce((sum, m) => sum + m.importance_score, 0) / memories.length;
      const mergedImportance = Math.min(1.0, avgImportance + 0.1);
      
      // 计算节省的token数量
      const originalTokens = memories.reduce((sum, m) => sum + (m.tokens_saved || 0), 0);
      const mergedTokens = Math.floor(originalTokens * 1.2); // 合并后通常能节省更多token
      
      // 创建合并后的记忆
      const { memoryOperations } = require('../../../../lib/database/memories');
      const mergedMemoryId = memoryOperations.createMemory({
        conversation_id: conversationId,
        agent_id: agentId,
        memory_type: 'summary',
        content: JSON.stringify(mergedContent),
        source_message_range: `merged-${memories.length}-memories`,
        importance_score: mergedImportance,
        tokens_saved: mergedTokens,
      });
      
      return mergedMemoryId;
      
    } catch (error) {
      console.error('合并记忆失败:', error);
      return null;
    }
  }

  /**
   * 获取建议的上下文管理策略
   */
  static getRecommendedStrategy(
    messages: ChatMessage[],
    model: string,
    agentMemoryCount: number
  ): string {
    const maxContext = TokenEstimationService.getMaxContextLength(model);
    const currentTokens = TokenEstimationService.estimateMessagesTokens(messages, model);
    const usagePercentage = (currentTokens / maxContext) * 100;
    
    if (usagePercentage > 80 || agentMemoryCount > 50) {
      return 'aggressive';
    } else if (usagePercentage > 60 || agentMemoryCount > 20) {
      return 'balanced';
    } else {
      return 'conservative';
    }
  }

  /**
   * 预览上下文管理操作
   */
  static previewContextManagement(
    messages: ChatMessage[],
    conversationId: string,
    agentId: number | null,
    model: string,
    strategyName: string = 'balanced'
  ): {
    currentUsage: ContextUsage;
    strategy: ContextStrategy;
    estimatedCleanupMessages: number;
    estimatedTokenSavings: number;
    recommendation: string;
  } {
    const strategy = CONTEXT_STRATEGIES[strategyName] || CONTEXT_STRATEGIES.balanced;
    const memoryContext = agentId ? MemoryService.getMemoryContext(conversationId, agentId) : '';
    const currentUsage = TokenEstimationService.analyzeContextUsage(messages, memoryContext, model);
    
    let estimatedCleanupMessages = 0;
    let estimatedTokenSavings = 0;
    let recommendation = '';
    
    if (currentUsage.usagePercentage >= strategy.cleanupThreshold) {
      const nonSystemMessages = messages.filter(m => m.role !== 'system');
      const targetKeepMessages = Math.floor(nonSystemMessages.length * strategy.keepPercentage / 100);
      estimatedCleanupMessages = nonSystemMessages.length - targetKeepMessages;
      
      if (estimatedCleanupMessages > 0) {
        const messagesToSummarize = nonSystemMessages.slice(0, estimatedCleanupMessages);
        estimatedTokenSavings = TokenEstimationService.estimateMemoryBenefit(
          messagesToSummarize,
          300, // 预期记忆长度
          model
        );
        recommendation = `建议清理 ${estimatedCleanupMessages} 条旧消息，预计节省 ${estimatedTokenSavings} tokens`;
      }
    } else {
      recommendation = '当前上下文使用率正常，无需优化';
    }
    
    return {
      currentUsage,
      strategy,
      estimatedCleanupMessages,
      estimatedTokenSavings,
      recommendation
    };
  }
}