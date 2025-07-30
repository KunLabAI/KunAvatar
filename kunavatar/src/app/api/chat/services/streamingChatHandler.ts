import { ChatMessage, Tool, ollamaClient } from '../../../../lib/ollama';
import { TitleGenerationService, TitleSummarySettings } from './titleGenerationService';
import { ToolExecutionService, StreamController } from './toolExecutionService';
import { MessageStorageService, MessageStats } from './messageStorageService';
import { ValidationService } from './validationService';
import { MemoryService } from './memoryService';
import { dbOperations } from '../../../../lib/database';
import { BackgroundMemoryService } from './backgroundMemoryService';

export interface StreamingChatRequest {
  model: string;
  messages: ChatMessage[];
  conversationId?: string;
  agentId?: number;
  userId: string;
  options?: any;
  enableTools?: boolean;
  selectedTools?: string[];
  titleSummarySettings?: TitleSummarySettings;
  userSelectedTools: Tool[];
}

/**
 * 流式聊天处理服务
 */
export class StreamingChatHandler {
  /**
   * 处理流式聊天请求
   */
  static async handleStreamingChat(
    request: Request,
    chatRequest: StreamingChatRequest
  ): Promise<Response> {
    const encoder = new TextEncoder();
    
    const readableStream = new ReadableStream({
      async start(controller) {
        let assistantMessage = '';
        let assistantStats: MessageStats | null = null;
        let hasToolCalls = false; // 标记是否有工具调用
        
        // 创建流控制器
        const streamController: StreamController = { controller, encoder };
        
                 // 监听请求中断信号
         const abortHandler = () => StreamingChatHandler.handleAbort(
           chatRequest.conversationId,
           assistantMessage,
           chatRequest.model,
           chatRequest.userId,
           chatRequest.agentId,
           assistantStats,
           controller
         );
         
         request.signal?.addEventListener('abort', abortHandler);
         
         try {
           // 构建聊天请求
           const ollamaChatRequest = await StreamingChatHandler.buildChatRequest(chatRequest);
           
           console.log('发送聊天请求:', JSON.stringify(ollamaChatRequest, null, 2));
           
           let retryWithoutTools = false;
           
           try {
             // 立即保存用户消息，确保时间顺序正确
             StreamingChatHandler.saveUserMessageIfExists(chatRequest);

             // 使用流式API
             for await (const chunk of ollamaClient.chatStream(ollamaChatRequest)) {
               // 处理工具调用
               if (chunk.message?.tool_calls && chunk.message.tool_calls.length > 0) {
                 hasToolCalls = true; // 标记有工具调用
                 await StreamingChatHandler.handleToolCallsInStream(
                   chunk.message.tool_calls,
                   chatRequest,
                   assistantMessage,
                   streamController
                 );
                 // 重置助手消息，为工具调用后的回复做准备
                 assistantMessage = '';
               } else {
                 // 处理普通消息块
                 const result = await StreamingChatHandler.processMessageChunk(
                   chunk,
                   assistantMessage,
                   assistantStats,
                   chatRequest,
                   streamController,
                   hasToolCalls // 传递工具调用标志
                 );
                 assistantMessage = result.assistantMessage;
                 assistantStats = result.assistantStats;
               }
             }

             // 发送结束标志
             controller.enqueue(encoder.encode('data: [DONE]\n\n'));
             controller.close();

           } catch (streamError) {
             // 处理流式错误并可能重试
             await StreamingChatHandler.handleStreamError(
               streamError,
               chatRequest,
               retryWithoutTools,
               assistantMessage,
               assistantStats,
               streamController
             );
           }
         } catch (error) {
           StreamingChatHandler.handleFatalError(error, controller, encoder);
         } finally {
           // 清理事件监听器
           request.signal?.removeEventListener('abort', abortHandler);
         }
      }
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }

  /**
   * 构建Ollama聊天请求（带智能上下文管理）
   */
  private static async buildChatRequest(chatRequest: StreamingChatRequest) {
    let messagesWithMemory = [...chatRequest.messages];
    
    // 超轻量级记忆注入：只获取必要信息，不做复杂处理
    if (chatRequest.agentId) {
      try {
        // 快速缓存机制：检查是否已经有缓存的记忆上下文
        const cacheKey = `agent_memory_${chatRequest.agentId}`;
        let memoryContext = StreamingChatHandler.memoryCache.get(cacheKey);
        
        if (!memoryContext) {
          // 只有缓存不存在时才从数据库获取
          const agentMemories = dbOperations.getMemoriesByAgent(chatRequest.agentId);
          if (agentMemories.length > 0) {
            console.log(`🧠 缓存Agent ${chatRequest.agentId} 的记忆 (${agentMemories.length} 条)`);
            
                         // 只取最新的3条记忆，保持完整内容
             memoryContext = agentMemories
               .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
               .slice(0, 3)
               .map((memory: any) => {
                 try {
                   const content = JSON.parse(memory.content);
                   return `[记忆${memory.id}] ${content.summary}`; // 保持完整内容
                 } catch {
                   return `[记忆${memory.id}] ${memory.content}`;
                 }
               })
               .join('\n');
            
            // 缓存记忆上下文（5分钟过期）
            StreamingChatHandler.memoryCache.set(cacheKey, memoryContext);
            setTimeout(() => StreamingChatHandler.memoryCache.delete(cacheKey), 5 * 60 * 1000);
          }
        } else {
          console.log(`🧠 使用缓存的记忆上下文 Agent ${chatRequest.agentId}`);
        }
        
        if (memoryContext && memoryContext.trim()) {
          messagesWithMemory = StreamingChatHandler.injectMemoryContext(messagesWithMemory, memoryContext);
        }
        
      } catch (error) {
        console.error('记忆注入失败，使用原始消息:', error);
      }
    }

    // 过滤消息，清理工具调用详细信息以避免干扰模型
    const filteredMessages = StreamingChatHandler.filterMessagesForModel(messagesWithMemory);
    
    return {
      model: chatRequest.model,
      messages: filteredMessages,
      stream: true,
      options: chatRequest.options,
      ...(chatRequest.enableTools && 
          chatRequest.userSelectedTools.length > 0 && 
          { tools: chatRequest.userSelectedTools })
    };
  }

  // 静态内存缓存
  private static memoryCache = new Map<string, string>();

  /**
   * 清空指定Agent的记忆缓存
   */
  static clearMemoryCache(agentId: number): void {
    const cacheKey = `agent_memory_${agentId}`;
    if (StreamingChatHandler.memoryCache.has(cacheKey)) {
      StreamingChatHandler.memoryCache.delete(cacheKey);
      console.log(`🧠 已清空Agent ${agentId} 的记忆缓存`);
    }
  }

  /**
   * 将记忆上下文注入到消息列表中（超轻量级版本）
   */
  private static injectMemoryContext(messages: ChatMessage[], memoryContext: string): ChatMessage[] {
    const systemMessageIndex = messages.findIndex(msg => msg.role === 'system');
    
    if (systemMessageIndex >= 0) {
      // 简洁的markdown格式注入
      const existingSystemMessage = messages[systemMessageIndex];
      const enhancedSystemMessage = {
        ...existingSystemMessage,
        content: `${existingSystemMessage.content}\n\n## 记忆\n${memoryContext}`
      };
      
      const updatedMessages = [...messages];
      updatedMessages[systemMessageIndex] = enhancedSystemMessage;
      return updatedMessages;
    } else {
      // 如果没有系统消息，创建一个简单的记忆消息
      return [
        {
          role: 'user',
          content: `## 记忆\n${memoryContext}`
        },
        ...messages
      ];
    }
  }

  /**
   * 过滤消息，清理工具调用详细信息以避免干扰模型
   */
  private static filterMessagesForModel(messages: ChatMessage[]): ChatMessage[] {
    return messages.map(msg => {
      // 清理助手消息中的工具调用信息
      if (msg.role === 'assistant' && 'tool_calls' in msg) {
        return {
          role: msg.role,
          content: msg.content || '[助手使用了工具]'
        };
      }
      
      // 过滤掉tool角色的消息，避免干扰
      if (msg.role === 'tool') {
        return null;
      }
      
      // 保留其他消息
      return {
        role: msg.role,
        content: msg.content
      };
    }).filter(msg => msg !== null) as ChatMessage[];
  }

  /**
   * 保存用户消息（如果存在）
   */
  private static saveUserMessageIfExists(chatRequest: StreamingChatRequest): void {
    if (!chatRequest.conversationId) return;

    const lastUserMessage = MessageStorageService.extractLastUserMessage(chatRequest.messages);
    if (lastUserMessage) {
      // 🎯 根据是否有agentId判断是否为智能体模式
      const isAgentMode = !!chatRequest.agentId;
      
      MessageStorageService.saveUserMessage(
        chatRequest.conversationId,
        lastUserMessage.content,
        chatRequest.model,
        chatRequest.userId,
        chatRequest.agentId,
        isAgentMode
      );
    }
  }

  /**
   * 处理工具调用
   */
  private static async handleToolCallsInStream(
    toolCalls: any[],
    chatRequest: StreamingChatRequest,
    assistantMessage: string,
    streamController: StreamController
  ): Promise<void> {
    // 注意：不在这里保存工具调用前的回复内容，避免拆分thinking内容
    // 工具调用前的内容将与工具调用后的内容合并后一起保存

    // 执行工具调用并获取结果
    const isAgentMode = !!chatRequest.agentId;
    const toolResults = await ToolExecutionService.handleToolCallsStream(
      toolCalls,
      chatRequest.userSelectedTools,
      chatRequest.conversationId,
      chatRequest.model,
      chatRequest.userId,
      streamController,
      chatRequest.agentId,
      isAgentMode
    );

    // 继续对话以获取基于工具结果的回复，并传递工具调用前的内容
    await StreamingChatHandler.continueConversationAfterTools(toolCalls, toolResults, chatRequest, streamController, assistantMessage);
  }

  /**
   * 工具调用后继续对话
   */
  private static async continueConversationAfterTools(
    toolCalls: any[],
    toolResults: any[],
    chatRequest: StreamingChatRequest,
    streamController: StreamController,
    preToolMessage: string = '' // 工具调用前的消息内容
  ): Promise<void> {
    // 构建包含工具结果的消息历史
    const updatedMessages: ChatMessage[] = [
      ...chatRequest.messages,
      {
        role: 'assistant' as const,
        content: '',
        tool_calls: toolCalls
      }
    ];

    // 添加实际的工具结果消息
    for (const toolResult of toolResults) {
      if (toolResult.result) {
        updatedMessages.push({
          role: 'tool' as const,
          content: toolResult.result,
          tool_name: toolResult.toolName // 新增：标识执行的工具名称
        });
      } else if (toolResult.error) {
        updatedMessages.push({
          role: 'tool' as const,
          content: `工具执行错误: ${toolResult.error}`,
          tool_name: toolResult.toolName // 新增：标识执行的工具名称
        });
      }
    }

    console.log('🔧 构建的消息历史包含工具结果:', JSON.stringify(updatedMessages.slice(-3), null, 2));

    // 为工具调用后的对话也注入记忆上下文
    let messagesWithMemory = updatedMessages;
    if (chatRequest.agentId && chatRequest.conversationId) {
      const memoryContext = MemoryService.getMemoryContext(chatRequest.conversationId);
      
      if (memoryContext.trim()) {
        messagesWithMemory = StreamingChatHandler.injectMemoryContext(messagesWithMemory, memoryContext);
      }
    }

    // 继续对话以获取基于工具结果的回复
    const followUpRequest = {
      model: chatRequest.model,
      messages: messagesWithMemory,
      stream: true,
      options: chatRequest.options
    };

    let followUpMessage = '';
    for await (const followUpChunk of ollamaClient.chatStream(followUpRequest)) {
      if (followUpChunk.message?.content) {
        followUpMessage += followUpChunk.message.content;
      }

      const followUpData = `data: ${JSON.stringify(followUpChunk)}\n\n`;
      streamController.controller.enqueue(streamController.encoder.encode(followUpData));

      if (followUpChunk.done && chatRequest.conversationId) {
        // 合并工具调用前后的内容
        const completeMessage = preToolMessage + followUpMessage;
        
        if (completeMessage.trim()) {
          // 立即保存合并后的完整助手回复
          // 🎯 根据是否有agentId判断是否为智能体模式
          const isAgentMode = !!chatRequest.agentId;
          
          MessageStorageService.saveAssistantMessage(
            chatRequest.conversationId,
            completeMessage,
            chatRequest.model,
            chatRequest.userId,
            chatRequest.agentId,
            MessageStorageService.extractStatsFromChunk(followUpChunk) || undefined,
            isAgentMode
          );

          // 检查是否需要生成标题
          StreamingChatHandler.checkAndGenerateTitle(
            chatRequest.conversationId,
            chatRequest.titleSummarySettings,
            streamController
          );
        }
        break;
      }
    }
  }

  /**
   * 处理消息块
   */
  private static async processMessageChunk(
    chunk: any,
    assistantMessage: string,
    assistantStats: MessageStats | null,
    chatRequest: StreamingChatRequest,
    streamController: StreamController,
    hasToolCalls: boolean = false // 是否有工具调用
  ): Promise<{ assistantMessage: string; assistantStats: MessageStats | null }> {
    // 累积助手的回复内容
    if (chunk.message?.content) {
      assistantMessage += chunk.message.content;
    }

    // 更新统计信息
    const newStats = MessageStorageService.extractStatsFromChunk(chunk);
    if (newStats) {
      assistantStats = newStats;
      console.log('🔧 收到统计信息:', assistantStats);
    }

    // 处理thinking字段，如果存在则发送给前端
    if (chunk.message?.thinking) {
      const thinkingData = {
        type: 'thinking',
        thinking: chunk.message.thinking
      };
      const thinkingDataStr = `data: ${JSON.stringify(thinkingData)}\n\n`;
      streamController.controller.enqueue(streamController.encoder.encode(thinkingDataStr));
    }

    // 发送数据块到客户端
    const data = `data: ${JSON.stringify(chunk)}\n\n`;
    streamController.controller.enqueue(streamController.encoder.encode(data));

    // 如果完成且没有工具调用，才保存助手回复（有工具调用时由continueConversationAfterTools处理）
    if (chunk.done && chatRequest.conversationId && assistantMessage.trim() && !hasToolCalls) {
      try {
        const statsToSave = MessageStorageService.extractStatsFromChunk(chunk) || assistantStats;
        console.log('🔧 保存助手消息，统计信息:', statsToSave);

        // 🎯 根据是否有agentId判断是否为智能体模式
        const isAgentMode = !!chatRequest.agentId;

        MessageStorageService.saveAssistantMessage(
          chatRequest.conversationId,
          assistantMessage,
          chatRequest.model,
          chatRequest.userId,
          chatRequest.agentId,
          statsToSave || undefined,
          isAgentMode
        );

        // 🚀 异步记忆生成：完全不阻塞对话响应
        if (chatRequest.conversationId && chatRequest.agentId) {
          BackgroundMemoryService.scheduleMemoryCheck(
            chatRequest.conversationId,
            chatRequest.agentId,
            assistantMessage
          );
        }
        
        // 检查是否需要生成标题（等待完成以确保在流关闭前发送事件）
        await StreamingChatHandler.checkAndGenerateTitle(
          chatRequest.conversationId,
          chatRequest.titleSummarySettings,
          streamController
        );
      } catch (dbError) {
        console.error('保存助手消息到数据库失败:', dbError);
      }
    }

    return { assistantMessage, assistantStats };
  }

  /**
   * 检查并生成标题
   */
  private static async checkAndGenerateTitle(
    conversationId: string,
    titleSummarySettings: TitleSummarySettings | undefined,
    streamController: StreamController
  ): Promise<void> {
    try {
      const newTitle = await TitleGenerationService.checkAndGenerateTitle(conversationId, titleSummarySettings);
      if (newTitle) {
        // 确保在流关闭前发送标题更新事件
        try {
          TitleGenerationService.sendTitleUpdateEvent(
            streamController.controller,
            streamController.encoder,
            conversationId,
            newTitle
          );
          console.log('📝 标题更新事件已发送:', newTitle);
        } catch (streamError) {
          console.log('流已关闭，无法发送标题更新事件，但标题已保存到数据库:', newTitle);
        }
      }
    } catch (error) {
      console.error('生成标题时出错:', error);
    }
  }

  /**
   * 处理流式错误
   */
  private static async handleStreamError(
    streamError: any,
    chatRequest: StreamingChatRequest,
    retryWithoutTools: boolean,
    assistantMessage: string,
    assistantStats: MessageStats | null,
    streamController: StreamController
  ): Promise<void> {
    console.error('流式请求错误:', streamError);

    const isToolsNotSupported = ValidationService.isToolsNotSupportedError(streamError);

    // 如果启用了工具且出现工具不支持错误，尝试不使用工具重新请求
    if (chatRequest.enableTools && !retryWithoutTools && isToolsNotSupported) {
      console.log('模型不支持工具调用，尝试不使用工具重新请求');
      await StreamingChatHandler.retryWithoutTools(chatRequest, assistantMessage, assistantStats, streamController);
    } else {
      // 如果已经重试过或者没有启用工具，或者不是工具不支持的错误，直接抛出错误
      throw streamError;
    }
  }

  /**
   * 不使用工具重试请求
   */
  private static async retryWithoutTools(
    chatRequest: StreamingChatRequest,
    assistantMessage: string,
    assistantStats: MessageStats | null,
    streamController: StreamController
  ): Promise<void> {
    // 重置助手消息内容，避免重复累积
    assistantMessage = '';

    // 重新构建不包含工具的请求
    const retryRequest = {
      model: chatRequest.model,
      messages: chatRequest.messages,
      stream: true,
      options: chatRequest.options
    };

    // 重新尝试流式API
    for await (const chunk of ollamaClient.chatStream(retryRequest)) {
      const result = await StreamingChatHandler.processMessageChunk(
        chunk,
        assistantMessage,
        assistantStats,
        chatRequest,
        streamController
      );
      assistantMessage = result.assistantMessage;
      assistantStats = result.assistantStats;
    }

    // 发送结束标志
    streamController.controller.enqueue(streamController.encoder.encode('data: [DONE]\n\n'));
    streamController.controller.close();
  }

  /**
   * 处理请求中断
   */
  private static handleAbort(
    conversationId: string | undefined,
    assistantMessage: string,
    model: string,
    userId: string,
    agentId: number | undefined,
    assistantStats: MessageStats | null,
    controller: ReadableStreamDefaultController<Uint8Array>
  ): void {
    console.log('🛑 检测到请求中断，保存已生成的内容');

    if (conversationId) {
      // 🎯 根据是否有agentId判断是否为智能体模式
      const isAgentMode = !!agentId;
      
      MessageStorageService.saveAbortedAssistantMessage(
        conversationId,
        assistantMessage,
        model,
        userId,
        agentId,
        assistantStats || undefined,
        isAgentMode
      );
    }

    // 关闭控制器
    try {
      controller.close();
    } catch (e) {
      // 忽略重复关闭的错误
    }
  }

  /**
   * 处理致命错误
   */
  private static handleFatalError(
    error: any,
    controller: ReadableStreamDefaultController<Uint8Array>,
    encoder: TextEncoder
  ): void {
    console.error('流式聊天失败:', error);
    const errorData = `data: ${JSON.stringify({
      error: true,
      message: error instanceof Error ? error.message : '聊天请求失败'
    })}\n\n`;
    controller.enqueue(encoder.encode(errorData));
    controller.close();
  }
}