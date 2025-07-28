import { MemoryService } from './memoryService';
import { dbOperations, agentMessageOperations } from '../../../../lib/database';
import { StreamingChatHandler } from './streamingChatHandler';

/**
 * 真正的后台记忆服务
 * 使用setTimeout完全脱离请求周期，实现真正的异步处理
 */
export class BackgroundMemoryService {
  /**
   * 异步检查并生成记忆
   * 使用setTimeout将任务延迟到请求完成后，完全不阻塞响应
   */
  static scheduleMemoryCheck(
    conversationId: string,
    agentId: number | null,
    assistantMessage: string
  ): void {
    if (!agentId || !conversationId) {
      console.log(`🧠 跳过记忆检查: agentId=${agentId}, conversationId=${conversationId}`);
      return;
    }

    console.log(`🧠 调度记忆检查 - 对话: ${conversationId}, Agent: ${agentId}, 3秒后执行`);

    // 使用setTimeout延迟3秒，确保请求完全完成后再处理
    setTimeout(async () => {
      try {
        console.log(`🧠 开始后台记忆检查 - 对话: ${conversationId}, Agent: ${agentId}`);
        
        // 检查是否需要触发记忆
        const shouldTrigger = MemoryService.shouldTriggerMemory(conversationId, agentId);
        
        if (shouldTrigger) {
          console.log(`🧠 开始后台生成记忆 - 对话: ${conversationId}, Agent: ${agentId}`);
          
          // 获取对话消息 - 根据对话类型查询不同的表
          const conversation = dbOperations.getConversationById(conversationId);
          if (!conversation) {
            console.log(`❌ 对话不存在: ${conversationId}`);
            return;
          }

          let rawMessages;
          if (conversation.agent_id) {
            // 智能体对话：从 agent_messages 表查询
            console.log('🤖 后台记忆服务检测到智能体对话，从 agent_messages 表查询消息');
            rawMessages = agentMessageOperations.getByConversationId(conversationId);
          } else {
            // 模型对话：从 messages 表查询
            console.log('🔧 后台记忆服务检测到模型对话，从 messages 表查询消息');
            rawMessages = dbOperations.getMessagesByConversationId(conversationId);
          }
          const messages = rawMessages.map(msg => ({
            role: msg.role as 'system' | 'user' | 'assistant' | 'tool',
            content: msg.content
          }));

          console.log(`🧠 准备生成记忆，消息数量: ${messages.length}`);

          // 生成记忆
          const memorySettings = MemoryService.getAgentMemorySettings(agentId);
          const memory = await MemoryService.generateMemory({
            conversationId,
            agentId,
            messages,
            settings: memorySettings
          });
          
          if (memory) {
            console.log(`✅ 后台记忆生成成功，ID: ${memory.id}`);
            
            // 清空相关缓存，确保下次对话能获取到最新记忆
            this.clearMemoryCache(agentId);
          } else {
            console.log(`❌ 后台记忆生成失败`);
          }
        } else {
          console.log(`🧠 后台检查完成 - 暂不需要生成记忆`);
        }
      } catch (error) {
        console.error('❌ 后台记忆处理失败:', error);
      }
    }, 3000); // 3秒后执行，确保请求完全完成
  }

  /**
   * 清空记忆缓存
   */
  private static clearMemoryCache(agentId: number): void {
    StreamingChatHandler.clearMemoryCache(agentId);
  }

  /**
   * 强制触发记忆生成（用于测试）
   */
  static async forceGenerateMemory(
    conversationId: string,
    agentId: number
  ): Promise<boolean> {
    try {
      console.log(`🧠 强制生成记忆 - 对话: ${conversationId}, Agent: ${agentId}`);
      
      // 获取对话消息 - 根据对话类型查询不同的表
      const conversation = dbOperations.getConversationById(conversationId);
      if (!conversation) {
        console.log(`❌ 对话不存在: ${conversationId}`);
        return false;
      }

      let rawMessages;
      if (conversation.agent_id) {
        // 智能体对话：从 agent_messages 表查询
        console.log('🤖 强制记忆生成检测到智能体对话，从 agent_messages 表查询消息');
        rawMessages = agentMessageOperations.getByConversationId(conversationId);
      } else {
        // 模型对话：从 messages 表查询
        console.log('🔧 强制记忆生成检测到模型对话，从 messages 表查询消息');
        rawMessages = dbOperations.getMessagesByConversationId(conversationId);
      }
      const messages = rawMessages.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant' | 'tool',
        content: msg.content
      }));

      if (messages.length === 0) {
        console.log('没有消息可以生成记忆');
        return false;
      }

      // 生成记忆
      const memorySettings = MemoryService.getAgentMemorySettings(agentId);
      const memory = await MemoryService.generateMemory({
        conversationId,
        agentId,
        messages,
        settings: memorySettings
      });
      
      if (memory) {
        console.log(`✅ 强制记忆生成成功，ID: ${memory.id}`);
        this.clearMemoryCache(agentId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('强制记忆生成失败:', error);
      return false;
    }
  }
}