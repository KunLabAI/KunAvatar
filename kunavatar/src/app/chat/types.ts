// 聊天相关的共享类型定义

export type ChatMode = 'model' | 'agent';

export interface Agent {
  id: number;
  name: string;
  description: string | null;
  model_id: number;
  system_prompt: string | null;
  avatar: string | null;
  memory_enabled: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  // 关联数据
  model: any; // CustomModel类型
  servers: any[];
  tools: any[];
}

export interface Model {
  id: number;
  base_model: string;
  display_name: string;
  family: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  model?: string;
  agent_id?: number;
  agent_name?: string;
  created_at: string;
  updated_at: string;
}

// localStorage键名常量
export const STORAGE_KEYS = {
  CHAT_MODE: 'chat-mode',
  SELECTED_MODEL: 'selected-model',
  SELECTED_AGENT: 'selected-agent-id',
  LAST_USED_MODEL: 'last-used-model',
  CURRENT_CONVERSATION: 'current-conversation-id',
  ACCESS_TOKEN: 'accessToken',
} as const;