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

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
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

export interface ToolCallResult {
  tool_call_id: string;
  content: string;
}

export type AIStatus = 'idle' | 'loading' | 'generating' | 'tool_calling' | 'thinking';

export interface AIState {
  status: AIStatus;
  message?: string;
  toolName?: string;
  progress?: number;
  thinkingStartTime?: number;
}

// 统一的消息接口 - 同时支持 SimpleMessage 和 Message 的使用场景
export interface SimpleMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool_call' | 'system' | 'tool' | 'tool_result';
  content: string;
  timestamp: number;
  model?: string;
  toolCall?: ToolCallRuntime;
  // 扩展字段 - 支持思考模式
  isThinking?: boolean;
  tool_calls?: any[];
  // 统计字段（可选）
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

// 统一的运行时工具调用接口
export interface ToolCallRuntime {
  id: string;
  toolName: string;
  args: any;
  status: 'executing' | 'completed' | 'error';
  result?: string;
  error?: string;
  startTime: number;
  executionTime?: number;
}

// 类型别名 - 为了向后兼容和语义清晰
export type Message = SimpleMessage;
export type RuntimeToolCall = ToolCallRuntime;