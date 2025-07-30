import { Tool, ChatMessage } from '../../../../lib/ollama';
import { dbOperations, mcpDbOperations } from '../../../../lib/database';
import { messageOperations } from '../../../../lib/database/messages';
import { db } from '../../../../lib/database/connection';
import { ToolExecutor, getToolsByNames } from '../../../../lib/tools';

export interface ToolCallResult {
  toolCallId: string;
  toolName: string;
  args: any;
  result?: string;
  error?: string;
  executionTime: number;
  messageId?: number;
}

export interface StreamController {
  controller: ReadableStreamDefaultController<Uint8Array>;
  encoder: TextEncoder;
}

/**
 * 工具执行服务
 */
export class ToolExecutionService {
  /**
   * 获取用户选择的工具定义
   */
  static async getUserSelectedTools(enableTools: boolean, selectedTools: string[]): Promise<Tool[]> {
    if (!enableTools || selectedTools.length === 0) {
      return [];
    }
    
    const userSelectedTools = await getToolsByNames(selectedTools);
    console.log('用户选择的工具:', selectedTools);
    console.log('获取到的工具定义:', userSelectedTools);
    return userSelectedTools;
  }

  /**
   * 处理工具调用（流式模式）
   */
  static async handleToolCallsStream(
    toolCalls: any[],
    userSelectedTools: Tool[],
    conversationId: string | undefined,
    model: string,
    userId: string,
    streamController: StreamController,
    agentId?: number,
    isAgentMode: boolean = false
  ): Promise<ToolCallResult[]> {
    const results: ToolCallResult[] = [];

    for (const toolCall of toolCalls) {
      const startTime = Date.now();
      let currentToolCallMessageId: number | null = null;

      // 🔧 修复：确保工具调用有唯一ID
      const toolCallId = toolCall.id || `${toolCall.function.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      toolCall.id = toolCallId; // 更新toolCall对象的ID

      try {
        // 安全解析工具调用参数
        const args = this.parseToolArguments(toolCall.function.arguments);
        
        // 发送工具调用开始状态
        this.sendToolCallStartEvent(streamController, toolCallId, toolCall.function.name, args);
        
        // 创建工具调用消息记录
        if (conversationId) {
          currentToolCallMessageId = this.createToolCallMessage(conversationId, toolCall.function.name, args, userId, agentId, isAgentMode);
        }

        // 执行工具调用
        const selectedTool = userSelectedTools.find(tool => tool.function.name === toolCall.function.name);
        const serverName = (selectedTool as any)?.serverName;
        
        console.log(`执行工具 ${toolCall.function.name}，使用服务器: ${serverName || '自动检测'}`);
        const result = await ToolExecutor.executeToolCall(toolCall.function.name, args, serverName);
        const executionTime = Date.now() - startTime;

        // 更新工具调用消息状态
        if (conversationId && currentToolCallMessageId) {
          this.updateToolCallMessage(currentToolCallMessageId, result, executionTime, isAgentMode);
        }
        
        // 发送工具调用完成状态
        this.sendToolCallCompleteEvent(streamController, toolCallId, toolCall.function.name, args, result, executionTime);
        
        results.push({
          toolCallId,
          toolName: toolCall.function.name,
          args,
          result,
          executionTime,
          messageId: currentToolCallMessageId || undefined
        });

      } catch (toolError) {
        const executionTime = Date.now() - startTime;
        const errorMessage = toolError instanceof Error ? toolError.message : '未知错误';

        console.error('工具执行失败:', toolError);

        // 更新工具调用消息状态为错误
        if (conversationId && currentToolCallMessageId) {
          this.updateToolCallMessageError(currentToolCallMessageId, executionTime, errorMessage, isAgentMode);
        }
        
        // 发送工具调用错误状态
        const args = this.parseToolArguments(toolCall.function.arguments);
        this.sendToolCallErrorEvent(streamController, toolCallId, toolCall.function.name, args, errorMessage, executionTime);
        
        results.push({
          toolCallId,
          toolName: toolCall.function.name,
          args,
          error: errorMessage,
          executionTime,
          messageId: currentToolCallMessageId || undefined
        });
      }
    }

    return results;
  }

  /**
   * 处理工具调用（非流式模式）
   */
  static async handleToolCallsNonStream(
    toolCalls: any[],
    userSelectedTools: Tool[],
    conversationId: string | undefined,
    model: string,
    userId: string,
    agentId?: number,
    isAgentMode: boolean = false
  ): Promise<{ messages: ChatMessage[], results: ToolCallResult[] }> {
    const results: ToolCallResult[] = [];
    const newMessages: ChatMessage[] = [];

    for (const toolCall of toolCalls) {
      const startTime = Date.now();
      let toolCallMessageId: number | null = null;
      
      try {
        const args = this.parseToolArguments(toolCall.function.arguments);
        
        // 保存工具调用消息到数据库
        if (conversationId) {
          if (isAgentMode && agentId) {
            // 智能体模式：使用 agent_messages 表
            const { agentMessageOperations } = require('../../../../lib/database');
            toolCallMessageId = agentMessageOperations.create({
              conversation_id: conversationId,
              role: 'assistant' as const,
              content: `调用工具: ${toolCall.function.name}\n参数: ${JSON.stringify(args, null, 2)}`,
              agent_id: agentId,
              user_id: userId,
              tool_name: toolCall.function.name,
              tool_args: JSON.stringify(args),
              tool_status: 'executing'
            });
          } else {
            // 模型模式：使用 messages 表
            toolCallMessageId = dbOperations.createMessage({
              conversation_id: conversationId,
              role: 'assistant' as const,
              content: `调用工具: ${toolCall.function.name}\n参数: ${JSON.stringify(args, null, 2)}`,
              model: model,
              user_id: userId
            });
          }
        }
        
        // 执行工具调用
        const selectedTool = userSelectedTools.find(tool => tool.function.name === toolCall.function.name);
        const serverName = (selectedTool as any)?.serverName;
        
        console.log(`非流式执行工具 ${toolCall.function.name}，使用服务器: ${serverName || '自动检测'}`);
        const result = await ToolExecutor.executeToolCall(toolCall.function.name, args, serverName);
        const executionTime = Date.now() - startTime;
        
        // 保存工具结果消息到数据库
        if (conversationId) {
          if (isAgentMode && agentId) {
            // 智能体模式：使用 agent_messages 表
            const { agentMessageOperations } = require('../../../../lib/database');
            agentMessageOperations.create({
              conversation_id: conversationId,
              role: 'tool' as const,
              content: result,
              agent_id: agentId,
              user_id: userId,
              tool_name: toolCall.function.name,
              tool_result: result,
              tool_status: 'completed',
              tool_execution_time: executionTime
            });
          } else {
            // 模型模式：使用 messages 表
            dbOperations.createMessage({
              conversation_id: conversationId,
              role: 'tool' as const,
              content: result,
              model: model,
              user_id: userId,
              tool_name: toolCall.function.name
            });
          }
        }
        
        // 添加工具调用和结果到消息历史
        newMessages.push({
          role: 'assistant' as const,
          content: '',
          tool_calls: [toolCall]
        });
        
        newMessages.push({
          role: 'tool' as const,
          content: result,
          tool_name: toolCall.function.name // 新增：标识执行的工具名称
        });
        
        results.push({
          toolCallId: toolCall.id || `${toolCall.function.name}-${Date.now()}`,
          toolName: toolCall.function.name,
          args,
          result,
          executionTime,
          messageId: toolCallMessageId || undefined
        });
        
      } catch (toolError) {
        const executionTime = Date.now() - startTime;
        const errorMessage = toolError instanceof Error ? toolError.message : '未知错误';
        
        console.error('工具执行失败:', toolError);
        
        // 保存工具调用失败记录到数据库
        if (conversationId && toolCall) {
          const args = this.parseToolArguments(toolCall.function.arguments);
          
          // 保存错误结果消息
          if (isAgentMode && agentId) {
            // 智能体模式：使用 agent_messages 表
            const { agentMessageOperations } = require('../../../../lib/database');
            agentMessageOperations.create({
              conversation_id: conversationId,
              role: 'tool' as const,
              content: `工具执行失败: ${errorMessage}`,
              agent_id: agentId,
              user_id: userId,
              tool_name: toolCall.function.name,
              tool_result: JSON.stringify({ error: errorMessage }),
              tool_status: 'error',
              tool_execution_time: executionTime
            });
          } else {
            // 模型模式：使用 messages 表
            dbOperations.createMessage({
              conversation_id: conversationId,
              role: 'tool' as const,
              content: `工具执行失败: ${errorMessage}`,
              model: model,
              user_id: userId,
              tool_name: toolCall.function.name
            });
          }
        }
        
        results.push({
          toolCallId: toolCall.id || `${toolCall.function.name}-${Date.now()}`,
          toolName: toolCall.function.name,
          args: this.parseToolArguments(toolCall.function.arguments),
          error: errorMessage,
          executionTime,
          messageId: toolCallMessageId || undefined
        });
      }
    }

    return { messages: newMessages, results };
  }

  /**
   * 安全解析工具调用参数
   */
  private static parseToolArguments(arguments_: any): any {
    let args = {};
    if (arguments_) {
      if (typeof arguments_ === 'string') {
        try {
          args = JSON.parse(arguments_);
        } catch (parseError) {
          console.error('工具参数JSON解析失败:', parseError, '原始参数:', arguments_);
          throw new Error(`工具参数格式错误: ${arguments_}`);
        }
      } else if (typeof arguments_ === 'object') {
        args = arguments_;
      }
    }
    return args;
  }

  /**
   * 创建工具调用消息记录
   */
  private static createToolCallMessage(
    conversationId: string, 
    toolName: string, 
    args: any, 
    userId: string,
    agentId?: number,
    isAgentMode: boolean = false
  ): number | null {
    try {
      if (isAgentMode && agentId) {
        // 智能体模式：使用 agent_messages 表的专门方法
        const { agentMessageOperations } = require('../../../../lib/database');
        return agentMessageOperations.createToolCall({
          conversation_id: conversationId,
          user_id: userId,
          agent_id: agentId,
          tool_name: toolName,
          tool_args: JSON.stringify(args),
          tool_status: 'executing'
        });
      } else {
        // 模型模式：使用 messages 表
        return messageOperations.createToolCall({
          conversation_id: conversationId,
          user_id: userId,
          tool_name: toolName,
          tool_args: args,
          tool_status: 'executing'
        });
      }
    } catch (dbError) {
      console.error('创建工具调用消息失败:', dbError);
      return null;
    }
  }

  /**
   * 更新工具调用消息状态（成功）
   */
  private static updateToolCallMessage(
    messageId: number, 
    result: string, 
    executionTime: number,
    isAgentMode: boolean = false
  ): void {
    try {
      if (isAgentMode) {
        // 智能体模式：使用 agent_messages 表的专门方法
        const { agentMessageOperations } = require('../../../../lib/database');
        agentMessageOperations.updateToolCallResult(messageId, JSON.stringify(result), 'completed', executionTime);
      } else {
        // 模型模式：使用 messages 表
        const updateToolCall = db.prepare(`
          UPDATE messages SET
            tool_result = ?,
            tool_status = 'completed',
            tool_execution_time = ?
          WHERE id = ?
        `);
        updateToolCall.run(JSON.stringify(result), executionTime, messageId);
      }
    } catch (dbError) {
      console.error('更新工具调用状态失败:', dbError);
    }
  }

  /**
   * 更新工具调用消息状态（错误）
   */
  private static updateToolCallMessageError(
    messageId: number, 
    executionTime: number, 
    errorMessage: string,
    isAgentMode: boolean = false
  ): void {
    try {
      if (isAgentMode) {
        // 智能体模式：使用 agent_messages 表的专门方法
        const { agentMessageOperations } = require('../../../../lib/database');
        agentMessageOperations.updateToolCallResult(messageId, JSON.stringify({ error: errorMessage }), 'error', executionTime, errorMessage);
      } else {
        // 模型模式：使用 messages 表
        const updateToolCall = db.prepare(`
          UPDATE messages SET
            tool_status = 'error',
            tool_execution_time = ?,
            tool_error = ?
          WHERE id = ?
        `);
        updateToolCall.run(executionTime, errorMessage, messageId);
      }
    } catch (dbError) {
      console.error('更新工具调用错误状态失败:', dbError);
    }
  }

  /**
   * 发送工具调用开始事件
   */
  private static sendToolCallStartEvent(
    streamController: StreamController,
    toolCallId: string,
    toolName: string,
    args: any
  ): void {
    console.log('🔧 后端发送 tool_call_start，toolCall.id:', toolCallId, 'tool_name:', toolName);
    const toolStartData = `data: ${JSON.stringify({
      type: 'tool_call_start',
      tool_name: toolName,
      tool_args: args,
      tool_call_id: toolCallId
    })}\n\n`;
    streamController.controller.enqueue(streamController.encoder.encode(toolStartData));
  }

  /**
   * 发送工具调用完成事件
   */
  private static sendToolCallCompleteEvent(
    streamController: StreamController,
    toolCallId: string,
    toolName: string,
    args: any,
    result: string,
    executionTime: number
  ): void {
    console.log('🔧 后端发送 tool_call_complete，toolCall.id:', toolCallId, 'tool_name:', toolName);
    const toolCompleteData = `data: ${JSON.stringify({
      type: 'tool_call_complete',
      tool_name: toolName,
      tool_args: args,
      tool_result: result,
      tool_call_id: toolCallId,
      execution_time: executionTime
    })}\n\n`;
    streamController.controller.enqueue(streamController.encoder.encode(toolCompleteData));
  }

  /**
   * 发送工具调用错误事件
   */
  private static sendToolCallErrorEvent(
    streamController: StreamController,
    toolCallId: string,
    toolName: string,
    args: any,
    errorMessage: string,
    executionTime: number
  ): void {
    const toolErrorData = `data: ${JSON.stringify({
      type: 'tool_call_error',
      tool_name: toolName,
      tool_args: args,
      error_message: errorMessage,
      tool_call_id: toolCallId,
      execution_time: executionTime
    })}\n\n`;
    streamController.controller.enqueue(streamController.encoder.encode(toolErrorData));
  }
}