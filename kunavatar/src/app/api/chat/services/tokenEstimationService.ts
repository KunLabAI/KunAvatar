import { ChatMessage } from '../../../../lib/ollama';

/**
 * 不同模型的Token估算配置
 */
interface ModelTokenConfig {
  charsPerToken: number;
  systemPromptWeight: number;
  memoryWeight: number;
  maxContextLength: number;
}

/**
 * 默认模型配置
 */
const DEFAULT_MODEL_CONFIGS: Record<string, ModelTokenConfig> = {
  // Qwen系列
  'qwen2.5:3b': { charsPerToken: 0.7, systemPromptWeight: 1.2, memoryWeight: 0.9, maxContextLength: 32768 },
  'qwen2.5:7b': { charsPerToken: 0.7, systemPromptWeight: 1.2, memoryWeight: 0.9, maxContextLength: 32768 },
  'qwen2.5:14b': { charsPerToken: 0.7, systemPromptWeight: 1.2, memoryWeight: 0.9, maxContextLength: 32768 },
  'qwen2.5:32b': { charsPerToken: 0.7, systemPromptWeight: 1.2, memoryWeight: 0.9, maxContextLength: 32768 },
  'qwen2.5:72b': { charsPerToken: 0.7, systemPromptWeight: 1.2, memoryWeight: 0.9, maxContextLength: 32768 },
  
  // LLaMA系列
  'llama3.1:8b': { charsPerToken: 0.8, systemPromptWeight: 1.1, memoryWeight: 0.9, maxContextLength: 131072 },
  'llama3.1:70b': { charsPerToken: 0.8, systemPromptWeight: 1.1, memoryWeight: 0.9, maxContextLength: 131072 },
  'llama3.1:405b': { charsPerToken: 0.8, systemPromptWeight: 1.1, memoryWeight: 0.9, maxContextLength: 131072 },
  
  // DeepSeek系列
  'deepseek-r1:1.5b': { charsPerToken: 0.75, systemPromptWeight: 1.15, memoryWeight: 0.85, maxContextLength: 131072 },
  'deepseek-r1:7b': { charsPerToken: 0.75, systemPromptWeight: 1.15, memoryWeight: 0.85, maxContextLength: 131072 },
  'deepseek-r1:8b': { charsPerToken: 0.75, systemPromptWeight: 1.15, memoryWeight: 0.85, maxContextLength: 131072 },
  'deepseek-r1:14b': { charsPerToken: 0.75, systemPromptWeight: 1.15, memoryWeight: 0.85, maxContextLength: 131072 },
  'deepseek-r1:32b': { charsPerToken: 0.75, systemPromptWeight: 1.15, memoryWeight: 0.85, maxContextLength: 131072 },
  'deepseek-r1:70b': { charsPerToken: 0.75, systemPromptWeight: 1.15, memoryWeight: 0.85, maxContextLength: 131072 },
  
  // 通用默认配置
  'default': { charsPerToken: 0.8, systemPromptWeight: 1.1, memoryWeight: 0.9, maxContextLength: 32768 }
};

/**
 * 上下文使用统计
 */
export interface ContextUsage {
  totalTokens: number;
  systemTokens: number;
  memoryTokens: number;
  messageTokens: number;
  maxContextLength: number;
  usagePercentage: number;
  needsCleanup: boolean;
  recommendedKeepMessages: number;
}

/**
 * Token估算服务
 */
export class TokenEstimationService {
  /**
   * 获取模型配置
   */
  private static getModelConfig(model: string): ModelTokenConfig {
    // 尝试精确匹配
    if (DEFAULT_MODEL_CONFIGS[model]) {
      return DEFAULT_MODEL_CONFIGS[model];
    }
    
    // 尝试模糊匹配
    const modelLower = model.toLowerCase();
    for (const [key, config] of Object.entries(DEFAULT_MODEL_CONFIGS)) {
      if (key !== 'default' && modelLower.includes(key.split(':')[0])) {
        return config;
      }
    }
    
    // 返回默认配置
    return DEFAULT_MODEL_CONFIGS['default'];
  }

  /**
   * 估算单条消息的Token数量
   */
  static estimateMessageTokens(message: ChatMessage, model: string): number {
    const config = this.getModelConfig(model);
    const baseTokens = Math.ceil(message.content.length * config.charsPerToken);
    
    // 根据消息类型调整权重
    switch (message.role) {
      case 'system':
        return Math.ceil(baseTokens * config.systemPromptWeight);
      case 'user':
        return baseTokens;
      case 'assistant':
        return baseTokens;
      case 'tool':
        return Math.ceil(baseTokens * 0.8); // 工具消息通常较简洁
      default:
        return baseTokens;
    }
  }

  /**
   * 估算多条消息的总Token数量
   */
  static estimateMessagesTokens(messages: ChatMessage[], model: string): number {
    return messages.reduce((total, message) => {
      return total + this.estimateMessageTokens(message, model);
    }, 0);
  }

