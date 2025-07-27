import { ChatMessage } from '../../../../lib/ollama';
import { dbOperations, agentMessageOperations } from '../../../../lib/database';

export interface MessageStats {
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface SaveMessageRequest {
  conversationId: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  model: string;
  userId: string;
  agentId?: number;
  stats?: MessageStats;
}

/**
 * 消息存储服务
 */
export class MessageStorageService {
  /**
   * 保存用户消息
   */
  static saveUserMessage(
    conversationId: string,
    content: string,
    model: string,
    userId: string,
    agentId?: number,
    isAgentMode: boolean = false
  ): number {
    try {
      // 🎯 根据模式选择不同的表
      if (isAgentMode && agentId) {
        // 智能体模式：使用 agent_messages 表
        return agentMessageOperations.create({
          conversation_id: conversationId,
          role: 'user' as const,
          content: content,
          agent_id: agentId,
          user_id: userId
        });
      } else {
        // 模型模式：使用 messages 表
        return dbOperations.createMessage({
          conversation_id: conversationId,
          role: 'user' as const,
          content: content,
          model: model,
          user_id: userId
        });
      }
    } catch (error) {
      console.error('保存用户消息失败:', error);
      throw error;
    }
  }

  /**
   * 保存助手消息（带统计信息）
   */
  static saveAssistantMessage(
    conversationId: string,
    content: string,
    model: string,
    userId: string,
    agentId?: number,
    stats?: MessageStats,
    isAgentMode: boolean = false
  ): number {
    try {
      // 🎯 根据模式选择不同的表
      if (isAgentMode && agentId) {
        // 智能体模式：使用 agent_messages 表
        const messageData = {
          conversation_id: conversationId,
          role: 'assistant' as const,
          content: content,
          agent_id: agentId,
          user_id: userId,
          ...(stats && {
            total_duration: stats.total_duration,
            load_duration: stats.load_duration,
            prompt_eval_count: stats.prompt_eval_count,
            prompt_eval_duration: stats.prompt_eval_duration,
            eval_count: stats.eval_count,
            eval_duration: stats.eval_duration,
          })
        };

        console.log('🔧 保存智能体助手消息，统计信息:', stats);
        return agentMessageOperations.create(messageData);
      } else {
        // 模型模式：使用 messages 表
        const messageData = {
          conversation_id: conversationId,
          role: 'assistant' as const,
          content: content,
          model: model,
          user_id: userId,
          ...(stats && {
            total_duration: stats.total_duration,
            load_duration: stats.load_duration,
            prompt_eval_count: stats.prompt_eval_count,
            prompt_eval_duration: stats.prompt_eval_duration,
            eval_count: stats.eval_count,
            eval_duration: stats.eval_duration,
          })
        };

        console.log('🔧 保存模型助手消息，统计信息:', stats);
        return dbOperations.createMessage(messageData);
      }
    } catch (error) {
      console.error('保存助手消息失败:', error);
      throw error;
    }
  }

  /**
   * 保存工具消息
   */
  static saveToolMessage(
    conversationId: string,
    toolName: string,
    toolInput: any,
    toolOutput: any,
    model: string,
    userId: string,
    agentId?: number,
    isAgentMode: boolean = false
  ): number {
    try {
      // 🎯 根据模式选择不同的表
      if (isAgentMode && agentId) {
        // 智能体模式：使用 agent_messages 表
        return agentMessageOperations.create({
          conversation_id: conversationId,
          role: 'tool' as const,
          content: JSON.stringify({ input: toolInput, output: toolOutput }),
          agent_id: agentId,
          user_id: userId,
          tool_name: toolName,
          tool_args: JSON.stringify(toolInput),
          tool_result: JSON.stringify(toolOutput),
          tool_status: 'completed'
        });
      } else {
        // 模型模式：使用 messages 表
        return dbOperations.createMessage({
          conversation_id: conversationId,
          role: 'tool' as const,
          content: JSON.stringify({ input: toolInput, output: toolOutput }),
          model: model,
          user_id: userId,
          tool_name: toolName,
          tool_args: JSON.stringify(toolInput),
          tool_result: JSON.stringify(toolOutput),
          tool_status: 'completed'
        });
      }
    } catch (error) {
      console.error('保存工具消息失败:', error);
      throw error;
    }
  }

