import { ChatMessage } from '../../../../lib/ollama';
import { dbOperations } from '../../../../lib/database';

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
    agentId?: number
  ): number {
    try {
      return dbOperations.createMessage({
        conversation_id: conversationId,
        role: 'user' as const,
        content: content,
        model: model,
        user_id: userId,
        agent_id: agentId
      });
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
    stats?: MessageStats
  ): number {
    try {
      const messageData = {
        conversation_id: conversationId,
        role: 'assistant' as const,
        content: content,
        model: model,
        user_id: userId,
        agent_id: agentId,
        ...(stats && {
          total_duration: stats.total_duration,
          load_duration: stats.load_duration,
          prompt_eval_count: stats.prompt_eval_count,
          prompt_eval_duration: stats.prompt_eval_duration,
          eval_count: stats.eval_count,
          eval_duration: stats.eval_duration,
        })
      };

      console.log('🔧 保存助手消息，统计信息:', stats);
      return dbOperations.createMessage(messageData);
    } catch (error) {
      console.error('保存助手消息失败:', error);
      throw error;
    }
  }

  /**
   * 保存工具结果消息
   */
  static saveToolMessage(
    conversationId: string,
    content: string,
    model: string,
    userId: string,
    agentId?: number,
    toolName?: string
  ): number {
    try {
      return dbOperations.createMessage({
        conversation_id: conversationId,
        role: 'tool' as const,
        content: content,
        model: model,
        user_id: userId,
        agent_id: agentId,
        ...(toolName && { tool_name: toolName })
      });
    } catch (error) {
      console.error('保存工具消息失败:', error);
      throw error;
    }
  }

  /**
   * 批量保存消息
   */
  static saveMessages(messages: SaveMessageRequest[]): number[] {
    const messageIds: number[] = [];

    for (const messageRequest of messages) {
      try {
        const messageId = dbOperations.createMessage({
          conversation_id: messageRequest.conversationId,
          role: messageRequest.role,
          content: messageRequest.content,
          model: messageRequest.model,
          user_id: messageRequest.userId,
          agent_id: messageRequest.agentId,
          ...(messageRequest.stats && {
            total_duration: messageRequest.stats.total_duration,
            load_duration: messageRequest.stats.load_duration,
            prompt_eval_count: messageRequest.stats.prompt_eval_count,
            prompt_eval_duration: messageRequest.stats.prompt_eval_duration,
            eval_count: messageRequest.stats.eval_count,
            eval_duration: messageRequest.stats.eval_duration,
          })
        });

        messageIds.push(messageId);
      } catch (error) {
        console.error(`保存消息失败 (${messageRequest.role}):`, error);
        // 继续处理其他消息，但记录错误
      }
    }

    return messageIds;
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
    assistantStats?: MessageStats
  ): number | null {
    if (!assistantMessage.trim()) {
      return null;
    }

    try {
      const messageId = dbOperations.createMessage({
        conversation_id: conversationId,
        role: 'assistant' as const,
        content: assistantMessage,
        model: model,
        user_id: userId,
        agent_id: agentId,
        // 如果有统计信息也一并保存
        ...(assistantStats && {
          total_duration: assistantStats.total_duration,
          load_duration: assistantStats.load_duration,
          prompt_eval_count: assistantStats.prompt_eval_count,
          prompt_eval_duration: assistantStats.prompt_eval_duration,
          eval_count: assistantStats.eval_count,
          eval_duration: assistantStats.eval_duration,
        })
      });

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