  /**
   * 估算记忆内容的Token数量
   */
  static estimateMemoryTokens(memoryContent: string, model: string): number {
    const config = this.getModelConfig(model);
    return Math.ceil(memoryContent.length * config.charsPerToken * config.memoryWeight);
  }

  /**
   * 分析当前上下文使用情况
   */
  static analyzeContextUsage(
    messages: ChatMessage[],
    memoryContent: string,
    model: string
  ): ContextUsage {
    const config = this.getModelConfig(model);
    
    // 分离系统消息和其他消息
    const systemMessages = messages.filter(m => m.role === 'system');
    const otherMessages = messages.filter(m => m.role !== 'system');
    
    // 计算各部分Token使用量
    const systemTokens = this.estimateMessagesTokens(systemMessages, model);
    const memoryTokens = this.estimateMemoryTokens(memoryContent, model);
    const messageTokens = this.estimateMessagesTokens(otherMessages, model);
    
    const totalTokens = systemTokens + memoryTokens + messageTokens;
    const usagePercentage = (totalTokens / config.maxContextLength) * 100;
    
    // 判断是否需要清理（使用量超过80%）
    const needsCleanup = usagePercentage > 80;
    
    // 计算建议保留的消息数量（保留最新的消息，确保不超过60%上下文）
    const targetTokens = Math.floor(config.maxContextLength * 0.6) - systemTokens - memoryTokens;
    let recommendedKeepMessages = 0;
    let accumulatedTokens = 0;
    
    // 从最新消息开始向前计算
    for (let i = otherMessages.length - 1; i >= 0; i--) {
      const messageTokens = this.estimateMessageTokens(otherMessages[i], model);
      if (accumulatedTokens + messageTokens <= targetTokens) {
        accumulatedTokens += messageTokens;
        recommendedKeepMessages++;
      } else {
        break;
      }
    }
    
    return {
      totalTokens,
      systemTokens,
      memoryTokens,
      messageTokens,
      maxContextLength: config.maxContextLength,
      usagePercentage,
      needsCleanup,
      recommendedKeepMessages
    };
  }

  /**
   * 估算生成记忆可节省的Token数量
   */
  static estimateMemoryBenefit(
    messagesToSummarize: ChatMessage[],
    expectedSummaryLength: number,
    model: string
  ): number {
    const originalTokens = this.estimateMessagesTokens(messagesToSummarize, model);
    const summaryTokens = this.estimateMemoryTokens('x'.repeat(expectedSummaryLength), model);
    
    return Math.max(0, originalTokens - summaryTokens);
  }

  /**
   * 获取模型的最大上下文长度
   */
  static getMaxContextLength(model: string): number {
    const config = this.getModelConfig(model);
    return config.maxContextLength;
  }

  /**
   * 检查是否需要立即触发记忆生成（基于上下文压力）
   */
  static shouldTriggerMemoryByContext(
    messages: ChatMessage[],
    memoryContent: string,
    model: string
  ): boolean {
    const usage = this.analyzeContextUsage(messages, memoryContent, model);
    
    // 如果上下文使用量超过75%，建议立即触发记忆生成
    return usage.usagePercentage > 75;
  }

  /**
   * 计算优化后的上下文配置
   */
  static calculateOptimalContext(
    messages: ChatMessage[],
    memoryContent: string,
    model: string
  ): {
    shouldCleanup: boolean;
    keepMessages: number;
    shouldGenerateMemory: boolean;
    messagesToSummarize: ChatMessage[];
  } {
    const usage = this.analyzeContextUsage(messages, memoryContent, model);
    const shouldCleanup = usage.needsCleanup;
    const keepMessages = usage.recommendedKeepMessages;
    
    // 过滤出非系统消息
    const nonSystemMessages = messages.filter(m => m.role !== 'system');
    
    // 如果需要清理，计算需要总结的消息
    const messagesToSummarize = shouldCleanup 
      ? nonSystemMessages.slice(0, nonSystemMessages.length - keepMessages)
      : [];
    
    // 如果有足够的消息需要总结，建议生成记忆
    const shouldGenerateMemory = messagesToSummarize.length > 4; // 至少2轮对话
    
    return {
      shouldCleanup,
      keepMessages,
      shouldGenerateMemory,
      messagesToSummarize
    };
  }

  /**
   * 获取上下文使用情况的可读报告
   */
  static getContextUsageReport(
    messages: ChatMessage[],
    memoryContent: string,
    model: string
  ): string {
    const usage = this.analyzeContextUsage(messages, memoryContent, model);
    
    return `📊 上下文使用情况报告：
- 总Token使用量: ${usage.totalTokens}/${usage.maxContextLength} (${usage.usagePercentage.toFixed(1)}%)
- 系统消息: ${usage.systemTokens} tokens
- 记忆内容: ${usage.memoryTokens} tokens  
- 对话消息: ${usage.messageTokens} tokens
- 状态: ${usage.needsCleanup ? '⚠️ 需要清理' : '✅ 正常'}
- 建议保留消息数: ${usage.recommendedKeepMessages}`;
  }
} 