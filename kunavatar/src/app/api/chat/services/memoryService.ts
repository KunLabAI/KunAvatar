import { ollamaClient, ChatMessage } from '../../../../lib/ollama';
import { dbOperations, agentMessageOperations } from '../../../../lib/database';
import { memoryOperations } from '../../../../lib/database/memories';
import { agentOperations } from '../../../../lib/database/agents';
import { userSettingOperations } from '../../../../lib/database/user-settings';
import { userOperations } from '../../../../lib/database/users';
import type { ConversationMemory } from '../../../../lib/database/memories';

// 定义全局记忆设置的结构
interface GlobalMemorySettings {
  memory_enabled: boolean;
  memory_model: string;
  memory_trigger_rounds: number;
  max_memory_entries: number;
  summary_style: 'brief' | 'detailed' | 'structured';
  memory_system_prompt: string;
}

interface MemoryContext {
  conversationId: string;
  agentId: number | null;
  messages: ChatMessage[];
  settings: GlobalMemorySettings;
}

interface MemorySummaryResult {
  summary: string;
  importantTopics: string[];
  keyFacts: string[];
  preferences: string[];
  context: string;
}

/**
 * 简化版记忆服务
 * 只保留核心功能，移除复杂的优化和分析
 */
export class MemoryService {
  /**
   * 检查是否应该触发记忆生成
   */
  static shouldTriggerMemory(conversationId: string, agentId: number | null): boolean {
    console.log(`🔍 检查记忆触发条件 - 对话: ${conversationId}, Agent: ${agentId}`);
    
    if (!agentId) {
      console.log(`❌ 记忆触发失败: agentId 为空`);
      return false;
    }

    // 1. 检查智能体创建者的记忆设置（而不是全局设置）
    const agentMemorySettings = this.getAgentMemorySettings(agentId);
    console.log(`🔍 智能体创建者记忆设置:`, {
      memory_enabled: agentMemorySettings.memory_enabled,
      memory_trigger_rounds: agentMemorySettings.memory_trigger_rounds,
      memory_model: agentMemorySettings.memory_model
    });
    
    if (!agentMemorySettings.memory_enabled) {
      console.log(`❌ 记忆触发失败: 智能体创建者记忆功能未启用`);
      return false;
    }
    
    // 2. 检查智能体设置
    const agent = agentOperations.getById(agentId);
    console.log(`🔍 智能体记忆设置:`, {
      agent_exists: !!agent,
      memory_enabled: agent?.memory_enabled
    });
    
    if (!agent || !agent.memory_enabled) {
      console.log(`❌ 记忆触发失败: 智能体不存在或记忆功能未启用`);
      return false;
    }

    // 3. 检查触发条件 - 根据对话类型查询不同的表
    const conversation = dbOperations.getConversationById(conversationId);
    if (!conversation) {
      console.log(`❌ 对话不存在: ${conversationId}`);
      return false;
    }

    let allMessages;
    if (conversation.agent_id) {
      // 智能体对话：从 agent_messages 表查询
      console.log('🤖 记忆系统检测到智能体对话，从 agent_messages 表查询消息');
      allMessages = agentMessageOperations.getByConversationId(conversationId);
    } else {
      // 模型对话：从 messages 表查询
      console.log('🔧 记忆系统检测到模型对话，从 messages 表查询消息');
      allMessages = dbOperations.getMessagesByConversationId(conversationId);
    }

    const userAssistantMessages = allMessages.filter(msg => 
      msg.role === 'user' || msg.role === 'assistant'
    );
    
    const conversationMemories = memoryOperations.getMemoriesByConversation(conversationId);
    const lastMemory = conversationMemories.length > 0 ? conversationMemories[0] : null;
    
    console.log(`🔍 消息统计:`, {
      total_messages: allMessages.length,
      user_assistant_messages: userAssistantMessages.length,
      existing_memories: conversationMemories.length,
      last_memory_id: lastMemory?.id,
      last_memory_range: lastMemory?.source_message_range
    });
    
    let newMessagesCount = userAssistantMessages.length;
    if (lastMemory && lastMemory.source_message_range) {
      const lastMemoryMessageCount = parseInt(lastMemory.source_message_range.split('-')[1] || '0');
      newMessagesCount = Math.max(0, userAssistantMessages.length - lastMemoryMessageCount);
      console.log(`🔍 计算新消息数量: 总消息 ${userAssistantMessages.length} - 上次记忆覆盖 ${lastMemoryMessageCount} = ${newMessagesCount}`);
    } else {
      console.log(`🔍 没有历史记忆，新消息数量 = 总消息数量: ${newMessagesCount}`);
    }
    
    const triggerMessagesCount = agentMemorySettings.memory_trigger_rounds * 2;
    const shouldTrigger = newMessagesCount >= triggerMessagesCount;
    
    console.log(`🔍 触发条件检查:`, {
      new_messages_count: newMessagesCount,
      trigger_threshold: triggerMessagesCount,
      should_trigger: shouldTrigger
    });
    
    if (shouldTrigger) {
      console.log(`✅ 记忆触发条件满足`);
    } else {
      console.log(`❌ 记忆触发条件不满足: 需要 ${triggerMessagesCount} 条新消息，当前只有 ${newMessagesCount} 条`);
    }
    
    return shouldTrigger;
  }

