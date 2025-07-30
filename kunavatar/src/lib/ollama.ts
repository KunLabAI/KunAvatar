// Ollama API 客户端
import { UserSettingOperations } from '@/lib/database/user-settings';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

export interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaModelDetails {
  modelfile: string;
  parameters: string;
  template: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
  model_info: {
    'general.architecture': string;
    'general.file_type': number;
    'general.parameter_count': number;
    'general.quantization_version': number;
    'llama.context_length'?: number;
    'llama.embedding_length'?: number;
    'gemma.context_length'?: number;
    'gemma.embedding_length'?: number;
    [key: string]: any; // 支持其他架构的字段
  };
  capabilities: string[];
  license?: string;
  system?: string;
}

export interface OllamaModelsResponse {
  models: OllamaModel[];
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_name?: string; // 新增：用于tool角色消息标识执行的工具名称
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description: string;
        enum?: string[];
      }>;
      required: string[];
    };
  };
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  tools?: Tool[];
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    repeat_penalty?: number;
    seed?: number;
    num_predict?: number;
  };
}

export interface ChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
    tool_calls?: ToolCall[];
    thinking?: string; // 思考模型的思考过程
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaClient {
  private baseUrl: string;

  constructor(baseUrl: string = OLLAMA_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * 获取当前配置的 Ollama 基础 URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * 获取本地可用的模型列表
   */
  async getModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Ollama API 错误响应:', response.status, response.statusText, errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data: OllamaModelsResponse = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('获取模型列表失败:', error);
      throw new Error('无法连接到Ollama服务，请确保Ollama正在运行');
    }
  }

  /**
   * 获取指定模型的详细信息
   */
  async getModelDetails(modelName: string): Promise<OllamaModelDetails> {
    try {
      const response = await fetch(`${this.baseUrl}/api/show`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`获取模型 '${modelName}' 详细信息失败:`, response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const details = await response.json();
      
      // 改进的系统提示词提取逻辑
      let systemPrompt = '';
      
      if (details.modelfile) {
        // 尝试多种 SYSTEM 指令格式（不区分大小写）
        const patterns = [
          // 三引号格式：SYSTEM """content"""
          /(?:SYSTEM|system)\s+"""([\s\S]*?)"""/i,
          // 双引号格式：SYSTEM "content"
          /(?:SYSTEM|system)\s+"([^"]*?)"/i,
          // 单引号格式：SYSTEM 'content'
          /(?:SYSTEM|system)\s+'([^']*?)'/i,
          // 无引号格式（到行尾）：SYSTEM content
          /(?:SYSTEM|system)\s+([^\n\r]*)/i,
        ];
        
        for (const pattern of patterns) {
          const match = details.modelfile.match(pattern);
          if (match && match[1].trim()) {
            systemPrompt = match[1].trim();
            break;
          }
        }
        

      }
      
      details.system = systemPrompt;

      return details;
    } catch (error) {
      console.error(`请求模型 '${modelName}' 详细信息时出错:`, error);
      throw new Error(`无法获取模型 '${modelName}' 的详细信息`);
    }
  }

  /**
   * 发送聊天请求（非流式）
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...request,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Ollama API 错误响应:', response.status, response.statusText, errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('聊天请求失败:', error);
      throw new Error('聊天请求失败，请检查网络连接和Ollama服务状态');
    }
  }

  /**
   * 发送流式聊天请求
   */
  async *chatStream(request: ChatRequest): AsyncGenerator<ChatResponse, void, unknown> {
    try {
      // console.log('Ollama chatStream 请求:', JSON.stringify(request, null, 2));
      
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...request,
          stream: true,
        }),
      });
      
      // console.log('Ollama 响应状态:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Ollama API 错误响应:', response.status, response.statusText, errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      if (!response.body) {
        throw new Error('响应体为空');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          
          // 保留最后一行（可能不完整）
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine) {
              try {
                const data: ChatResponse = JSON.parse(trimmedLine);
                yield data;
                
                // 如果收到完成标志，结束生成
                if (data.done) {
                  return;
                }
              } catch (parseError) {
                console.warn('解析JSON失败:', parseError, '原始数据:', trimmedLine);
              }
            }
          }
        }

        // 处理缓冲区中剩余的数据
        if (buffer.trim()) {
          try {
            const data: ChatResponse = JSON.parse(buffer.trim());
            yield data;
          } catch (parseError) {
            console.warn('解析最后的JSON失败:', parseError);
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('流式聊天请求失败:', error);
      if (error instanceof Error) {
        throw error; // 保持原始错误信息
      } else {
        throw new Error('流式聊天请求失败，请检查网络连接和Ollama服务状态');
      }
    }
  }

  /**
   * 检查Ollama服务是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5秒超时
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 检查指定模型是否已加载到内存中
   */
  async isModelLoaded(modelName: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ps`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('获取模型状态失败:', response.status, response.statusText);
        return false;
      }

      const data = await response.json();
      const loadedModels = data.models || [];
      
      // 检查指定模型是否在已加载的模型列表中
      return loadedModels.some((model: any) => model.name === modelName);
    } catch (error) {
      console.error('检查模型加载状态失败:', error);
      return false;
    }
  }



  /**
   * 格式化模型大小
   */
  static formatModelSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * 格式化模型名称（移除标签）
   */
  static formatModelName(name: string): string {
    return name.split(':')[0];
  }
}

// 默认客户端实例
export const ollamaClient = new OllamaClient();

/**
 * 获取用户特定的Ollama客户端实例
 * @param userId 用户ID
 * @returns 配置了用户特定连接设置的Ollama客户端实例
 */
export function getUserOllamaClient(userId: string): OllamaClient {
  const userOllamaUrl = UserSettingOperations.getValue(
    userId,
    'ollama-base-url',
    OLLAMA_BASE_URL
  );
  
  return new OllamaClient(userOllamaUrl);
}