#!/usr/bin/env node

/**
 * MCP服务器启动脚本
 * 用于独立运行MCP服务器，供Ollama等客户端连接
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 使用tsx运行TypeScript文件
const tsFile = join(__dirname, 'src', 'lib', 'mcp', 'mcp-server.ts');

const child = spawn('npx', ['tsx', tsFile], {
  stdio: 'inherit',
  shell: true
});

child.on('error', (error) => {
  console.error('MCP服务器启动失败:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  if (code !== 0) {
    console.error(`MCP服务器退出，退出码: ${code}`);
    process.exit(code || 1);
  }
});

// 处理进程退出信号
process.on('SIGINT', () => {
  console.error('收到SIGINT信号，正在关闭服务器...');
  child.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('收到SIGTERM信号，正在关闭服务器...');
  child.kill('SIGTERM');
  process.exit(0);
});

console.error('正在启动MCP服务器...');