  /**
   * 为对话生成记忆总结
   */
  static async generateMemory(context: MemoryContext): Promise<ConversationMemory | null> {
    const { conversationId, agentId, messages, settings } = context;

    try {
      console.log(`🧠 开始为对话 ${conversationId} 生成记忆...`);

      const conversationMemories = memoryOperations.getMemoriesByConversation(conversationId);
      const lastMemory = conversationMemories.length > 0 ? conversationMemories[0] : null;
      let lastMemoryMessageCount = 0;
      
      if (lastMemory && lastMemory.source_message_range) {
        const parts = lastMemory.source_message_range.split('-');
        lastMemoryMessageCount = parseInt(parts[parts.length - 1] || '0');
      }

      const messagesToSummarize = this.prepareMessagesForSummary(messages, settings, lastMemoryMessageCount);
      
      if (messagesToSummarize.length === 0) {
        console.log('❌ 没有新消息需要总结');
        return null;
      }
      
      const summary = await this.createMemorySummary(messagesToSummarize, settings);
      
      if (!summary) {
        console.log('❌ 记忆总结生成失败');
        return null;
      }

      const sourceRange = this.calculateMessageRange(messages, lastMemoryMessageCount);
      const tokensSaved = this.estimateTokensSaved(messagesToSummarize, summary.summary);

      const memoryId = memoryOperations.createMemory({
        conversation_id: conversationId,
        agent_id: agentId,
        memory_type: 'summary',
        content: JSON.stringify(summary),
        source_message_range: sourceRange,
        importance_score: this.calculateImportanceScore(summary),
        tokens_saved: tokensSaved,
      });

      console.log(`✅ 记忆已创建，ID: ${memoryId}, 节省 token: ${tokensSaved}`);

      // 简单的记忆清理
      if (agentId) {
        const maxAgentMemories = settings.max_memory_entries * 2;
        const deletedCount = memoryOperations.cleanupAgentMemories(agentId, maxAgentMemories);
        if (deletedCount > 0) {
          console.log(`🧹 清理了 ${deletedCount} 条旧记忆`);
        }
      }

      return memoryOperations.getMemoriesByConversation(conversationId).find(m => m.id === memoryId) || null;

    } catch (error) {
      console.error('记忆生成失败:', error);
      return null;
    }
  }

  /**
   * 获取Agent的记忆上下文（简化版）
   */
  static getMemoryContext(conversationId: string, agentId?: number | null): string {
    const agentSettings = this.getAgentMemorySettings(agentId || null);
    
    if (!agentSettings.memory_enabled || !agentId) {
      return '';
    }

    const memories = memoryOperations.getMemoriesByAgent(agentId);
    
    if (memories.length === 0) {
      return '';
    }

    // 只保留最新的3条记忆，简化处理
    const memoriesToUse = memories
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3);

