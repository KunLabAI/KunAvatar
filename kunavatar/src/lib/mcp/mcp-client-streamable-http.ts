/**
 * Streamable HTTP MCP客户端实现
 * 支持通过Streamable HTTP连接到远程MCP服务器
 * 这是官方推荐的传输方式，替代已弃用的SSE传输
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

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

// Streamable HTTP服务器配置接口
export interface StreamableHTTPServerConfig {
  name: string;
  url: string;
  type: 'streamable-http';
  apiKey?: string; // 可选的API密钥用于认证
  headers?: Record<string, string>; // 自定义请求头
  timeout?: number; // 连接超时时间（毫秒）
  retryAttempts?: number; // 重试次数
  protocolVersion?: string; // MCP协议版本
  vpnCompatible?: boolean; // VPN兼容模式
  proxySettings?: {
    host?: string;
    port?: number;
    auth?: {
      username: string;
      password: string;
    };
  };
}

/**
 * Streamable HTTP MCP客户端类
 * 负责与远程Streamable HTTP MCP服务器的通信
 */
class StreamableHTTPMcpClient {
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;
  private isConnected = false;
  private availableTools: McpTool[] = [];
  private config: StreamableHTTPServerConfig;

  constructor(config: StreamableHTTPServerConfig) {
    this.config = config;
  }

  /**
   * 检测VPN环境
   */
  private async detectVPNEnvironment(): Promise<boolean> {
    try {
      // 检查常见的VPN环境指标
      const userAgent = navigator.userAgent;
      const hasVPNIndicators = /VPN|Proxy|Tunnel/i.test(userAgent);
      
      // 检查网络延迟（简单的VPN检测）
      const startTime = Date.now();
      await fetch('data:text/plain,', { method: 'HEAD' });
      const latency = Date.now() - startTime;
      
      // 如果延迟超过100ms，可能在使用VPN
      return hasVPNIndicators || latency > 100;
    } catch {
      return false;
    }
  }

  /**
   * 使用VPN兼容模式连接
   */
  private async connectWithVPNMode(): Promise<boolean> {
    const originalVPNSetting = this.config.vpnCompatible;
    try {
      // 临时启用VPN兼容模式
      this.config.vpnCompatible = true;
      const result = await this.connect();
      return result;
    } finally {
      // 恢复原始设置
      this.config.vpnCompatible = originalVPNSetting;
    }
  }

  /**
   * 连接到Streamable HTTP MCP服务器
   */
  async connect(): Promise<boolean> {
    const maxRetries = this.config.retryAttempts || 3;
    const baseDelay = 1000; // 1秒基础延迟
    
    // 检测VPN环境
    const isVPNDetected = await this.detectVPNEnvironment();
    const isVPNMode = this.config.vpnCompatible || isVPNDetected;
    
            // 根据MCP Streamable HTTP协议规范配置请求头
        const headers: Record<string, string> = {
          'Accept': 'text/event-stream, application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'kun-agent-streamable-http-client/1.0.0',
          'Cache-Control': 'no-cache'
        };
    
    // VPN兼容模式下的特殊配置
    if (isVPNMode) {
      headers['X-Forwarded-For'] = '127.0.0.1';
      headers['X-Real-IP'] = '127.0.0.1';
      headers['Pragma'] = 'no-cache';
      headers['Expires'] = '0';
    } else {
      // 非VPN模式下添加CORS相关头部
      headers['Cache-Control'] = 'no-cache';
      headers['Connection'] = 'keep-alive';
    }
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`正在连接到Streamable HTTP MCP服务器: ${this.config.url} (尝试 ${attempt}/${maxRetries})`);
        
        // 创建URL对象
        const url = new URL(this.config.url);
        
        // 重置headers为基础配置
        Object.keys(headers).forEach(key => {
          if (!['Accept', 'Content-Type', 'User-Agent'].includes(key)) {
            delete headers[key];
          }
        });
        
        // 重新设置基础请求头
        headers['Accept'] = 'text/event-stream, application/json';
        headers['Content-Type'] = 'application/json';
        headers['User-Agent'] = 'kun-agent-streamable-http-client/1.0.0';
        headers['Cache-Control'] = 'no-cache';

        // VPN兼容模式配置
        if (isVPNMode) {
          headers['X-Forwarded-For'] = '127.0.0.1';
          headers['X-Real-IP'] = '127.0.0.1';
          headers['Pragma'] = 'no-cache';
          headers['Expires'] = '0';
        } else {
          headers['Connection'] = 'keep-alive';
        }

        // 添加MCP协议要求的会话ID头（生成唯一会话ID）
        const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        headers['Mcp-Session-Id'] = sessionId;

        // 添加MCP协议版本头
        const protocolVersion = this.config.protocolVersion || '2025-03-26';
        headers['Mcp-Protocol-Version'] = protocolVersion;

        // 如果配置中包含API密钥，添加认证头
        if (this.config.apiKey) {
          headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        }
        
        // 从URL中提取API密钥（如果URL包含api_key参数）
        const urlParams = new URLSearchParams(url.search);
        const apiKeyFromUrl = urlParams.get('api_key');
        if (apiKeyFromUrl && !this.config.apiKey) {
          headers['Authorization'] = `Bearer ${apiKeyFromUrl}`;
        }

        // 合并自定义请求头
        if (this.config.headers) {
          Object.assign(headers, this.config.headers);
        }

        // 创建传输配置
        const transportConfig: any = {
          headers,
          // 确保传输配置符合MCP协议要求
          method: 'POST',
          mode: 'cors',
          credentials: 'omit'
        };

