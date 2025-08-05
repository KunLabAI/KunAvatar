import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import { multiServerMcpClient } from '../../../../lib/mcp/mcp-multi-server-client';
import { getDatabasePath } from '@/lib/database/db-path';

const dbPath = getDatabasePath();

// 保存工具到数据库
async function saveToolsToDatabase(tools: any[], serverId: number) {
  const db = new Database(dbPath);
  try {
    // 为每个工具保存到数据库
    for (const tool of tools) {
      // 检查工具是否已存在
      const existingTool = db.prepare('SELECT id FROM mcp_tools WHERE server_id = ? AND name = ?').get(serverId, tool.name) as { id: number } | undefined;
      
      if (existingTool) {
        // 更新现有工具
        db.prepare(`
          UPDATE mcp_tools
          SET description = ?, input_schema = ?, is_available = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(tool.description || null, JSON.stringify(tool.inputSchema || {}), 1, existingTool.id);
      } else {
        // 插入新工具
        db.prepare(`
          INSERT INTO mcp_tools (server_id, name, description, input_schema, is_available, enabled, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(
          serverId, 
          tool.name, 
          tool.description || null, 
          JSON.stringify(tool.inputSchema || {}), 
          1, // is_available = true
          1  // enabled = true
        );
      }
    }
    
    console.log(`已保存 ${tools.length} 个工具到数据库 (服务器ID: ${serverId})`);
  } catch (error) {
    console.error('保存工具到数据库失败:', error);
  } finally {
    db.close();
  }
}

/**
 * 检查服务器连接状态API
 * POST /api/mcp/server-status
 */
export async function POST(request: Request) {
  try {
    const { serverName } = await request.json();
    
    if (!serverName) {
      return NextResponse.json(
        { error: '服务器名称不能为空' },
        { status: 400 }
      );
    }
    
    let status = 'disconnected';
    let errorMessage = null;
    let toolCount = 0;
    
    // 处理本地服务器
    if (serverName === 'local') {
      try {
        const { mcpServerClient } = require('../../../../lib/mcp/mcp-client-server');
        const isConnected = mcpServerClient.isClientConnected();
        status = isConnected ? 'connected' : 'disconnected';
        
        if (isConnected) {
          const tools = mcpServerClient.getAvailableTools();
          toolCount = tools.length;
        }
      } catch (error) {
        status = 'error';
        errorMessage = error instanceof Error ? error.message : '连接失败';
      }
    } else {
      // 处理外部服务器
      const db = new Database(dbPath);
      
      try {
        // 获取服务器配置
        const server = db.prepare('SELECT * FROM mcp_servers WHERE name = ? AND enabled = 1').get(serverName) as {
          id: number;
          name: string;
          type: string;
          url?: string;
          command?: string;
          args?: string;
        } | undefined;
        
        if (!server) {
          return NextResponse.json(
            { error: '服务器不存在或已禁用' },
            { status: 404 }
          );
        }
        
        // 构建配置
        const config: { [serverName: string]: { type: 'stdio' | 'sse'; url?: string; command?: string; args?: string[] } } = {};
        config[server.name] = {
          type: server.type as 'stdio' | 'sse',
          ...(server.url && { url: server.url }),
          ...(server.command && { command: server.command }),
          ...(server.args && { args: JSON.parse(server.args || '[]') })
        };
        
        // 设置配置并尝试连接
        multiServerMcpClient.setConfig(config);
        
        try {
          // 只连接指定的服务器
          const connected = await multiServerMcpClient.connectServer(serverName);
          
          if (connected) {
            // 获取工具列表
            const tools = multiServerMcpClient.getToolsByServer(serverName);
            status = 'connected';
            toolCount = tools.length;
            
            // 保存工具到数据库
            await saveToolsToDatabase(tools, server.id);
            
            // 更新数据库中的状态
            db.prepare(`
              UPDATE mcp_servers 
              SET status = ?, last_connected_at = datetime('now'), error_message = NULL 
              WHERE name = ?
            `).run('connected', serverName);
          } else {
            status = 'disconnected';
            toolCount = 0;
          }
          
        } catch (error) {
          status = 'error';
          errorMessage = error instanceof Error ? error.message : '连接失败';
          
          // 更新数据库中的错误状态
          db.prepare(`
            UPDATE mcp_servers 
            SET status = ?, error_message = ? 
            WHERE name = ?
          `).run('error', errorMessage, serverName);
        }
        
      } finally {
        db.close();
      }
    }
    
    return NextResponse.json({
      success: true,
      serverName,
      status,
      toolCount,
      errorMessage
    });
    
  } catch (error) {
    console.error('检查服务器状态失败:', error);
    return NextResponse.json(
      { error: '检查服务器状态失败' },
      { status: 500 }
    );
  }
}