    const memoryTexts = memoriesToUse.map(memory => {
      try {
        const content = JSON.parse(memory.content) as MemorySummaryResult;
        return `[记忆 ${memory.id}] ${content.summary}`;
      } catch {
        return `[记忆 ${memory.id}] ${memory.content}`;
      }
    });

    return `\n## 相关记忆\n${memoryTexts.join('\n')}\n\n`;
  }

  /**
   * 准备用于总结的消息
   */
  private static prepareMessagesForSummary(
    messages: ChatMessage[], 
    settings: GlobalMemorySettings,
    lastMemoryMessageCount: number = 0
  ): ChatMessage[] {
    const userAssistantMessages = messages.filter(msg => 
      msg.role === 'user' || msg.role === 'assistant'
    );
    
    if (lastMemoryMessageCount > 0) {
      return userAssistantMessages.slice(lastMemoryMessageCount);
    } else {
      return userAssistantMessages.slice(-settings.memory_trigger_rounds * 2);
    }
  }

  /**
   * 创建记忆总结
   */
  private static async createMemorySummary(
    messages: ChatMessage[], 
    settings: GlobalMemorySettings
  ): Promise<MemorySummaryResult | null> {
    try {
      const summaryPrompt = this.buildSummaryPrompt(messages, settings);
      const summaryModel = settings.memory_model || 'undefined';
      
      const response = await ollamaClient.chat({
        model: summaryModel,
        messages: [
          {
            role: 'system',
            content: settings.memory_system_prompt || this.getDefaultMemoryPrompt(settings.summary_style)
          },
          {
            role: 'user',
            content: summaryPrompt
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

      try {
        return JSON.parse(response.message.content);
      } catch {
        return {
          summary: response.message.content,
          importantTopics: [],
          keyFacts: [],
          preferences: [],
          context: response.message.content
        };
      }

    } catch (error) {
      console.error('创建记忆总结失败:', error);
      return null;
    }
  }

  /**
   * 构建总结提示词
   */
  private static buildSummaryPrompt(messages: ChatMessage[], settings: GlobalMemorySettings): string {
    const conversationText = messages.map(msg => 
      `${msg.role === 'user' ? '用户' : '助手'}: ${msg.content}`
    ).join('\n');

    return `请总结以下对话内容：

${conversationText}

请以JSON格式返回，包含字段：summary, importantTopics, keyFacts, preferences, context`;
  }

  /**
   * 获取默认记忆提示词
   */
  private static getDefaultMemoryPrompt(style: string): string {
    return `你是一个专业的对话记忆助手。请从对话中提取和整理重要信息，形成${style === 'brief' ? '简洁' : '详细'}的记忆总结。`;
  }

  /**
   * 计算消息范围
   */
  private static calculateMessageRange(messages: ChatMessage[], lastMemoryMessageCount: number = 0): string {
    const userAssistantMessages = messages.filter(msg => 
      msg.role === 'user' || msg.role === 'assistant'
    );
    
    const currentMessageCount = userAssistantMessages.length;
    
    if (lastMemoryMessageCount > 0) {
      return `${lastMemoryMessageCount + 1}-${currentMessageCount}`;
    } else {
      return `1-${currentMessageCount}`;
    }
  }

  /**
   * 估算节省的token数量
   */
  private static estimateTokensSaved(originalMessages: ChatMessage[], summary: string): number {
    const originalLength = originalMessages.reduce((sum, msg) => sum + msg.content.length, 0);
    const summaryLength = summary.length;
    return Math.max(0, Math.round((originalLength - summaryLength) * 0.75));
  }

  /**
   * 计算重要性评分
   */
  private static calculateImportanceScore(summary: MemorySummaryResult): number {
    let score = 0.5;
    if (summary.importantTopics.length > 0) score += 0.1;
    if (summary.keyFacts.length > 0) score += 0.1;
    if (summary.preferences.length > 0) score += 0.1;
    if (summary.summary.length > 100) score += 0.1;
    return Math.min(1.0, score);
  }

  /**
   * 获取智能体相关的记忆设置
   * 基于智能体的创建者来获取记忆设置，而不是全局第一个用户
   */
  static getAgentMemorySettings(agentId: number | null): GlobalMemorySettings {
    console.log(`🔍 [MemoryService] 获取智能体记忆设置 - agentId: ${agentId}`);
    
    if (!agentId) {
      console.log(`⚠️ [MemoryService] 没有智能体ID，返回默认设置`);
      return {
        memory_enabled: false,
        memory_model: 'undefined',
        memory_trigger_rounds: 20,
        max_memory_entries: 10,
        summary_style: 'detailed',
        memory_system_prompt: '',
      };
    }

    try {
      // 获取智能体信息，包括创建者
      const agent = agentOperations.getById(agentId);

      if (!agent) {
        console.log(`⚠️ [MemoryService] 未找到智能体 ${agentId}，返回默认设置`);
        return {
          memory_enabled: false,
          memory_model: 'undefined',
          memory_trigger_rounds: 20,
          max_memory_entries: 10,
          summary_style: 'detailed',
          memory_system_prompt: '',
        };
      }

      console.log(`📋 [MemoryService] 智能体信息: ${agent.name} (创建者ID: ${agent.user_id})`);

      // 获取智能体创建者的记忆设置
      const settings = userSettingOperations.getByUserAndCategory(agent.user_id, 'memory');
      const settingsMap = new Map(settings.map(s => [s.key, s.value]));

      const memorySettings = {
        memory_enabled: settingsMap.get('memory_enabled') === '1',
        memory_model: String(settingsMap.get('memory_model') || 'undefined'),
        memory_trigger_rounds: parseInt(String(settingsMap.get('memory_trigger_rounds') || '20'), 10),
        max_memory_entries: parseInt(String(settingsMap.get('max_memory_entries') || '10'), 10),
        summary_style: (settingsMap.get('summary_style') as any) || 'detailed',
        memory_system_prompt: String(settingsMap.get('memory_system_prompt') || ''),
      };

      console.log(`⚙️ [MemoryService] 智能体创建者记忆设置:`, memorySettings);
      return memorySettings;
    } catch (error) {
      console.error(`❌ [MemoryService] 获取智能体记忆设置失败:`, error);
      return {
        memory_enabled: false,
        memory_model: 'undefined',
        memory_trigger_rounds: 20,
        max_memory_entries: 10,
        summary_style: 'detailed',
        memory_system_prompt: '',
      };
    }
  }

  /**
   * 获取全局记忆设置（保留向后兼容性）
   * @deprecated 建议使用 getAgentMemorySettings
   */
  static getGlobalMemorySettings(): GlobalMemorySettings {
    // 获取第一个用户的记忆设置作为全局设置（临时方案）
    const users = userOperations.getAll();
    const firstUserId = users.length > 0 ? users[0].id : null;
    
    if (!firstUserId) {
      // 返回默认设置
      return {
        memory_enabled: false,
        memory_model: 'undefined',
        memory_trigger_rounds: 20,
        max_memory_entries: 10,
        summary_style: 'detailed',
        memory_system_prompt: '',
      };
    }
    
    const settings = userSettingOperations.getByUserAndCategory(firstUserId, 'memory');
    const settingsMap = new Map(settings.map(s => [s.key, s.value]));

    return {
      memory_enabled: settingsMap.get('memory_enabled') === '1',
      memory_model: String(settingsMap.get('memory_model') || 'undefined'),
      memory_trigger_rounds: parseInt(String(settingsMap.get('memory_trigger_rounds') || '20'), 10),
      max_memory_entries: parseInt(String(settingsMap.get('max_memory_entries') || '10'), 10),
      summary_style: (settingsMap.get('summary_style') as any) || 'detailed',
      memory_system_prompt: String(settingsMap.get('memory_system_prompt') || ''),
    };
  }

  /**
   * 更新全局记忆设置
   */
  static updateGlobalMemorySetting(key: string, value: string): boolean {
    // 获取第一个用户的ID
    const users = userOperations.getAll();
    const firstUserId = users.length > 0 ? users[0].id : null;
    
    if (!firstUserId) {
      return false;
    }
    
    return userSettingOperations.createOrUpdate({
      user_id: firstUserId,
      key,
      value,
      category: 'memory'
    }) !== null;
  }
}