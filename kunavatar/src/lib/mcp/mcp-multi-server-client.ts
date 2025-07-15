/**
 * 多服务器MCP客户端管理器
 * 支持同时管理本地stdio、远程SSE和Streamable HTTP MCP服务器
 */

import { McpServerClient } from './mcp-client-server';
import SSEMcpClient, { type SSEServerConfig, type McpTool, type McpToolCall, type McpToolResult } from './mcp-client-sse';
import StreamableHTTPMcpClient, { type StreamableHTTPServerConfig } from './mcp-client-streamable-http';

// MCP服务器配置接口
export interface McpServerConfig {
  [serverName: string]: {
    type: 'stdio' | 'sse' | 'streamable-http';
    url?: string; // 用于SSE和Streamable HTTP类型
    command?: string; // 仅用于stdio类型
    args?: string[]; // 仅用于stdio类型
    apiKey?: string; // 用于需要认证的远程服务器
    headers?: Record<string, string>; // 自定义请求头
    timeout?: number; // 连接超时时间
    retryAttempts?: number; // 重试次数
    protocolVersion?: string; // MCP协议版本
    vpnCompatible?: boolean; // VPN兼容模式
  };
}

// 扩展的工具接口，包含服务器信息
export interface ExtendedMcpTool extends McpTool {
  serverName: string;
  serverType: 'stdio' | 'sse' | 'streamable-http';
}

/**
 * 多服务器MCP客户端管理器
 * 统一管理多个MCP服务器连接
 */
class MultiServerMcpClient {
  private stdioClient: McpServerClient | null = null;
  private sseClients: Map<string, SSEMcpClient> = new Map();
  private streamableHTTPClients: Map<string, StreamableHTTPMcpClient> = new Map();
  private config: McpServerConfig = {};

  constructor() {
    // 初始化本地stdio客户端
    this.stdioClient = new McpServerClient();
  }

  /**
   * 设置服务器配置
   */
  setConfig(config: McpServerConfig): void {
    this.config = config;
  }

  /**
   * 连接到所有配置的服务器
   */
  async connectAll(): Promise<{ [serverName: string]: boolean }> {
    const results: { [serverName: string]: boolean } = {};

    // 连接本地stdio服务器（如果存在）
    if (this.stdioClient) {
      try {
        const connected = await this.stdioClient.connect();
        results['local'] = connected;
      } catch (error) {
        console.error('本地stdio MCP服务器连接失败:', error);
        results['local'] = false;
      }
    }

    // 连接所有配置的远程服务器
    console.log('开始连接远程MCP服务器，配置数量:', Object.keys(this.config).length);
    console.log('配置详情:', this.config);
    
    for (const [serverName, serverConfig] of Object.entries(this.config)) {
      console.log(`处理服务器: ${serverName}, 配置:`, serverConfig);
      
      // 检查服务器是否被禁用
      if ((serverConfig as any).enabled === false) {
        console.log(`MCP服务器 ${serverName} 已被禁用，跳过连接`);
        results[serverName] = false;
        continue;
      }
      
      if (serverConfig.type === 'sse' && serverConfig.url) {
        try {
          const sseConfig: SSEServerConfig = {
            name: serverName,
            url: serverConfig.url,
            type: 'sse',
            apiKey: serverConfig.apiKey,
            headers: serverConfig.headers,
            timeout: serverConfig.timeout,
            retryAttempts: serverConfig.retryAttempts,
            protocolVersion: serverConfig.protocolVersion
          };
          
          console.log(`尝试连接SSE服务器: ${serverName}, URL: ${serverConfig.url}`);
          const sseClient = new SSEMcpClient(sseConfig);
          const connected = await sseClient.connect();
          
          if (connected) {
            this.sseClients.set(serverName, sseClient);
            console.log(`SSE MCP服务器 ${serverName} 连接成功`);
            
            // 获取并显示工具
            const tools = sseClient.getAvailableTools();
            console.log(`服务器 ${serverName} 提供的工具:`, tools.map(t => t.name));
          } else {
            console.warn(`SSE MCP服务器 ${serverName} 连接失败，将跳过此服务器`);
          }
          
          results[serverName] = connected;
        } catch (error) {
          console.error(`SSE MCP服务器连接失败 (${serverName}):`, error);
          results[serverName] = false;
        }
      } else if (serverConfig.type === 'streamable-http' && serverConfig.url) {
        try {
          const streamableHTTPConfig: StreamableHTTPServerConfig = {
            name: serverName,
            url: serverConfig.url,
            type: 'streamable-http',
            apiKey: serverConfig.apiKey,
            headers: serverConfig.headers,
            timeout: serverConfig.timeout,
            retryAttempts: serverConfig.retryAttempts,
            protocolVersion: serverConfig.protocolVersion,
            vpnCompatible: serverConfig.vpnCompatible
          };
          
          console.log(`尝试连接Streamable HTTP服务器: ${serverName}, URL: ${serverConfig.url}`);
          const streamableHTTPClient = new StreamableHTTPMcpClient(streamableHTTPConfig);
          const connected = await streamableHTTPClient.connect();
          
          if (connected) {
            this.streamableHTTPClients.set(serverName, streamableHTTPClient);
            console.log(`Streamable HTTP MCP服务器 ${serverName} 连接成功`);
            
            // 获取并显示工具
            const tools = streamableHTTPClient.getAvailableTools();
            console.log(`服务器 ${serverName} 提供的工具:`, tools.map(t => t.name));
          } else {
            console.warn(`Streamable HTTP MCP服务器 ${serverName} 连接失败，将跳过此服务器`);
          }
          
          results[serverName] = connected;
        } catch (error) {
          console.error(`Streamable HTTP MCP服务器连接失败 (${serverName}):`, error);
          results[serverName] = false;
        }
      } else {
        console.log(`跳过服务器 ${serverName}: type=${serverConfig.type}, url=${serverConfig.url}`);
      }
    }

    return results;
  }

