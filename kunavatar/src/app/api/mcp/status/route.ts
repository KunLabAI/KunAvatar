import { NextResponse } from 'next/server';
import { multiServerMcpClient } from '@/lib/mcp/mcp-multi-server-client';
import * as fs from 'fs';
import * as path from 'path';

export async function GET() {
  try {
    // 读取服务器配置
    const configPath = path.join(process.cwd(), 'mcp-servers.json');
    let config = {};
    
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      const parsedConfig = JSON.parse(configContent);
      config = parsedConfig.mcpServers || {};
    }
    
    // 设置配置并连接所有服务器
    multiServerMcpClient.setConfig(config);
    const connectionResults = await multiServerMcpClient.connectAll();
    
    // 检查当前连接状态
    const currentStatus = multiServerMcpClient.getConnectionStatus();
    
    return NextResponse.json({ 
      servers: currentStatus,
      connectionResults,
      message: '多服务器MCP状态检查完成'
    });
  } catch (error) {
    console.error('MCP多服务器状态检查失败:', error);
    return NextResponse.json(
      { 
        servers: {},
        error: '多服务器状态检查失败',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}