/**
 * SSE MCP客户端实现
 * 支持通过HTTP Server-Sent Events连接到远程MCP服务器
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

// MCP工具接口
export interface McpTool {
  name: string;
  description: string;
  inputSchema: any;
}

// MCP工具调用接口
export interface McpToolCall {
  name: string;
  arguments: Record<string, any>;
}

// MCP工具结果接口
export interface McpToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

// SSE服务器配置接口
export interface SSEServerConfig {
  name: string;
  url: string;
  type: 'sse';
  apiKey?: string; // 可选的API密钥用于认证
  headers?: Record<string, string>; // 自定义请求头
  timeout?: number; // 连接超时时间（毫秒）
  retryAttempts?: number; // 重试次数
  protocolVersion?: string; // MCP协议版本
}

/**
 * SSE MCP客户端类
 * 负责与远程SSE MCP服务器的通信
 */
class SSEMcpClient {
  private client: Client | null = null;
  private transport: SSEClientTransport | null = null;
  private isConnected = false;
  private availableTools: McpTool[] = [];
  private config: SSEServerConfig;

  constructor(config: SSEServerConfig) {
    this.config = config;
  }

  /**
   * 连接到SSE MCP服务器
   */
  async connect(): Promise<boolean> {
    const maxRetries = this.config.retryAttempts || 3;
    const baseDelay = 1000; // 1秒基础延迟
    
    // 根据MCP协议规范配置请求头（移到循环外部以便在catch块中访问）
    const headers: Record<string, string> = {
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Content-Type': 'application/json',
      'User-Agent': 'kun-agent-sse-client/1.0.0'
    };
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`正在连接到SSE MCP服务器: ${this.config.url} (尝试 ${attempt}/${maxRetries})`);
        
        // 创建SSE传输，添加必要的请求头
        const url = new URL(this.config.url);
        
        // 重置headers为基础配置
        Object.keys(headers).forEach(key => {
          if (!['Accept', 'Cache-Control', 'Connection', 'Content-Type', 'User-Agent'].includes(key)) {
            delete headers[key];
          }
        });
        
        // 重新设置基础请求头
        headers['Accept'] = 'text/event-stream';
        headers['Cache-Control'] = 'no-cache';
        headers['Connection'] = 'keep-alive';
        headers['Content-Type'] = 'application/json';
        headers['User-Agent'] = 'kun-agent-sse-client/1.0.0';

        // 添加MCP协议要求的会话ID头（生成唯一会话ID）
        const sessionId = `mcp-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        headers['Mcp-Session-Id'] = sessionId;

        // 添加MCP协议版本头
        const protocolVersion = this.config.protocolVersion || '2025-03-26';
        headers['Mcp-Protocol-Version'] = protocolVersion;
        
        // 添加CORS相关头部
        headers['Access-Control-Request-Method'] = 'GET';
        headers['Access-Control-Request-Headers'] = 'Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version';

        // 如果配置中包含API密钥，添加认证头
        if (this.config.apiKey) {
          headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        }

        // 合并自定义请求头
        if (this.config.headers) {
          Object.assign(headers, this.config.headers);
        }

        // 创建传输配置
        const transportConfig: any = {
          requestInit: {
            headers
          }
        };

        // 添加超时配置
        if (this.config.timeout) {
          transportConfig.requestInit.timeout = this.config.timeout;
        }

        this.transport = new SSEClientTransport(url, transportConfig);

        // 创建客户端
        this.client = new Client({
          name: `kun-agent-sse-client-${this.config.name}`,
          version: '1.0.0'
        }, {
          capabilities: {
            tools: {}
          }
        });

        // 连接到服务器
        await this.client.connect(this.transport);
        this.isConnected = true;

        // 获取可用工具
        await this.refreshTools();

        console.log(`SSE MCP客户端连接成功: ${this.config.name}`);
        return true;
      } catch (error: any) {
        console.error(`SSE MCP客户端连接失败 (${this.config.name}) - 尝试 ${attempt}:`, error);
        
        // 检查错误类型
        const is429Error = error?.code === 429 || 
                          error?.event?.code === 429 || 
                          error?.message?.includes('429') ||
                          error?.message?.includes('Too Many Requests');
        
        const is412Error = error?.code === 412 || 
                          error?.event?.code === 412 || 
                          error?.message?.includes('412') ||
                          error?.message?.includes('Precondition Failed');
        
        if (is412Error) {
          console.error(`检测到412错误 (${this.config.name})，这通常表示前置条件失败:`);
          console.error('可能的原因:');
          console.error('1. 服务器要求特定的认证头或API密钥');
          console.error('2. 请求头不符合MCP SSE协议要求');
          console.error('3. 服务器CORS配置不允许当前域名访问');
          console.error('4. 服务器不支持当前的MCP协议版本 (2025-03-26)');
          console.error('5. 会话ID格式不正确或服务器不接受会话管理');
          console.error('');
          console.error('解决建议:');
          console.error('- 检查服务器是否需要API密钥认证');
          console.error('- 验证服务器CORS配置是否正确');
          console.error('- 确认服务器支持MCP SSE传输协议');
          console.error('- 联系服务器管理员确认配置');
          // 使用Headers对象来处理请求头
          const headersObj = new Headers(headers);
          console.error(`当前请求头: ${JSON.stringify(Object.fromEntries(headersObj.entries()), null, 2)}`);
          
          // 对于412错误，不进行重试，因为这通常是配置问题
          return false;
        }
        
        if (is429Error) {
          console.warn(`检测到429错误 (${this.config.name})，这通常表示服务器过载或达到速率限制`);
          
          if (attempt < maxRetries) {
            // 指数退避延迟
            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.log(`等待 ${delay}ms 后重试...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        await this.disconnect();
        
