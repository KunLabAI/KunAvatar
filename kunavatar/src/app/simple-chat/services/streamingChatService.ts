/**
 * 流式聊天响应处理服务
 * 负责处理聊天API的流式响应和工具调用
 */

interface ToolCall {
  id: string;
  toolName: string;
  args: any;
  status: 'executing' | 'completed' | 'error';
  result?: string;
  error?: string;
  startTime: number;
  executionTime?: number;
}

interface StreamingHandlers {
  onMessageUpdate: (messageId: string, content: string, stats?: any) => void;
  onToolCallStart: (toolCall: ToolCall) => void;
  onToolCallComplete: (toolCallId: string, toolName: string, result: string, executionTime?: number) => void;
  onToolCallError: (toolCallId: string, toolName: string, error: string, executionTime?: number) => void;
  onNewAssistantMessage: (messageId: string) => void;
  onTitleUpdate: (conversationId: string, title: string) => void;
  onStreamEnd: () => void;
  onError: (error: string) => void;
}

export class StreamingChatService {
  private currentTargetMessageId: string | null = null;
  private assistantContent: string = '';
  private abortController: AbortController | null = null;

  async processStreamingResponse(
    response: Response,
    handlers: StreamingHandlers,
    initialMessageId: string,
    abortController?: AbortController
  ) {
    this.currentTargetMessageId = initialMessageId;
    this.assistantContent = '';
    this.abortController = abortController || null;

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      handlers.onError('无法读取响应流');
      return;
    }

    try {
      while (true) {
        // 检查是否被中断
        if (this.abortController?.signal.aborted) {
          console.log('🛑 流式响应被中断');
          reader.releaseLock();
          return;
        }

        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              handlers.onStreamEnd();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              await this.handleStreamChunk(parsed, handlers);
            } catch (parseError) {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      // 如果是中断错误，直接返回，不调用错误处理器
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('🛑 流式处理被中断');
        return;
      }
      handlers.onError(error instanceof Error ? error.message : '流式响应处理失败');
    } finally {
      // 清理资源
      try {
        reader.releaseLock();
      } catch (e) {
        // 忽略释放锁的错误
      }
      this.abortController = null;
    }
  }

  private async handleStreamChunk(parsed: any, handlers: StreamingHandlers) {
    // 处理标题更新
    if (parsed.type === 'title_update') {
      console.log('📝 收到标题更新事件:', parsed.title);
      handlers.onTitleUpdate(parsed.conversationId, parsed.title);
      return;
    }

    // 处理工具调用开始
    if (parsed.type === 'tool_call_start') {
      const toolCallId = parsed.tool_call_id || `${parsed.tool_name}-${Date.now()}`;
      console.log('🔧 工具调用开始:', parsed.tool_name, '原始ID:', parsed.tool_call_id, '使用ID:', toolCallId);
      
      const newToolCall: ToolCall = {
        id: toolCallId,
        toolName: parsed.tool_name,
        args: parsed.tool_args,
        status: 'executing',
        startTime: Date.now(),
      };
      
      handlers.onToolCallStart(newToolCall);
      return;
    }

    // 处理工具调用完成
    if (parsed.type === 'tool_call_complete') {
      console.log('🔧 工具调用完成:', parsed.tool_name, '原始ID:', parsed.tool_call_id);
      
      const result = typeof parsed.tool_result === 'string' 
        ? parsed.tool_result 
        : JSON.stringify(parsed.tool_result);
      
      handlers.onToolCallComplete(
        parsed.tool_call_id, 
        parsed.tool_name,
        result,
        parsed.execution_time
      );

      // 为后续内容创建新的助手消息
      const newAssistantMessageId = `assistant-post-tool-${parsed.tool_name}-${Date.now()}`;
      this.currentTargetMessageId = newAssistantMessageId;
      this.assistantContent = '';
      
      handlers.onNewAssistantMessage(newAssistantMessageId);
      console.log('🔧 工具调用完成，创建新助手消息，ID:', newAssistantMessageId);
      return;
    }

    // 处理工具调用错误
    if (parsed.type === 'tool_call_error') {
      console.log('🔧 工具调用错误:', parsed.tool_name, '原始ID:', parsed.tool_call_id);
      
      handlers.onToolCallError(
        parsed.tool_call_id,
        parsed.tool_name,
        parsed.error_message || '工具调用失败',
        parsed.execution_time
      );
      return;
    }

    // 处理普通消息内容
    const messageContent = typeof parsed.message === 'string' 
      ? parsed.message 
      : parsed.message?.content;

    if (this.currentTargetMessageId) {
      // 如果有内容，累积内容
      if (messageContent) {
        this.assistantContent += messageContent;
      }
      
      // 检查是否有统计信息
      const hasStats = parsed.total_duration || parsed.load_duration || 
                      parsed.prompt_eval_count || parsed.eval_count;
      
      // 只有在有内容更新或有统计信息时才调用更新
      if (messageContent || hasStats) {
        const stats = hasStats ? {
          total_duration: parsed.total_duration,
          load_duration: parsed.load_duration,
          prompt_eval_count: parsed.prompt_eval_count,
          prompt_eval_duration: parsed.prompt_eval_duration,
          eval_count: parsed.eval_count,
          eval_duration: parsed.eval_duration,
        } : undefined;
        
        handlers.onMessageUpdate(this.currentTargetMessageId, this.assistantContent, stats);
      }
    }
  }
}

export const streamingChatService = new StreamingChatService();