        // VPN兼容模式下的传输配置
        if (isVPNMode) {
          // 延长超时时间
          transportConfig.timeout = (this.config.timeout || 30000) * 2; // 默认30秒，VPN模式翻倍
          transportConfig.keepalive = false;
          transportConfig.cache = 'no-store';
          transportConfig.redirect = 'follow';
        } else {
          // 添加超时配置，默认30秒
          transportConfig.timeout = this.config.timeout || 30000;
        }

        // 创建Streamable HTTP传输
        console.log(`使用的请求头:`, JSON.stringify(headers, null, 2));
        console.log(`传输配置:`, JSON.stringify(transportConfig, null, 2));
        this.transport = new StreamableHTTPClientTransport(url, transportConfig);

        // 创建客户端
        this.client = new Client({
          name: `kun-agent-streamable-http-client-${this.config.name}`,
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

        console.log(`Streamable HTTP MCP客户端连接成功: ${this.config.name}`);
        return true;
      } catch (error: any) {
        console.error(`Streamable HTTP MCP客户端连接失败 (${this.config.name}) - 尝试 ${attempt}:`, error);
        
        // 检查错误类型
        const is429Error = error?.code === 429 || 
                          error?.status === 429 ||
                          error?.message?.includes('429') ||
                          error?.message?.includes('Too Many Requests');
        
        const isSessionError = error?.message?.includes('Session terminated') ||
                              error?.message?.includes('Invalid or expired session ID') ||
                              error?.code === 32600;
        
        const is412Error = error?.code === 412 || 
                          error?.status === 412 ||
                          error?.message?.includes('412') ||
                          error?.message?.includes('Precondition Failed');
        
        const is422Error = error?.code === 422 || 
                          error?.status === 422 ||
                          error?.message?.includes('422') ||
                          error?.message?.includes('Unprocessable Entity');
        
        // 检测VPN相关错误
        const isVPNRelatedError = (is412Error || is422Error) && (
          error?.message?.toLowerCase().includes('proxy') ||
          error?.message?.toLowerCase().includes('vpn') ||
          error?.message?.toLowerCase().includes('tunnel') ||
          error?.message?.toLowerCase().includes('network') ||
          error?.message?.toLowerCase().includes('timeout')
        );
        
        // 处理会话相关错误
        if (isSessionError) {
          console.error(`检测到会话错误 (${this.config.name}):`, error?.message || error);
          console.error('这通常表示:');
          console.error('1. 会话ID格式不正确');
          console.error('2. 服务器关闭了会话');
          console.error('3. 连接被意外终止');
          console.error('建议: 检查网络连接稳定性和服务器配置');
        }
        
        if (is412Error || is422Error) {
          const errorType = is412Error ? '412 (Precondition Failed)' : '422 (Unprocessable Entity)';
          console.error(`检测到${errorType}错误 (${this.config.name})，这通常表示:`);
          
          if (isVPNMode) {
            console.error('VPN模式下的可能原因:');
            console.error('1. VPN服务器与目标服务器之间的网络问题');
            console.error('2. VPN节点被目标服务器屏蔽');
            console.error('3. VPN协议与服务器不兼容');
            console.error('解决建议: 尝试切换VPN节点或关闭VPN');
          } else {
            console.error('可能的原因:');
            console.error('1. 服务器要求特定的认证头或API密钥');
            console.error('2. 请求头不符合MCP Streamable HTTP协议要求');
            console.error('3. 服务器CORS配置不允许当前域名访问');
            console.error('4. 服务器不支持当前的MCP协议版本');
            console.error('5. 会话ID格式不正确或服务器不接受会话管理');
            console.error('解决建议:');
            console.error('- 检查服务器是否需要API密钥认证');
            console.error('- 验证服务器CORS配置是否正确');
            console.error('- 确认服务器支持MCP Streamable HTTP传输协议');
          }
          
          console.error(`当前请求头: ${JSON.stringify(headers, null, 2)}`);
          
          // 对于412和422错误，不进行重试，因为这通常是配置问题
          return false;
        }
        
        // 如果检测到VPN相关错误且当前不在VPN模式，尝试VPN兼容模式
        if (isVPNRelatedError && !isVPNMode && attempt < maxRetries) {
          console.log(`检测到VPN相关错误，尝试使用VPN兼容模式重新连接...`);
          return await this.connectWithVPNMode();
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
            console.error(`Streamable HTTP MCP服务器 ${this.config.name} 持续返回429错误，可能是服务器过载或速率限制。请稍后再试。`);
          } else {
            console.error(`Streamable HTTP MCP服务器 ${this.config.name} 连接失败，已尝试 ${maxRetries} 次`);
            console.error('可能的原因:');
            console.error('1. 服务器URL不正确或服务器未运行');
            console.error('2. 网络连接问题');
            console.error('3. 服务器不支持MCP Streamable HTTP协议');
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
      console.log(`Streamable HTTP MCP客户端已断开连接: ${this.config.name}`);
    } catch (error) {
      console.error(`断开Streamable HTTP MCP连接时出错 (${this.config.name}):`, error);
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
      console.warn(`Streamable HTTP MCP客户端未连接，无法刷新工具 (${this.config.name})`);
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
      
      console.log(`已从Streamable HTTP MCP服务器获取 ${this.availableTools.length} 个工具 (${this.config.name})`);
    } catch (error) {
      console.error(`刷新Streamable HTTP MCP工具失败 (${this.config.name}):`, error);
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
      throw new Error(`Streamable HTTP MCP客户端未连接 (${this.config.name})`);
    }

    try {
      console.log(`调用Streamable HTTP MCP工具: ${toolName} (${this.config.name})`, args);
      
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
      console.error(`Streamable HTTP MCP工具调用失败 (${this.config.name}):`, error);
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
  getConfig(): StreamableHTTPServerConfig {
    return this.config;
  }
}

export default StreamableHTTPMcpClient;