        if (attempt === maxRetries) {
          if (is429Error) {
            console.error(`SSE MCP服务器 ${this.config.name} 持续返回429错误，可能是服务器过载或速率限制。请稍后再试。`);
          } else {
            console.error(`SSE MCP服务器 ${this.config.name} 连接失败，已尝试 ${maxRetries} 次`);
            console.error('可能的原因:');
            console.error('1. 服务器URL不正确或服务器未运行');
            console.error('2. 网络连接问题');
            console.error('3. 服务器不支持MCP SSE协议');
            console.error('4. 认证或权限问题');
            console.error('5. CORS配置问题');
            console.error(`错误详情: ${error?.message || '未知错误'}`);
          }
          return false;
        }
      }
    }
    
    return false;
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
      }

      if (this.transport) {
        await this.transport.close();
        this.transport = null;
      }

      this.isConnected = false;
      this.availableTools = [];
      console.log(`SSE MCP客户端已断开连接: ${this.config.name}`);
    } catch (error) {
      console.error(`断开SSE MCP连接时出错 (${this.config.name}):`, error);
    }
  }

  /**
   * 检查连接状态
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * 刷新可用工具列表
   */
  async refreshTools(): Promise<void> {
    if (!this.client || !this.isConnected) {
      console.warn(`SSE MCP客户端未连接，无法刷新工具 (${this.config.name})`);
      return;
    }

    try {
      const response = await this.client.listTools();
      this.availableTools = response.tools.map(tool => {
         // 清理inputSchema，移除$schema字段以符合Ollama要求
         const cleanInputSchema: any = tool.inputSchema ? { ...tool.inputSchema } : {};
         if (cleanInputSchema && typeof cleanInputSchema === 'object' && '$schema' in cleanInputSchema) {
           delete cleanInputSchema.$schema;
         }
         
         return {
           name: tool.name,
           description: tool.description || '',
           inputSchema: cleanInputSchema
         };
       });
      
      console.log(`已从SSE MCP服务器获取 ${this.availableTools.length} 个工具 (${this.config.name})`);
    } catch (error) {
      console.error(`刷新SSE MCP工具失败 (${this.config.name}):`, error);
      this.availableTools = [];
    }
  }

  /**
   * 获取可用工具列表
   */
  getAvailableTools(): McpTool[] {
    return this.availableTools;
  }

  /**
   * 检查工具是否可用
   */
  isToolAvailable(toolName: string): boolean {
    return this.availableTools.some(tool => tool.name === toolName);
  }

  /**
   * 调用工具
   */
  async callTool(toolName: string, args: Record<string, any>): Promise<McpToolResult> {
    if (!this.client || !this.isConnected) {
      throw new Error(`SSE MCP客户端未连接 (${this.config.name})`);
    }

    try {
      console.log(`调用SSE MCP工具: ${toolName} (${this.config.name})`, args);
      
      const result = await this.client.callTool({
        name: toolName,
        arguments: args
      });

      // 确保返回的结果格式正确
      if (result.content && Array.isArray(result.content)) {
        return {
          content: result.content.map(item => ({
            type: 'text' as const,
            text: typeof item === 'string' ? item : 
                  typeof item === 'object' && item.text ? item.text : 
                  JSON.stringify(item)
          }))
        };
      } else {
        return {
          content: [{
            type: 'text' as const,
            text: typeof result === 'string' ? result : JSON.stringify(result)
          }]
        };
      }
    } catch (error) {
      console.error(`SSE MCP工具调用失败 (${this.config.name}):`, error);
      return {
        content: [{
          type: 'text' as const,
          text: `工具调用失败: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }

  /**
   * 获取服务器配置
   */
  getConfig(): SSEServerConfig {
    return this.config;
  }
}

export default SSEMcpClient;