  /**
   * 批量保存消息
   */
  static saveMessages(
    conversationId: string,
    messages: ChatMessage[],
    model: string,
    userId: string,
    agentId?: number,
    isAgentMode: boolean = false
  ): void {
    try {
      for (const message of messages) {
        if (message.role === 'user') {
          this.saveUserMessage(conversationId, message.content, model, userId, agentId, isAgentMode);
        } else if (message.role === 'assistant') {
          this.saveAssistantMessage(conversationId, message.content, model, userId, agentId, undefined, isAgentMode);
        }
      }
    } catch (error) {
      console.error('批量保存消息失败:', error);
      throw error;
    }
  }

  /**
   * 从聊天消息中提取最后的用户消息
   */
  static extractLastUserMessage(messages: ChatMessage[]): ChatMessage | null {
    const lastMessage = messages[messages.length - 1];
    return lastMessage?.role === 'user' ? lastMessage : null;
  }

  /**
   * 提取聊天统计信息
   */
  static extractStatsFromChunk(chunk: any): MessageStats | null {
    if (chunk.total_duration || chunk.load_duration || chunk.prompt_eval_count || chunk.eval_count) {
      return {
        total_duration: chunk.total_duration,
        load_duration: chunk.load_duration,
        prompt_eval_count: chunk.prompt_eval_count,
        prompt_eval_duration: chunk.prompt_eval_duration,
        eval_count: chunk.eval_count,
        eval_duration: chunk.eval_duration
      };
    }
    return null;
  }

  /**
   * 保存中断时的助手消息
   */
  static saveAbortedAssistantMessage(
    conversationId: string,
    assistantMessage: string,
    model: string,
    userId: string,
    agentId?: number,
    assistantStats?: MessageStats,
    isAgentMode: boolean = false
  ): number | null {
    if (!assistantMessage.trim()) {
      return null;
    }

    try {
      let messageId: number;
      
      // 🎯 根据模式选择不同的表
      if (isAgentMode && agentId) {
        // 智能体模式：使用 agent_messages 表
        const messageData = {
          conversation_id: conversationId,
          role: 'assistant' as const,
          content: assistantMessage,
          agent_id: agentId,
          user_id: userId,
          ...(assistantStats && {
            total_duration: assistantStats.total_duration,
            load_duration: assistantStats.load_duration,
            prompt_eval_count: assistantStats.prompt_eval_count,
            prompt_eval_duration: assistantStats.prompt_eval_duration,
            eval_count: assistantStats.eval_count,
            eval_duration: assistantStats.eval_duration,
          })
        };
        messageId = agentMessageOperations.create(messageData);
      } else {
        // 模型模式：使用 messages 表
        const messageData = {
          conversation_id: conversationId,
          role: 'assistant' as const,
          content: assistantMessage,
          model: model,
          user_id: userId,
          // 如果有统计信息也一并保存
          ...(assistantStats && {
            total_duration: assistantStats.total_duration,
            load_duration: assistantStats.load_duration,
            prompt_eval_count: assistantStats.prompt_eval_count,
            prompt_eval_duration: assistantStats.prompt_eval_duration,
            eval_count: assistantStats.eval_count,
            eval_duration: assistantStats.eval_duration,
          })
        };
        messageId = dbOperations.createMessage(messageData);
      }

      console.log('🛑 已保存中断时的助手消息，ID:', messageId);
      return messageId;
    } catch (dbError) {
      console.error('保存中断时的助手消息失败:', dbError);
      return null;
    }
  }

  /**
   * 更新对话的最后活动时间
   */
  static updateConversationTimestamp(conversationId: string): void {
    try {
      dbOperations.updateConversationTimestamp(conversationId);
    } catch (error) {
      console.error('更新对话时间戳失败:', error);
      // 不抛出错误，因为这不是关键操作
    }
  }
}