  /**
   * 连接单个服务器
   */
  async connectServer(serverName: string): Promise<boolean> {
    const serverConfig = this.config[serverName];
    if (!serverConfig) {
      console.error(`服务器配置不存在: ${serverName}`);
      return false;
    }

    console.log(`连接单个服务器: ${serverName}, 配置:`, serverConfig);
    
    // 检查服务器是否被禁用
    if ((serverConfig as any).enabled === false) {
      console.log(`MCP服务器 ${serverName} 已被禁用，跳过连接`);
      return false;
    }

    try {
      if (serverConfig.type === 'sse' && serverConfig.url) {
        const sseConfig: SSEServerConfig = {
          name: serverName,
          url: serverConfig.url,
          type: 'sse',
          apiKey: serverConfig.apiKey,
          headers: serverConfig.headers,
          timeout: serverConfig.timeout,
          retryAttempts: serverConfig.retryAttempts,
          protocolVersion: serverConfig.protocolVersion
        };
        
        console.log(`尝试连接SSE服务器: ${serverName}, URL: ${serverConfig.url}`);
        const sseClient = new SSEMcpClient(sseConfig);
        const connected = await sseClient.connect();
        
        if (connected) {
          this.sseClients.set(serverName, sseClient);
          console.log(`SSE MCP服务器 ${serverName} 连接成功`);
          
          // 获取并显示工具
          const tools = sseClient.getAvailableTools();
          console.log(`服务器 ${serverName} 提供的工具:`, tools.map(t => t.name));
        } else {
          console.warn(`SSE MCP服务器 ${serverName} 连接失败`);
        }
        
        return connected;
      } else if (serverConfig.type === 'streamable-http' && serverConfig.url) {
        const streamableHTTPConfig: StreamableHTTPServerConfig = {
          name: serverName,
          url: serverConfig.url,
          type: 'streamable-http',
          apiKey: serverConfig.apiKey,
          headers: serverConfig.headers,
          timeout: serverConfig.timeout,
          retryAttempts: serverConfig.retryAttempts,
          protocolVersion: serverConfig.protocolVersion,
          vpnCompatible: serverConfig.vpnCompatible
        };
        
        console.log(`尝试连接Streamable HTTP服务器: ${serverName}, URL: ${serverConfig.url}`);
        const streamableHTTPClient = new StreamableHTTPMcpClient(streamableHTTPConfig);
        const connected = await streamableHTTPClient.connect();
        
        if (connected) {
          this.streamableHTTPClients.set(serverName, streamableHTTPClient);
          console.log(`Streamable HTTP MCP服务器 ${serverName} 连接成功`);
          
          // 获取并显示工具
          const tools = streamableHTTPClient.getAvailableTools();
          console.log(`服务器 ${serverName} 提供的工具:`, tools.map(t => t.name));
        } else {
          console.warn(`Streamable HTTP MCP服务器 ${serverName} 连接失败`);
        }
        
        return connected;
      } else {
        console.log(`跳过服务器 ${serverName}: type=${serverConfig.type}, url=${serverConfig.url}`);
        return false;
      }
    } catch (error) {
      console.error(`连接MCP服务器失败 (${serverName}):`, error);
      return false;
    }
  }

