import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const MCP_CONFIG_PATH = path.join(process.cwd(), 'mcp-servers.json');

// 读取MCP配置
async function readMcpConfig() {
  try {
    const configData = await fs.readFile(MCP_CONFIG_PATH, 'utf-8');
    return JSON.parse(configData);
  } catch (error) {
    // 如果文件不存在，返回默认配置
    return {
      mcpServers: {}
    };
  }
}

// 写入MCP配置
async function writeMcpConfig(config: any) {
  await fs.writeFile(MCP_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

// GET - 获取MCP配置
export async function GET() {
  try {
    const config = await readMcpConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error('读取MCP配置失败:', error);
    return NextResponse.json(
      { error: '读取配置失败' },
      { status: 500 }
    );
  }
}

// POST - 更新MCP配置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, server, serverName } = body;
    
    const config = await readMcpConfig();
    
    switch (action) {
      case 'add':
        if (!server || !server.name) {
          return NextResponse.json(
            { error: '服务器信息不完整' },
            { status: 400 }
          );
        }
        
        // 检查服务器名称是否已存在
        if (config.mcpServers[server.name]) {
          return NextResponse.json(
            { error: '服务器名称已存在' },
            { status: 400 }
          );
        }
        
        // 添加新服务器
        const { name, ...serverConfig } = server;
        config.mcpServers[name] = {
          type: serverConfig.type,
          ...(serverConfig.url && { url: serverConfig.url }),
          ...(serverConfig.command && { command: serverConfig.command }),
          ...(serverConfig.args && { args: serverConfig.args }),
          ...(serverConfig.description && { description: serverConfig.description })
        };
        
        await writeMcpConfig(config);
        
        // 通知多服务器客户端重新加载配置
        try {
          const { multiServerMcpClient } = require('../../../../lib/mcp/mcp-multi-server-client');
          multiServerMcpClient.setConfig(config.mcpServers);
          await multiServerMcpClient.connectAll();
        } catch (error) {
          console.error('重新连接MCP服务器失败:', error);
        }
        
        return NextResponse.json({ success: true });
        
      case 'delete':
        if (!serverName) {
          return NextResponse.json(
            { error: '服务器名称不能为空' },
            { status: 400 }
          );
        }
        
        if (!config.mcpServers[serverName]) {
          return NextResponse.json(
            { error: '服务器不存在' },
            { status: 404 }
          );
        }
        
        // 删除服务器
        delete config.mcpServers[serverName];
        await writeMcpConfig(config);
        
        // 通知多服务器客户端删除服务器配置（不重新连接所有服务器）
        try {
          const { multiServerMcpClient } = require('../../../../lib/mcp/mcp-multi-server-client');
          // 先断开被删除服务器的连接
          await multiServerMcpClient.disconnectServer(serverName);
          // 更新配置但不重新连接所有服务器
          multiServerMcpClient.setConfig(config.mcpServers);
          console.log(`已删除服务器 ${serverName} 的连接和配置`);
        } catch (error) {
          console.error('删除服务器连接失败:', error);
        }
        
        return NextResponse.json({ success: true });
        
      case 'update':
        if (!serverName || !server) {
          return NextResponse.json(
            { error: '服务器信息不完整' },
            { status: 400 }
          );
        }
        
        if (!config.mcpServers[serverName]) {
          return NextResponse.json(
            { error: '服务器不存在' },
            { status: 404 }
          );
        }
        
        // 更新服务器配置
        const { name: _, ...updateConfig } = server;
        config.mcpServers[serverName] = {
          ...config.mcpServers[serverName],
          ...updateConfig
        };
        
        await writeMcpConfig(config);
        
        // 通知多服务器客户端重新加载配置
        try {
          const { multiServerMcpClient } = require('../../../../lib/mcp/mcp-multi-server-client');
          multiServerMcpClient.setConfig(config.mcpServers);
          await multiServerMcpClient.disconnectAll();
          await multiServerMcpClient.connectAll();
        } catch (error) {
          console.error('重新连接MCP服务器失败:', error);
        }
        
        return NextResponse.json({ success: true });
        
      default:
        return NextResponse.json(
          { error: '不支持的操作' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('处理MCP配置请求失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}