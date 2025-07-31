import { NextRequest, NextResponse } from 'next/server';
import { ollamaClient, ChatMessage } from '../../../lib/ollama';
import { mcpServerClient } from '../../../lib/mcp/mcp-client-server';
import { withAuth } from '../../../lib/middleware/auth';
import {
  ValidationService,
  StreamingChatHandler,
  ToolExecutionService,
  MessageStorageService,
  MemoryService,
  type ChatRequestBody
} from './services';
import { BackgroundMemoryService } from './services/backgroundMemoryService';

/**
 * 将记忆上下文注入到消息列表中，保留原有的系统提示词
 */
function injectMemoryContext(messages: ChatMessage[], memoryContext: string): ChatMessage[] {
  const systemMessageIndex = messages.findIndex(msg => msg.role === 'system');
  
  if (systemMessageIndex >= 0) {
    // 如果存在系统消息，将记忆上下文以结构化方式添加到系统消息中
    const existingSystemMessage = messages[systemMessageIndex];
    const enhancedSystemMessage = {
      ...existingSystemMessage,
      content: `${existingSystemMessage.content}\n\n--- 历史记忆信息 ---\n${memoryContext.trim()}\n--- 记忆信息结束 ---\n\n请参考以上记忆信息来回答用户问题，保持你的角色特性和指令不变。`
    };
    
    const updatedMessages = [...messages];
    updatedMessages[systemMessageIndex] = enhancedSystemMessage;
    return updatedMessages;
  } else {
    // 如果没有系统消息，在对话开始前添加一条用户消息来提供记忆上下文
    return [
      {
        role: 'user',
        content: `[系统：为你提供一些历史记忆信息]${memoryContext}[请基于以上记忆信息回答后续问题，无需回复此条消息]`
      },
      {
        role: 'assistant', 
        content: '我已经了解了历史记忆信息，请继续我们的对话。'
      },
      ...messages
    ];
  }
}

export const POST = withAuth(async (request) => {
  try {
    const userId = request.user!.id;

    // 确保MCP服务器客户端已连接
    if (!mcpServerClient.isClientConnected()) {
      await mcpServerClient.connect();
    }

    const body: ChatRequestBody = await request.json();
    const {
      model,
      messages,
      conversationId,
      agentId,
      stream = true,
      options = {},
      enableTools = true,
      testMode = false,
      selectedTools = [],
      titleSummarySettings
    } = body;

    // 测试模式：仅验证模型是否支持工具
    if (testMode) {
      return await ValidationService.testModelToolSupport(model, enableTools);
    }

    // 综合验证请求
    const validation = await ValidationService.validateCompleteRequest(body);
    if (!validation.isValid) {
      return validation.error!;
    }

    // 获取用户选择的工具
    const userSelectedTools = await ToolExecutionService.getUserSelectedTools(
      enableTools, 
      selectedTools
    );

    if (stream) {
      // 流式响应
      const streamResponse = await StreamingChatHandler.handleStreamingChat(request, {
        model,
        messages,
        conversationId,
        agentId,
        userId,
        options,
        enableTools,
        selectedTools,
        titleSummarySettings,
        userSelectedTools
      });
      // 将 Response 转换为 NextResponse
      return new NextResponse(streamResponse.body, {
        status: streamResponse.status,
        statusText: streamResponse.statusText,
        headers: streamResponse.headers,
      });
    } else {
      // 非流式响应
      return await handleNonStreamingChat({
        model,
        messages,
        conversationId,
        agentId,
        userId,
        options,
        enableTools,
        userSelectedTools
      });
    }
  } catch (error) {
    console.error('聊天API错误:', error);
    return ValidationService.createErrorResponse(
      '聊天请求失败',
      error instanceof Error ? error.message : '未知错误'
    );
  }
});

/**
 * 处理非流式聊天请求
 */
async function handleNonStreamingChat({
  model,
  messages,
  conversationId,
  agentId,
  userId,
  options,
  enableTools,
  userSelectedTools
}: {
  model: string;
  messages: ChatMessage[];
  conversationId?: string;
  agentId?: number;
  userId: string;
  options?: any;
  enableTools?: boolean;
  userSelectedTools: any[];
}): Promise<NextResponse> {
  // 检索记忆上下文（仅当有智能体ID和对话ID时）
  let messagesWithMemory = [...messages];
  
  if (agentId && conversationId) {
    const memoryContext = MemoryService.getMemoryContext(conversationId, agentId);
    
    if (memoryContext.trim()) {
      console.log(`🧠 为对话 ${conversationId} 注入Agent ${agentId} 的记忆上下文（非流式）`);
      messagesWithMemory = injectMemoryContext(messagesWithMemory, memoryContext);
    }
  }

  const chatRequest = {
    model,
    messages: messagesWithMemory,
    stream: false,
    options,
    ...(enableTools && userSelectedTools.length > 0 && { tools: userSelectedTools })
  };
  
  console.log('非流式聊天请求:', JSON.stringify(chatRequest, null, 2));
  
  let response = await ollamaClient.chat(chatRequest);
  let finalMessages: ChatMessage[] = [...messages];
  
  // 处理工具调用
  if (response.message?.tool_calls && response.message.tool_calls.length > 0) {
    const isAgentMode = !!agentId;
    const toolResult = await ToolExecutionService.handleToolCallsNonStream(
      response.message.tool_calls,
      userSelectedTools,
      conversationId,
      model,
      userId,
      agentId,
      isAgentMode
    );
    
    finalMessages.push(...toolResult.messages);
    
    // 为工具调用后的对话也注入记忆上下文
    let finalMessagesWithMemory = finalMessages;
    if (agentId && conversationId) {
      const memoryContext = MemoryService.getMemoryContext(conversationId, agentId);
      
      if (memoryContext.trim()) {
        finalMessagesWithMemory = injectMemoryContext(finalMessagesWithMemory, memoryContext);
      }
    }
    
    // 继续对话以获取基于工具结果的回复
    const followUpResponse = await ollamaClient.chat({
      model,
      messages: finalMessagesWithMemory,
      stream: false,
      options
    });
    
    response = followUpResponse;
  }

  // 保存消息到数据库
  if (conversationId) {
    try {
      // 🎯 根据是否有agentId判断是否为智能体模式
      const isAgentMode = !!agentId;
      
      // 保存用户消息
      const lastUserMessage = MessageStorageService.extractLastUserMessage(messages);
      if (lastUserMessage) {
        MessageStorageService.saveUserMessage(
          conversationId,
          lastUserMessage.content,
          model,
          userId,
          agentId,
          isAgentMode,
          lastUserMessage.images // 传递图片数据
        );
      }

      // 保存助手回复
      if (response.message?.content) {
        MessageStorageService.saveAssistantMessage(
          conversationId,
          response.message.content,
          model,
          userId,
          agentId,
          undefined,
          isAgentMode
        );
      }

      // 🚀 异步记忆生成：完全不阻塞对话响应
      if (agentId && conversationId && response.message?.content) {
        BackgroundMemoryService.scheduleMemoryCheck(
          conversationId,
          agentId,
          response.message.content
        );
      }
    } catch (dbError) {
      console.error('保存消息到数据库失败:', dbError);
    }
  }

  return NextResponse.json({
    success: true,
    response
  });
}