  /**
   * 智能连接：只连接包含指定工具的服务器
   */
  async connectForTool(toolName: string): Promise<string | null> {
    // 首先检查本地工具
    if (this.stdioClient && this.stdioClient.isToolAvailable(toolName)) {
      if (!this.stdioClient.isClientConnected()) {
        const connected = await this.stdioClient.connect();
        if (connected) {
          console.log(`为工具 ${toolName} 连接了本地服务器`);
          return 'local';
        }
      } else {
        return 'local';
      }
    }

    // 检查已连接的远程服务器
    for (const [serverName, sseClient] of Array.from(this.sseClients.entries())) {
      if (sseClient.getConnectionStatus() && sseClient.isToolAvailable(toolName)) {
        console.log(`工具 ${toolName} 在已连接的SSE服务器 ${serverName} 中找到`);
        return serverName;
      }
    }

    for (const [serverName, streamableHTTPClient] of Array.from(this.streamableHTTPClients.entries())) {
      if (streamableHTTPClient.getConnectionStatus() && streamableHTTPClient.isToolAvailable(toolName)) {
        console.log(`工具 ${toolName} 在已连接的Streamable HTTP服务器 ${serverName} 中找到`);
        return serverName;
      }
    }

    // 如果没有找到，尝试连接可能包含该工具的服务器
    // 这里我们需要连接所有未连接的服务器来查找工具
    for (const [serverName, serverConfig] of Object.entries(this.config)) {
      // 检查服务器是否被禁用
      if ((serverConfig as any).enabled === false) {
        continue;
      }

      // 检查服务器是否已连接
      const isSSEConnected = this.sseClients.has(serverName) && this.sseClients.get(serverName)?.getConnectionStatus();
      const isStreamableHTTPConnected = this.streamableHTTPClients.has(serverName) && this.streamableHTTPClients.get(serverName)?.getConnectionStatus();
      
      if (!isSSEConnected && !isStreamableHTTPConnected) {
        console.log(`尝试连接服务器 ${serverName} 来查找工具 ${toolName}`);
        const connected = await this.connectServer(serverName);
        
        if (connected) {
          // 检查新连接的服务器是否有该工具
          if (this.isToolAvailable(toolName, serverName)) {
            console.log(`在新连接的服务器 ${serverName} 中找到工具 ${toolName}`);
            return serverName;
          }
        }
      }
    }

    console.log(`未找到工具 ${toolName} 对应的服务器`);
    return null;
  }

  /**
   * 断开指定服务器的连接
   */
  async disconnectServer(serverName: string): Promise<void> {
    if (serverName === 'local') {
      // 本地服务器不支持断开连接
      console.log('本地服务器不支持断开连接操作');
      return;
    }

    // 断开SSE服务器连接
    const sseClient = this.sseClients.get(serverName);
    if (sseClient) {
      await sseClient.disconnect();
      this.sseClients.delete(serverName);
      console.log(`已断开SSE服务器 ${serverName} 的连接`);
      return;
    }

    // 断开Streamable HTTP服务器连接
    const streamableHTTPClient = this.streamableHTTPClients.get(serverName);
    if (streamableHTTPClient) {
      await streamableHTTPClient.disconnect();
      this.streamableHTTPClients.delete(serverName);
      console.log(`已断开Streamable HTTP服务器 ${serverName} 的连接`);
      return;
    }

    console.log(`服务器 ${serverName} 不存在或未连接`);
  }

  /**
   * 断开所有连接
   */
  async disconnectAll(): Promise<void> {
    // 断开本地stdio连接
    if (this.stdioClient) {
      await this.stdioClient.disconnect();
    }

    // 断开所有SSE连接
    for (const [serverName, sseClient] of Array.from(this.sseClients.entries())) {
      await sseClient.disconnect();
    }
    this.sseClients.clear();

    // 断开所有Streamable HTTP连接
    for (const [serverName, streamableHTTPClient] of Array.from(this.streamableHTTPClients.entries())) {
      await streamableHTTPClient.disconnect();
    }
    this.streamableHTTPClients.clear();
  }

  /**
   * 获取所有服务器的连接状态
   */
  getConnectionStatus(): { [serverName: string]: boolean } {
    const status: { [serverName: string]: boolean } = {};

    // 本地stdio服务器状态
    if (this.stdioClient) {
      status['local'] = this.stdioClient.isClientConnected();
    }

    // SSE服务器状态
    for (const [serverName, sseClient] of Array.from(this.sseClients.entries())) {
      status[serverName] = sseClient.getConnectionStatus();
    }

    // Streamable HTTP服务器状态
    for (const [serverName, streamableHTTPClient] of Array.from(this.streamableHTTPClients.entries())) {
      status[serverName] = streamableHTTPClient.getConnectionStatus();
    }

    return status;
  }

