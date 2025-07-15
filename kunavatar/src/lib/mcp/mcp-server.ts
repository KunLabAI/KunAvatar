/**
 * MCP服务器实现
 * 使用官方TypeScript SDK创建MCP服务器，提供工具给Ollama模型使用
 * 遵循MCP协议标准和最佳实践
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * 创建并配置MCP服务器
 * 按照官方MCP SDK标准实现
 */
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'kun-agent-tools',
    version: '1.0.0'
  }, {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    }
  });

  // 注册计算器工具 - 使用更安全的数学表达式计算
  server.tool(
    'calculate',
    '计算数学表达式，支持基本的四则运算、括号和小数',
    {
      expression: z.string().describe('要计算的数学表达式，支持基本的四则运算、括号和小数')
    },
    async ({ expression }) => {
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
          }]
        };
      }
    }
  );

  // 注册获取当前时间工具 - 支持多种时区和格式
  server.tool(
    'get_current_time',
    '获取当前时间，支持多种时区和格式选择',
    {
      timezone: z.string().optional().describe('时区，如 Asia/Shanghai, UTC, America/New_York'),
      format: z.enum(['iso', 'locale', 'timestamp']).optional().describe('时间格式：iso(ISO字符串)、locale(本地化)、timestamp(时间戳)')
    },
    async ({ timezone = 'Asia/Shanghai', format = 'locale' }) => {
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
          }]
        };
      }
    }
  );

  // 注册文件读取工具 - 支持多种编码格式
  server.tool(
    'read_file',
    '读取指定路径的文件内容，支持多种编码格式',
    {
      file_path: z.string().describe('要读取的文件路径'),
      encoding: z.enum(['utf8', 'base64']).optional().describe('文件编码，默认为utf8')
    },
    async ({ file_path, encoding = 'utf8' }) => {
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
          }]
        };
      }
    }
  );

  // 注册文件写入工具 - 支持多种编码格式
  server.tool(
    'write_file',
    '向指定路径写入文件内容，支持多种编码格式',
    {
      file_path: z.string().describe('要写入的文件路径'),
      content: z.string().describe('要写入的内容'),
      encoding: z.enum(['utf8', 'base64']).optional().describe('文件编码，默认为utf8')
    },
    async ({ file_path, content, encoding = 'utf8' }) => {
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
          }]
        };
      }
    }
  );

  // 注册目录列表工具 - 支持显示隐藏文件
  server.tool(
    'list_directory',
    '列出指定目录下的文件和子目录，可选择是否显示隐藏文件',
    {
      directory_path: z.string().describe('要列出的目录路径'),
      show_hidden: z.boolean().optional().describe('是否显示隐藏文件，默认为false')
    },
    async ({ directory_path, show_hidden = false }) => {
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
        const filteredEntries = show_hidden ? entries : entries.filter(entry => !entry.name.startsWith('.'));
        
        const fileList = filteredEntries.map(entry => {
          const type = entry.isDirectory() ? '目录' : '文件';
          return `${type}: ${entry.name}`;
        }).join('\n');
        
        return {
          content: [{
            type: 'text',
            text: `目录内容 (${directory_path}):\n${fileList || '目录为空'}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `列出目录失败: ${error instanceof Error ? error.message : '未知错误'}`
          }]
        };
      }
    }
  );
  return server;
}

/**
 * 启动MCP服务器（用于独立运行）
 * 按照官方MCP SDK标准实现服务器启动逻辑
 */
async function startMcpServer(): Promise<void> {
  try {
    const server = createMcpServer();
    const transport = new StdioServerTransport();
    
    // 添加错误处理
    process.on('SIGINT', async () => {
      console.error('收到SIGINT信号，正在关闭MCP服务器...');
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.error('收到SIGTERM信号，正在关闭MCP服务器...');
      process.exit(0);
    });
    
    console.error('MCP服务器启动中...');
    await server.connect(transport);
    console.error('MCP服务器已启动，等待连接...');
    
    // 保持进程运行
    process.stdin.resume();
  } catch (error) {
    console.error('MCP服务器启动失败:', error);
    process.exit(1);
  }
}

// 导出函数
export {
  createMcpServer,
  startMcpServer
};

// 如果直接运行此文件，启动服务器
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  startMcpServer().catch((error) => {
    console.error('启动MCP服务器时发生错误:', error);
    process.exit(1);
  });
}