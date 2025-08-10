/**
 * 内置本地工具实现
 * 不依赖外部 MCP SDK，直接在应用内部提供工具功能
 * 用于解决 Electron 打包环境中的依赖问题
 */

import * as fs from 'fs/promises';
import * as path from 'path';

// 工具接口定义
export interface LocalTool {
  name: string;
  description: string;
  inputSchema: any;
  handler: (args: any) => Promise<any>;
}

// 工具执行结果接口
export interface ToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

/**
 * 内置本地工具列表
 */
export const LOCAL_TOOLS: LocalTool[] = [
  {
    name: 'calculate',
    description: '计算数学表达式，支持基本的四则运算、括号和小数',
    inputSchema: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: '要计算的数学表达式，支持基本的四则运算、括号和小数'
        }
      },
      required: ['expression']
    },
    handler: async ({ expression }) => {
      try {
        if (!expression || typeof expression !== 'string') {
          throw new Error('表达式不能为空且必须是字符串');
        }
        
        // 更安全的数学表达式验证和计算
        const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
        if (sanitized !== expression) {
          throw new Error('表达式包含不支持的字符，仅支持数字、+、-、*、/、()和空格');
        }
        
        // 检查括号匹配
        const openParens = (expression.match(/\(/g) || []).length;
        const closeParens = (expression.match(/\)/g) || []).length;
        if (openParens !== closeParens) {
          throw new Error('括号不匹配');
        }
        
        const result = Function('"use strict"; return (' + sanitized + ')')();
        
        if (!isFinite(result)) {
          throw new Error('计算结果无效（可能是除零或溢出）');
        }
        
        return {
          content: [{
            type: 'text',
            text: `计算结果: ${expression} = ${result}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text', 
            text: `计算错误: ${error instanceof Error ? error.message : '未知错误'}`
          }],
          isError: true
        };
      }
    }
  },
  
  {
    name: 'get_current_time',
    description: '获取当前时间，支持多种时区和格式选择',
    inputSchema: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: '时区，如 Asia/Shanghai, UTC, America/New_York',
          default: 'Asia/Shanghai'
        },
        format: {
          type: 'string',
          enum: ['iso', 'locale', 'timestamp'],
          description: '时间格式：iso(ISO字符串)、locale(本地化)、timestamp(时间戳)',
          default: 'locale'
        }
      }
    },
    handler: async ({ timezone = 'Asia/Shanghai', format = 'locale' }) => {
      try {
        const now = new Date();
        let timeString: string;
        
        switch (format) {
          case 'iso':
            timeString = now.toISOString();
            break;
          case 'timestamp':
            timeString = now.getTime().toString();
            break;
          case 'locale':
          default:
            timeString = now.toLocaleString('zh-CN', {
              timeZone: timezone,
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });
            break;
        }
        
        return {
          content: [{
            type: 'text',
            text: `当前时间 (${timezone}): ${timeString}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `获取时间失败: ${error instanceof Error ? error.message : '未知错误'}`
          }],
          isError: true
        };
      }
    }
  },
  
  {
    name: 'read_file',
    description: '读取指定路径的文件内容，支持多种编码格式',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: '要读取的文件路径'
        },
        encoding: {
          type: 'string',
          enum: ['utf8', 'base64'],
          description: '文件编码，默认为utf8',
          default: 'utf8'
        }
      },
      required: ['file_path']
    },
    handler: async ({ file_path, encoding = 'utf8' }) => {
      try {
        if (!file_path) {
          throw new Error('文件路径不能为空');
        }
        
        // 安全检查：防止路径遍历攻击
        const normalizedPath = path.normalize(file_path);
        if (normalizedPath.includes('..')) {
          throw new Error('不允许访问上级目录');
        }
        
        const content = await fs.readFile(normalizedPath, encoding as BufferEncoding);
        
        return {
          content: [{
            type: 'text',
            text: `文件内容 (${file_path}):\n${content}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `读取文件失败: ${error instanceof Error ? error.message : '未知错误'}`
          }],
          isError: true
        };
      }
    }
  },
  
  {
    name: 'write_file',
    description: '向指定路径写入文件内容，支持多种编码格式',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: '要写入的文件路径'
        },
        content: {
          type: 'string',
          description: '要写入的内容'
        },
        encoding: {
          type: 'string',
          enum: ['utf8', 'base64'],
          description: '文件编码，默认为utf8',
          default: 'utf8'
        }
      },
      required: ['file_path', 'content']
    },
    handler: async ({ file_path, content, encoding = 'utf8' }) => {
      try {
        if (!file_path) {
          throw new Error('文件路径不能为空');
        }
        
        if (content === undefined || content === null) {
          throw new Error('文件内容不能为空');
        }
        
        // 安全检查：防止路径遍历攻击
        const normalizedPath = path.normalize(file_path);
        if (normalizedPath.includes('..')) {
          throw new Error('不允许访问上级目录');
        }
        
        // 确保目录存在
        const dir = path.dirname(normalizedPath);
        await fs.mkdir(dir, { recursive: true });
        
        await fs.writeFile(normalizedPath, content, encoding as BufferEncoding);
        
        return {
          content: [{
            type: 'text',
            text: `文件写入成功: ${file_path}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `写入文件失败: ${error instanceof Error ? error.message : '未知错误'}`
          }],
          isError: true
        };
      }
    }
  },
  
  {
    name: 'list_directory',
    description: '列出指定目录下的文件和子目录',
    inputSchema: {
      type: 'object',
      properties: {
        directory_path: {
          type: 'string',
          description: '要列出的目录路径'
        },
        show_hidden: {
          type: 'boolean',
          description: '是否显示隐藏文件',
          default: false
        }
      },
      required: ['directory_path']
    },
    handler: async ({ directory_path, show_hidden = false }) => {
      try {
        if (!directory_path) {
          throw new Error('目录路径不能为空');
        }
        
        // 安全检查：防止路径遍历攻击
        const normalizedPath = path.normalize(directory_path);
        if (normalizedPath.includes('..')) {
          throw new Error('不允许访问上级目录');
        }
        
        const entries = await fs.readdir(normalizedPath, { withFileTypes: true });
        
        const items = entries
          .filter(entry => show_hidden || !entry.name.startsWith('.'))
          .map(entry => {
            const type = entry.isDirectory() ? '目录' : '文件';
            return `${type}: ${entry.name}`;
          });
        
        return {
          content: [{
            type: 'text',
            text: `目录内容 (${directory_path}):\n${items.join('\n')}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `列出目录失败: ${error instanceof Error ? error.message : '未知错误'}`
          }],
          isError: true
        };
      }
    }
  }
];

/**
 * 本地工具管理器
 */
export class LocalToolManager {
  private tools: Map<string, LocalTool> = new Map();
  
  constructor() {
    // 注册所有本地工具
    LOCAL_TOOLS.forEach(tool => {
      this.tools.set(tool.name, tool);
    });
  }
  
  /**
   * 获取所有可用工具
   */
  getAvailableTools(): Array<{ name: string; description: string; inputSchema: any }> {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }));
  }
  
  /**
   * 检查工具是否存在
   */
  hasToolAvailable(toolName: string): boolean {
    return this.tools.has(toolName);
  }
  
  /**
   * 调用工具
   */
  async callTool(toolName: string, args: any): Promise<ToolResult> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return {
        content: [{
          type: 'text',
          text: `工具 "${toolName}" 不存在`
        }],
        isError: true
      };
    }
    
    try {
      const result = await tool.handler(args);
      return result;
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `工具执行失败: ${error instanceof Error ? error.message : '未知错误'}`
        }],
        isError: true
      };
    }
  }
}

// 导出单例实例
export const localToolManager = new LocalToolManager();