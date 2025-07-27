// 对话相关接口
export interface ConversationStats {
  message_count: number;
  total_characters: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
}

export interface Conversation {
  id: string;
  title: string;
  model?: string;
  user_id?: string;
  agent_id?: number | null;
  created_at: string;
  updated_at: string;
  stats?: ConversationStats;
}

export interface Message {
  id: number;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool' | 'tool_call' | 'tool_result';
  content: string;
  model?: string;
  user_id?: string;
  agent_id?: number;
  sequence_number?: number;
  created_at: string;
  timestamp?: number; // 用于消息排序的时间戳
  // 工具调用相关字段
  tool_name?: string;
  tool_args?: string; // JSON字符串
  tool_result?: string; // JSON字符串
  tool_status?: 'executing' | 'completed' | 'error';
  tool_execution_time?: number; // 毫秒
  tool_error?: string;
  // Ollama生成统计信息
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface CreateConversationData {
  id?: string;
  title: string;
  model?: string;
  user_id: string;
  agent_id?: number | null;
}

export interface CreateMessageData {
  conversation_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool' | 'tool_call' | 'tool_result';
  content: string;
  model?: string;
  user_id: string;
  sequence_number?: number;
  // 工具调用相关字段
  tool_name?: string;
  tool_args?: string; // JSON字符串
  tool_result?: string; // JSON字符串
  tool_status?: 'executing' | 'completed' | 'error';
  tool_execution_time?: number; // 毫秒
  tool_error?: string;
  // Ollama生成统计信息
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

// MCP相关接口
export interface McpServer {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  type: 'stdio' | 'sse' | 'streamable-http';
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  enabled: boolean;
  
  // STDIO配置
  command?: string;
  args?: string; // JSON数组格式
  working_directory?: string;
  
  // SSE/HTTP配置
  url?: string;
  base_url?: string;
  port?: number;
  path?: string;
  protocol?: 'http' | 'https';
  
  // 通用配置
  headers?: string; // JSON对象格式
  auth_type?: 'none' | 'bearer' | 'basic' | 'api_key';
  auth_config?: string; // JSON格式
  timeout_ms?: number;
  retry_attempts?: number;
  retry_delay_ms?: number;
  
  // 扩展配置
  extra_config?: string; // JSON格式
  
  created_at: string;
  updated_at: string;
  last_connected_at?: string;
  error_message?: string;
}

export interface McpTool {
  id: number;
  server_id: number;
  name: string;
  description?: string;
  input_schema?: string; // JSON格式
  is_available: boolean;
  enabled: boolean;
  last_used_at?: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface McpToolCall {
  id: number;
  tool_id: number;
  conversation_id: number;
  message_id?: number;
  input_args?: string; // JSON格式
  output_result?: string; // JSON格式
  execution_time_ms?: number;
  status: 'success' | 'error' | 'timeout';
  error_message?: string;
  created_at: string;
}

export interface CreateMcpServerData {
  name: string;
  display_name: string;
  description?: string;
  type: 'stdio' | 'sse' | 'streamable-http';
  enabled?: boolean;
  
  // STDIO配置
  command?: string;
  args?: string[];
  working_directory?: string;
  
  // SSE/HTTP配置
  url?: string;
  base_url?: string;
  port?: number;
  path?: string;
  protocol?: 'http' | 'https';
  
  // 通用配置
  headers?: Record<string, string>;
  auth_type?: 'none' | 'bearer' | 'basic' | 'api_key';
  auth_config?: Record<string, any>;
  timeout_ms?: number;
  retry_attempts?: number;
  retry_delay_ms?: number;
  
  // 扩展配置
  extra_config?: Record<string, any>;
}

export interface CreateMcpToolData {
  server_id: number;
  name: string;
  description?: string;
  input_schema?: Record<string, any>;
  is_available?: boolean;
  enabled?: boolean;
}

export interface CreateMcpToolCallData {
  tool_id: number;
  conversation_id: number;
  message_id?: number;
  input_args?: Record<string, any>;
  output_result?: Record<string, any>;
  execution_time_ms?: number;
  status: 'success' | 'error' | 'timeout';
  error_message?: string;
}

// 用户管理相关接口
export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  status: 'pending' | 'active' | 'inactive' | 'suspended';
  email_verified: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string; // 明文密码，将被加密
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  status?: 'pending' | 'active' | 'inactive' | 'suspended';
  email_verified?: boolean;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  status?: 'pending' | 'active' | 'inactive' | 'suspended';
  email_verified?: boolean;
}

export interface Role {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  is_system: boolean; // 是否为系统角色（不可删除）
  created_at: string;
  updated_at: string;
}

export interface CreateRoleData {
  name?: string;
  display_name: string;
  description?: string;
  is_system?: boolean;
}

export interface Permission {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  resource: string; // 资源名称，如 'users', 'conversations', 'agents'
  action: string; // 操作名称，如 'create', 'read', 'update', 'delete'
  created_at: string;
}

export interface CreatePermissionData {
  name: string;
  display_name: string;
  description?: string;
  resource: string;
  action: string;
}

export interface UserRole {
  user_id: string;
  role_id: string;
  assigned_at: string;
  assigned_by?: string; // 分配者用户ID
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
  granted_at: string;
  granted_by?: string; // 授权者用户ID
}

// 用户认证相关接口
export interface LoginCredentials {
  username: string; // 可以是用户名或邮箱
  password: string;
}

export interface AuthToken {
  id: string;
  user_id: string;
  token_hash: string;
  token_type: 'access' | 'refresh' | 'reset_password';
  expires_at: string;
  created_at: string;
  used_at?: string;
  revoked_at?: string;
}

export interface CreateAuthTokenData {
  user_id: string;
  token: string; // 明文token，将被加密存储
  token_type: 'access' | 'refresh' | 'reset_password';
  expires_at: string;
}

// 用户查询参数
export interface UserQueryParams {
  page?: number;
  limit?: number;
  search?: string; // 搜索用户名或邮箱
  status?: 'pending' | 'active' | 'inactive' | 'suspended';
  role?: string; // 角色名称
  sort_by?: 'username' | 'email' | 'created_at' | 'last_login_at';
  sort_order?: 'asc' | 'desc';
}