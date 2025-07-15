/**
 * MCP工具集成模块
 * 使用官方TypeScript SDK与MCP服务器通信
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface McpToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface McpToolResult {
  success: boolean;
  result?: any;
  error?: string;
  content?: Array<{ type: string; text: string }>;
}

/**
 * MCP客户端管理器
 * 负责与MCP服务器通信，执行工具调用
 */
export class McpClientManager {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private isConnected: boolean = false;
  private availableTools: Tool[] = [];

  constructor() {
    this.client = new Client({
      name: 'kun-agent-client',
      version: '1.0.0'
    });
  }

  /**
   * 连接到MCP服务器
   */
  async connect(serverPath?: string): Promise<boolean> {
    try {
      if (this.isConnected) {
        return true;
      }

      // 默认使用内置的MCP服务器
      const mcpServerPath = serverPath || './mcp/mcp-server.js';
      
      this.transport = new StdioClientTransport({
        command: 'node',
        args: ['-r', 'ts-node/register', mcpServerPath]
      });

      if (this.client) {
        await this.client.connect(this.transport);
        this.isConnected = true;
        
        // 获取可用工具列表
        await this.refreshAvailableTools();
        
        console.log('MCP客户端已连接到服务器');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('MCP客户端连接失败:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * 断开与MCP服务器的连接
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client && this.isConnected) {
        await this.client.close();
      }
      
      this.isConnected = false;
      this.availableTools = [];
      console.log('MCP客户端已断开连接');
    } catch (error) {
      console.error('断开MCP连接时出错:', error);
    }
  }

  /**
   * 刷新可用工具列表
   */
  async refreshAvailableTools(): Promise<Tool[]> {
    try {
      if (!this.client || !this.isConnected) {
        throw new Error('MCP客户端未连接');
      }

      const result = await this.client.listTools();
      this.availableTools = result.tools || [];
      
      console.log(`已获取 ${this.availableTools.length} 个可用工具`);
      return this.availableTools;
    } catch (error) {
      console.error('获取工具列表失败:', error);
      return [];
    }
  }

  /**
   * 执行工具调用
   */
  async executeToolCall(toolCall: McpToolCall): Promise<McpToolResult> {
    try {
      if (!this.client || !this.isConnected) {
        return {
          success: false,
          error: 'MCP客户端未连接'
        };
      }

      const result = await this.client.callTool({
        name: toolCall.name,
        arguments: toolCall.arguments
      });

      return {
        success: true,
        result: result,
        content: Array.isArray(result.content) ? result.content.map(item => ({
          type: item.type || 'text',
          text: item.text || String(item)
        })) : undefined
      };
    } catch (error) {
      console.error('工具调用失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 获取可用工具列表
   */
  getAvailableTools(): Tool[] {
    return this.availableTools;
  }

  /**
   * 检查工具是否可用
   */
  isToolAvailable(toolName: string): boolean {
    return this.availableTools.some(tool => tool.name === toolName);
  }

  /**
   * 获取工具定义
   */
  getToolDefinition(toolName: string): Tool | undefined {
    return this.availableTools.find(tool => tool.name === toolName);
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * 将MCP工具转换为Ollama工具格式
   */
  convertToOllamaTools(): any[] {
    return this.availableTools.map(tool => {
       // 清理inputSchema，移除$schema字段以符合Ollama要求
       const cleanParameters: any = tool.inputSchema ? { ...tool.inputSchema } : {};
       if (cleanParameters && typeof cleanParameters === 'object' && '$schema' in cleanParameters) {
         delete cleanParameters.$schema;
       }
       
       return {
         type: 'function' as const,
         function: {
           name: tool.name,
           description: tool.description || '',
           parameters: cleanParameters
         }
       };
     });
  }

  /**
   * 批量执行工具调用
   */
  async executeMultipleToolCalls(toolCalls: McpToolCall[]): Promise<McpToolResult[]> {
    const results: McpToolResult[] = [];
    
    for (const toolCall of toolCalls) {
      const result = await this.executeToolCall(toolCall);
      results.push(result);
      
      // 如果某个工具调用失败，记录警告但继续执行
      if (!result.success) {
        console.warn(`工具调用失败: ${toolCall.name}`, result.error);
      }
    }
    
    return results;
  }
}

// 创建全局MCP客户端管理器实例
export const mcpClientManager = new McpClientManager();

/**
 * 工具调用辅助函数
 */
export async function callMcpTool(name: string, arguments_: Record<string, any>): Promise<any> {
  const result = await mcpClientManager.executeToolCall({
    name,
    arguments: arguments_
  });
  
  if (result.success) {
    return result.result;
  } else {
    throw new Error(result.error || '工具调用失败');
  }
}

/**
 * 初始化MCP客户端
 */
export async function initializeMcpClient(serverPath?: string): Promise<boolean> {
  return await mcpClientManager.connect(serverPath);
}

/**
 * 获取所有可用的MCP工具
 */
export async function getAllMcpTools(): Promise<Tool[]> {
  if (!mcpClientManager.getConnectionStatus()) {
    await mcpClientManager.connect();
  }
  return mcpClientManager.getAvailableTools();
}

/**
 * 检查MCP客户端是否已连接
 */
export function isMcpClientConnected(): boolean {
  return mcpClientManager.getConnectionStatus();
}