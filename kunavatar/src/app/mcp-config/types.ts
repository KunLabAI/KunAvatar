// MCP配置页面的类型定义

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
  
  // 工具数量
  toolCount?: number;
  
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
  enabled?: boolean; // 工具是否启用（在对话页面可见）
  last_used_at?: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
  // 扩展字段（从JOIN查询获得）
  server_name?: string;
  server_status?: string;
}

export interface McpConfigState {
  servers: McpServer[];
  tools: McpTool[];
  loading: boolean;
  showAddModal: boolean;
  selectedTab: 'all' | 'local' | 'external';
  selectedServer: string | null;
  newServer: {
    name: string;
    display_name: string;
    type: 'stdio' | 'sse' | 'streamable-http';
    description: string;
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
  };
}

export interface McpConfigActions {
  loadServers: () => Promise<void>;
  loadTools: () => Promise<void>;
  connectServer: (serverName: string) => Promise<void>;
  refreshTools: () => Promise<void>;
  handleAddServer: () => Promise<void>;
  handleDeleteServer: (serverName: string) => Promise<void>;
  handleDeleteTool: (toolName: string) => Promise<void>;
}

export interface ValidationResult {
  success: boolean;
  message?: string;
  error?: string;
  toolCount?: number;
  tools?: Array<{
    name: string;
    description: string;
    inputSchema?: {
      type: string;
      properties?: Record<string, any>;
      required?: string[];
    };
  }>;
}