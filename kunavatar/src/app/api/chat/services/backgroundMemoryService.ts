import { MemoryService } from './memoryService';
import { dbOperations } from '../../../../lib/database';
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
    if (!agentId || !conversationId) return;

    // 使用setTimeout延迟3秒，确保请求完全完成后再处理
    setTimeout(async () => {
      try {
        console.log(`🧠 后台检查记忆触发条件 - 对话: ${conversationId}, Agent: ${agentId}`);
        
        // 检查是否需要触发记忆
        const shouldTrigger = MemoryService.shouldTriggerMemory(conversationId, agentId);
        
        if (shouldTrigger) {
          console.log(`🧠 后台生成记忆 - 对话: ${conversationId}, Agent: ${agentId}`);
          
          // 获取对话消息
          const rawMessages = dbOperations.getMessagesByConversationId(conversationId);
          const messages = rawMessages.map(msg => ({
            role: msg.role as 'system' | 'user' | 'assistant' | 'tool',
            content: msg.content
          }));

          // 生成记忆
          const memorySettings = MemoryService.getGlobalMemorySettings();
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
          }
        } else {
          console.log(`🧠 后台检查完成 - 暂不需要生成记忆`);
        }
      } catch (error) {
        console.error('后台记忆处理失败:', error);
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
      
      // 获取对话消息
      const rawMessages = dbOperations.getMessagesByConversationId(conversationId);
      const messages = rawMessages.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant' | 'tool',
        content: msg.content
      }));

      if (messages.length === 0) {
        console.log('没有消息可以生成记忆');
        return false;
      }

      // 生成记忆
      const memorySettings = MemoryService.getGlobalMemorySettings();
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