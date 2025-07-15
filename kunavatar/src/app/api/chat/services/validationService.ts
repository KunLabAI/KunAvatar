import { NextResponse } from 'next/server';
import { ChatMessage } from '../../../../lib/ollama';
import { ollamaClient } from '../../../../lib/ollama';
import { testTool } from '../../../../lib/tools';

export interface ChatRequestBody {
  model: string;
  messages: ChatMessage[];
  conversationId?: string;
  agentId?: number;
  stream?: boolean;
  options?: any;
  enableTools?: boolean;
  testMode?: boolean;
  selectedTools?: string[];
  titleSummarySettings?: { enabled: boolean; model: string };
}

export interface ValidationResult {
  isValid: boolean;
  error?: NextResponse;
}

/**
 * 验证服务
 */
export class ValidationService {
  /**
   * 验证聊天请求的基本参数
   */
  static validateChatRequest(body: ChatRequestBody): ValidationResult {
    const { model, messages } = body;
    
    if (!model || !messages || !Array.isArray(messages) || messages.length === 0) {
      return {
        isValid: false,
        error: NextResponse.json(
          { error: '缺少必需参数: model 和 messages' },
          { status: 400 }
        )
      };
    }
    
    return { isValid: true };
  }

  /**
   * 检查Ollama服务是否可用
   */
  static async validateOllamaAvailability(): Promise<ValidationResult> {
    const isAvailable = await ollamaClient.isAvailable();
    if (!isAvailable) {
      const ollamaHost = process.env.OLLAMA_HOST || 'localhost';
      const ollamaPort = process.env.OLLAMA_PORT || '11434';
      return {
        isValid: false,
        error: NextResponse.json(
          { 
            error: 'Ollama服务不可用',
            message: `请确保Ollama正在运行并监听在${ollamaHost}:${ollamaPort}端口`
          },
          { status: 503 }
        )
      };
    }
    
    return { isValid: true };
  }

  /**
   * 测试模式：验证模型是否支持工具
   */
  static async testModelToolSupport(
    model: string, 
    enableTools: boolean
  ): Promise<NextResponse> {
    try {
      await ollamaClient.chat({
        model,
        messages: [{ role: 'user' as const, content: 'test' }],
        tools: enableTools ? [testTool] : undefined,
        stream: false,
      });
      return NextResponse.json({ success: true, supportsTools: true });
    } catch (error: any) {
      const errorMessage = error.message || '';
      if (errorMessage.includes('does not support tools')) {
        return NextResponse.json({ success: true, supportsTools: false });
      }
      return NextResponse.json({ success: false, error: errorMessage });
    }
  }

  /**
   * 验证工具配置
   */
  static validateToolConfiguration(
    enableTools: boolean, 
    selectedTools: string[]
  ): ValidationResult {
    if (enableTools && selectedTools.length === 0) {
      console.warn('启用了工具但没有选择任何工具');
    }
    
    return { isValid: true };
  }

  /**
   * 验证对话ID
   */
  static validateConversationId(conversationId?: string): ValidationResult {
    if (conversationId && (typeof conversationId !== 'string' || conversationId.trim() === '')) {
      return {
        isValid: false,
        error: NextResponse.json(
          { error: '无效的对话ID' },
          { status: 400 }
        )
      };
    }
    
    return { isValid: true };
  }

  /**
   * 验证流式配置
   */
  static validateStreamConfiguration(stream?: boolean): ValidationResult {
    // 流式配置目前没有特殊验证需求
    return { isValid: true };
  }

  /**
   * 综合验证聊天请求
   */
  static async validateCompleteRequest(body: ChatRequestBody): Promise<ValidationResult> {
    // 基本参数验证
    const basicValidation = this.validateChatRequest(body);
    if (!basicValidation.isValid) {
      return basicValidation;
    }

    // 对话ID验证
    const conversationValidation = this.validateConversationId(body.conversationId);
    if (!conversationValidation.isValid) {
      return conversationValidation;
    }

    // 工具配置验证
    const toolValidation = this.validateToolConfiguration(
      body.enableTools || false, 
      body.selectedTools || []
    );
    if (!toolValidation.isValid) {
      return toolValidation;
    }

    // 流式配置验证
    const streamValidation = this.validateStreamConfiguration(body.stream);
    if (!streamValidation.isValid) {
      return streamValidation;
    }

    // Ollama可用性验证
    const ollamaValidation = await this.validateOllamaAvailability();
    if (!ollamaValidation.isValid) {
      return ollamaValidation;
    }

    return { isValid: true };
  }

  /**
   * 创建错误响应
   */
  static createErrorResponse(
    message: string, 
    details?: string, 
    status: number = 500
  ): NextResponse {
    return NextResponse.json(
      { 
        error: message,
        ...(details && { message: details })
      },
      { status }
    );
  }

  /**
   * 检查错误是否为工具不支持错误
   */
  static isToolsNotSupportedError(error: any): boolean {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return errorMessage.includes('does not support tools');
  }

  /**
   * 验证消息格式
   */
  static validateMessageFormat(messages: ChatMessage[]): ValidationResult {
    for (const message of messages) {
      if (!message.role || !['user', 'assistant', 'tool'].includes(message.role)) {
        return {
          isValid: false,
          error: NextResponse.json(
            { error: '消息格式错误：缺少有效的role字段' },
            { status: 400 }
          )
        };
      }
      
      if (typeof message.content !== 'string') {
        return {
          isValid: false,
          error: NextResponse.json(
            { error: '消息格式错误：content必须是字符串' },
            { status: 400 }
          )
        };
      }
    }
    
    return { isValid: true };
  }
}