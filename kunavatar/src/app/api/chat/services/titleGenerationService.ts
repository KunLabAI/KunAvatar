import { dbOperations } from '../../../../lib/database';
import { ollamaClient } from '../../../../lib/ollama';

export interface TitleSummarySettings {
  enabled: boolean;
  model: string;
}

/**
 * 检查并生成对话标题的服务
 */
export class TitleGenerationService {
  /**
   * 检查并生成对话标题
   */
  static async checkAndGenerateTitle(
    conversationId: string, 
    titleSummarySettings?: TitleSummarySettings
  ): Promise<string | null> {
    try {
      // 检查是否启用标题总结功能
      if (!titleSummarySettings?.enabled || !titleSummarySettings?.model) {
        return null;
      }

      // 获取对话信息
      const conversation = dbOperations.getConversationById(conversationId);
      if (!conversation) {
        return null;
      }

      // 检查是否已经有自定义标题（不是默认的"新对话"或带时间戳的默认标题）
      const isDefaultTitle = conversation.title === '新对话' || conversation.title.startsWith('新对话 - ');
      if (!isDefaultTitle) {
        return null; // 已经有自定义标题，不需要重新生成
      }

      // 获取对话消息
      const messages = dbOperations.getMessagesByConversationId(conversationId);
      const userMessages = messages.filter(m => m.role === 'user');
      const assistantMessages = messages.filter(m => m.role === 'assistant');

      // 检查是否有足够的消息（至少一轮对话）
      if (userMessages.length === 0 || assistantMessages.length === 0) {
        return null;
      }

      // 同步生成标题
      const newTitle = await this.generateTitle(conversationId, titleSummarySettings.model);

      // 如果生成成功，更新数据库
      if (newTitle) {
        // 注意：这里我们使用内部方法，不需要用户权限验证
        // 因为这是在聊天过程中自动触发的
        const conversation = dbOperations.getConversationById(conversationId);
        if (conversation) {
          // 直接更新标题，不验证用户权限（因为这是系统自动操作）
          dbOperations.updateConversationTitleInternal(conversationId, newTitle);
        }
      }

      return newTitle;
    } catch (error) {
      console.error('检查标题生成条件时出错:', error);
      return null;
    }
  }

  /**
   * 内部标题生成方法（直接调用 ollama，不通过 HTTP）
   */
  private static async generateTitle(conversationId: string, model: string): Promise<string | null> {
    try {
      // 获取对话消息
      const messages = dbOperations.getMessagesByConversationId(conversationId);
      if (messages.length < 2) {
        return null;
      }

      // 筛选出前两轮对话（用户问题 + 助手回答）
      const userMessages = messages.filter(m => m.role === 'user');
      const assistantMessages = messages.filter(m => m.role === 'assistant');

      if (userMessages.length === 0 || assistantMessages.length === 0) {
        return null;
      }

      // 构建对话内容
      const firstUserMessage = userMessages[0];
      const firstAssistantMessage = assistantMessages[0];

      // 清理助手消息中的思考标签
      const cleanAssistantContent = firstAssistantMessage.content
        .replace(/<think>[\s\S]*?<\/think>/g, '') // 移除<think>标签及其内容
        .replace(/<think>[\s\S]*$/g, '') // 移除未闭合的<think>标签
        .trim();

      const conversationContent = `用户: ${firstUserMessage.content}\n\n助手: ${cleanAssistantContent}`;

      // 检查Ollama服务是否可用
      const isAvailable = await ollamaClient.isAvailable();
      if (!isAvailable) {
        console.warn('⚠️ Ollama服务不可用，无法生成标题');
        return null;
      }

      // 调用模型生成标题
      const response = await ollamaClient.chat({
        model,
        messages: [
          {
            role: 'user',
            content: `请根据以下对话内容，生成一个简洁、准确的对话标题。\n\n要求：\n- 长度控制在10-20个字符\n- 体现对话的核心主题\n- 使用中文\n- 不要包含标点符号\n- 直接返回标题，不要其他内容\n\n对话内容：\n${conversationContent}`
          }
        ],
        stream: false,
        options: {}
      });

      let generatedTitle = response.message?.content?.trim() || '';

      // 清理生成的标题
      generatedTitle = generatedTitle
        .replace(/<think>[\s\S]*?<\/think>/g, '') // 移除<think>标签及其内容
        .replace(/<think>[\s\S]*$/g, '') // 移除未闭合的<think>标签
        .replace(/["'`]/g, '') // 移除引号
        .replace(/[。！？：；，]/g, '') // 移除中文标点
        .replace(/[.!?:;,]/g, '') // 移除英文标点
        .trim();

      // 限制标题长度
      if (generatedTitle.length > 20) {
        generatedTitle = generatedTitle.substring(0, 20);
      }

      // 如果生成的标题为空或过短，使用默认标题
      if (!generatedTitle || generatedTitle.length < 2) {
        generatedTitle = `对话 - ${new Date().toLocaleString('zh-CN', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}`;
      }

      // 标题将在调用方法中更新，这里不需要更新数据库

      console.log('✅ 标题生成成功:', generatedTitle);
      return generatedTitle;
    } catch (error) {
      console.error('❌ 标题生成失败:', error);
      return null;
    }
  }

  /**
   * 发送标题更新事件到流式响应
   */
  static sendTitleUpdateEvent(
    controller: ReadableStreamDefaultController<Uint8Array>,
    encoder: TextEncoder,
    conversationId: string,
    title: string
  ): void {
    const titleUpdateData = JSON.stringify({
      type: 'title_update',
      conversationId: conversationId,
      title: title
    });
    try {
      controller.enqueue(encoder.encode(`data: ${titleUpdateData}\n\n`));
    } catch (e) {
      console.log('流已关闭，无法发送标题更新事件');
    }
  }
}