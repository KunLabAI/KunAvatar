/**
 * MCP客户端实现
 * 使用官方TypeScript SDK创建MCP客户端，通过stdio与MCP服务器通信
 */

// 这个文件只能在服务器端使用，不能在浏览器端导入
// 浏览器端应该通过API路由与MCP服务器通信

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

/**
 * 浏览器端MCP客户端代理
 * 通过API路由与服务器端MCP功能通信
 */
class McpClientProxy {
  private availableTools: McpTool[] = [];
  private isConnected = false;

  /**
   * 连接到MCP服务器（通过API）
   */
  async connect(): Promise<boolean> {
    try {
      const response = await fetch('/api/mcp/status');
      const data = await response.json();
      this.isConnected = data.status === 'connected';
      
      if (this.isConnected) {
        await this.refreshTools();
      }
      
      return this.isConnected;
    } catch (error) {
      console.error('MCP连接检查失败:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.availableTools = [];
  }

  /**
   * 检查是否已连接
   */
  isClientConnected(): boolean {
    return this.isConnected;
  }

  /**
   * 刷新工具列表
   */
  async refreshTools(): Promise<McpTool[]> {
    try {
      const response = await fetch('/api/mcp/tools');
      const data = await response.json();
      
      if (data.success && data.tools) {
        this.availableTools = data.tools;
      }
      
      return this.availableTools;
    } catch (error) {
      console.error('刷新工具列表失败:', error);
      return [];
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
  async callTool(toolCall: McpToolCall & { serverName?: string }): Promise<McpToolResult> {
    try {
      const response = await fetch('/api/mcp/call-tool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: toolCall.name,
          arguments: toolCall.arguments,
          serverName: toolCall.serverName
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        return {
          content: [{
            type: 'text',
            text: data.result || '工具执行成功'
          }],
          isError: false
        };
      } else {
        return {
          content: [{
            type: 'text',
            text: data.error || '工具执行失败'
          }],
          isError: true
        };
      }
    } catch (error) {
      console.error('工具调用失败:', error);
      return {
        content: [{
          type: 'text',
          text: `工具调用失败: ${error instanceof Error ? error.message : '未知错误'}`
        }],
        isError: true
      };
    }
  }

  /**
   * 批量调用工具
   */
  async callTools(toolCalls: McpToolCall[]): Promise<McpToolResult[]> {
    const results: McpToolResult[] = [];
    
    for (const toolCall of toolCalls) {
      const result = await this.callTool(toolCall);
      results.push(result);
    }
    
    return results;
  }
}

// 导出单例实例
export const mcpClient = new McpClientProxy();

/**
 * 初始化MCP客户端
 */
export async function initializeMcpClient(): Promise<boolean> {
  try {
    const success = await mcpClient.connect();
    if (success) {
      console.log('MCP客户端初始化成功');
    } else {
      console.warn('MCP客户端初始化失败');
    }
    return success;
  } catch (error) {
    console.error('MCP客户端初始化出错:', error);
    return false;
  }
}

/**
 * 获取MCP工具列表
 */
export async function getMcpTools(): Promise<McpTool[]> {
  if (!mcpClient.isClientConnected()) {
    return [];
  }
  return mcpClient.getAvailableTools();
}

/**
 * 执行MCP工具调用
 */
export async function executeMcpTool(toolCall: McpToolCall): Promise<McpToolResult> {
  return await mcpClient.callTool(toolCall);
}