  /**
   * 刷新所有服务器的工具列表
   */
  async refreshAllTools(): Promise<void> {
    // 刷新本地stdio工具
    if (this.stdioClient && this.stdioClient.isClientConnected()) {
      await this.stdioClient.refreshTools();
    }

    // 刷新所有SSE服务器工具
    for (const [serverName, sseClient] of Array.from(this.sseClients.entries())) {
      if (sseClient.getConnectionStatus()) {
        await sseClient.refreshTools();
      }
    }

    // 刷新所有Streamable HTTP服务器工具
    for (const [serverName, streamableHTTPClient] of Array.from(this.streamableHTTPClients.entries())) {
      if (streamableHTTPClient.getConnectionStatus()) {
        await streamableHTTPClient.refreshTools();
      }
    }
  }

  /**
   * 获取所有可用工具（包含服务器信息）
   */
  getAllAvailableTools(): ExtendedMcpTool[] {
    const allTools: ExtendedMcpTool[] = [];

    // 添加本地stdio工具
    if (this.stdioClient && this.stdioClient.isClientConnected()) {
      const localTools = this.stdioClient.getAvailableTools();
      allTools.push(...localTools.map(tool => ({
        ...tool,
        serverName: 'local',
        serverType: 'stdio' as const
      })));
    }

    // 添加所有SSE服务器工具
    for (const [serverName, sseClient] of Array.from(this.sseClients.entries())) {
      if (sseClient.getConnectionStatus()) {
        const sseTools = sseClient.getAvailableTools();
        allTools.push(...sseTools.map(tool => ({
          ...tool,
          serverName,
          serverType: 'sse' as const
        })));
      }
    }

    // 添加所有Streamable HTTP服务器工具
    for (const [serverName, streamableHTTPClient] of Array.from(this.streamableHTTPClients.entries())) {
      if (streamableHTTPClient.getConnectionStatus()) {
        const streamableHTTPTools = streamableHTTPClient.getAvailableTools();
        allTools.push(...streamableHTTPTools.map(tool => ({
          ...tool,
          serverName,
          serverType: 'streamable-http' as const
        })));
      }
    }

    return allTools;
  }

  /**
   * 检查工具是否可用
   */
  isToolAvailable(toolName: string, serverName?: string): boolean {
    if (serverName) {
      // 检查特定服务器
      if (serverName === 'local' && this.stdioClient) {
        return this.stdioClient.isToolAvailable(toolName);
      }
      
      const sseClient = this.sseClients.get(serverName);
      if (sseClient) {
        return sseClient.isToolAvailable(toolName);
      }
      
      const streamableHTTPClient = this.streamableHTTPClients.get(serverName);
      if (streamableHTTPClient) {
        return streamableHTTPClient.isToolAvailable(toolName);
      }
      
      return false;
    } else {
      // 检查所有服务器
      return this.getAllAvailableTools().some(tool => tool.name === toolName);
    }
  }

  /**
   * 调用工具
   */
  async callTool(toolName: string, args: Record<string, any>, serverName?: string): Promise<McpToolResult> {
    // 如果指定了服务器名称
    if (serverName) {
      if (serverName === 'local' && this.stdioClient) {
        return await this.stdioClient.callTool({ name: toolName, arguments: args });
      }
      
      const sseClient = this.sseClients.get(serverName);
      if (sseClient) {
        return await sseClient.callTool(toolName, args);
      }
      
      const streamableHTTPClient = this.streamableHTTPClients.get(serverName);
      if (streamableHTTPClient) {
        return await streamableHTTPClient.callTool(toolName, args);
      }
      
      throw new Error(`服务器 '${serverName}' 不存在或未连接`);
    }

    // 自动查找工具所在的服务器
    const allTools = this.getAllAvailableTools();
    const tool = allTools.find(t => t.name === toolName);
    
    if (!tool) {
      throw new Error(`工具 '${toolName}' 不存在`);
    }

    // 递归调用，指定服务器名称
    return await this.callTool(toolName, args, tool.serverName);
  }

  /**
   * 获取特定服务器的工具列表
   */
  getToolsByServer(serverName: string): McpTool[] {
    if (serverName === 'local' && this.stdioClient) {
      return this.stdioClient.getAvailableTools();
    }
    
    const sseClient = this.sseClients.get(serverName);
    if (sseClient) {
      return sseClient.getAvailableTools();
    }
    
    return [];
  }

  /**
   * 获取服务器列表
   */
  getServerList(): string[] {
    const servers = ['local'];
    servers.push(...Array.from(this.sseClients.keys()));
    return servers;
  }
}

// 导出单例实例
export const multiServerMcpClient = new MultiServerMcpClient();
export default MultiServerMcpClient;