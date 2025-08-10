/**
 * 服务器端MCP客户端实现
 * 只能在Node.js环境中使用，用于API路由
 * 支持回退到内置本地工具以解决 Electron 打包环境的依赖问题
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as path from 'path';
import { localToolManager, LocalToolManager } from './local-tools';

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
 * 服务器端MCP客户端类
 * 负责与MCP服务器的通信，支持回退到内置本地工具
 */
class McpServerClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private isConnected = false;
  private availableTools: McpTool[] = [];
  private useLocalTools = false; // 是否使用内置本地工具

  /**
   * 连接到MCP服务器
   */
  async connect(): Promise<boolean> {
    try {
      // 首先尝试连接外部 MCP 服务器
      const serverPath = path.join(process.cwd(), 'src', 'lib', 'mcp', 'mcp-server.ts');
      
      this.transport = new StdioClientTransport({
        command: 'npx',
        args: ['tsx', serverPath]
      });

      // 创建客户端
      this.client = new Client({
        name: 'kun-agent-server-client',
        version: '1.0.0'
      }, {
        capabilities: {
          tools: {}
        }
      });

      // 连接到服务器
      await this.client.connect(this.transport);
      this.isConnected = true;
      this.useLocalTools = false;

      // 获取可用工具
      await this.refreshTools();

      console.log('服务器端MCP客户端连接成功');
      return true;
    } catch (error) {
      console.error('服务器端MCP客户端连接失败，回退到内置本地工具:', error);
      
      // 清理失败的连接
      await this.disconnect();
      
      // 回退到内置本地工具
      this.useLocalTools = true;
      this.isConnected = true;
      
      // 获取内置工具列表
      await this.refreshTools();
      
      console.log('已回退到内置本地工具模式');
      return true;
    }
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
      this.useLocalTools = false;
      this.availableTools = [];
      console.log('服务器端MCP客户端已断开连接');
    } catch (error) {
      console.error('断开MCP连接时出错:', error);
    }
  }

  /**
   * 检查是否已连接
   */
  isClientConnected(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * 刷新工具列表
   */
  async refreshTools(): Promise<McpTool[]> {
    if (!this.isConnected) {
      return [];
    }

    try {
      if (this.useLocalTools) {
        // 使用内置本地工具
        const localTools = localToolManager.getAvailableTools();
        this.availableTools = localTools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }));
        
        console.log(`已获取 ${this.availableTools.length} 个内置本地工具`);
        return this.availableTools;
      } else {
        // 使用外部 MCP 服务器工具
        if (!this.client) {
          return [];
        }
        
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
        
        console.log(`已获取 ${this.availableTools.length} 个外部MCP工具`);
        return this.availableTools;
      }
    } catch (error) {
      console.error('获取工具列表失败:', error);
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
  async callTool(toolCall: McpToolCall): Promise<McpToolResult> {
    if (!this.isConnected) {
      return {
        content: [{
          type: 'text' as const,
          text: 'MCP客户端未连接'
        }],
        isError: true
      };
    }

    try {
      if (this.useLocalTools) {
        // 使用内置本地工具
        const result = await localToolManager.callTool(toolCall.name, toolCall.arguments);
        return {
          content: result.content.map(item => ({
            type: 'text' as const,
            text: item.text
          })),
          isError: result.isError || false
        };
      } else {
        // 使用外部 MCP 服务器工具
        if (!this.client) {
          return {
            content: [{
              type: 'text' as const,
              text: 'MCP客户端未连接'
            }],
            isError: true
          };
        }
        
        const result = await this.client.callTool({
          name: toolCall.name,
          arguments: toolCall.arguments
        });

        // 根据最新的MCP SDK，result.content 已经是正确的格式
        const content = (result as any).content || [{
          type: 'text' as const,
          text: '工具执行成功，但没有返回内容'
        }];
        
        return {
          content: content.map((item: any) => ({
            type: 'text' as const,
            text: item.type === 'text' ? item.text : JSON.stringify(item)
          })),
          isError: false
        };
      }
    } catch (error) {
      console.error('工具调用失败:', error);
      return {
        content: [{
          type: 'text' as const,
          text: `工具调用失败: ${error instanceof Error ? error.message : '未知错误'}`
        }],
        isError: true
      };
    }
  }
}

// 导出类和单例实例
export { McpServerClient };
export const mcpServerClient = new McpServerClient();