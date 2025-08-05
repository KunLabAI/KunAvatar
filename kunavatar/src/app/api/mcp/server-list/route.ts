import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import { getDatabasePath } from '@/lib/database/db-path';

const dbPath = getDatabasePath();

interface DbServerResult {
  id: number;
  name: string;
  display_name: string;
  type: string;
  status: string;
  description?: string;
  last_connected_at?: string;
  error_message?: string;
  tool_count: number;
}

// 从数据库获取服务器列表和工具统计
function getServersFromDatabase(): DbServerResult[] {
  const db = new Database(dbPath);
  
  try {
    // 获取服务器信息及其工具数量
    const servers = db.prepare(`
      SELECT 
        s.*,
        COUNT(t.id) as tool_count
      FROM mcp_servers s
      LEFT JOIN mcp_tools t ON s.id = t.server_id AND t.is_available = 1 AND t.enabled = 1
      WHERE s.enabled = 1
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `).all() as DbServerResult[];
    
    return servers;
  } finally {
    db.close();
  }
}

/**
 * 获取MCP服务器列表API
 * GET /api/mcp/server-list
 */
interface ServerResponse {
  id?: number;
  name: string;
  displayName: string;
  type: string;
  status: string;
  toolCount: number;
  description: string;
  lastConnectedAt?: string;
  errorMessage?: string;
}

export async function GET() {
  try {
    const servers: ServerResponse[] = [];
    
    // 添加本地服务器（从数据库获取工具数量）
    try {
      const { mcpServerClient } = require('../../../../lib/mcp/mcp-client-server');
      const isConnected = mcpServerClient.isClientConnected();
      
      // 从数据库获取本地工具数量（如果有的话）
      const db = new Database(dbPath);
      let localToolCount = 0;
      try {
        const localServer = db.prepare('SELECT id FROM mcp_servers WHERE name = ?').get('local') as { id: number } | undefined;
        if (localServer) {
          const toolCountResult = db.prepare('SELECT COUNT(*) as count FROM mcp_tools WHERE server_id = ? AND is_available = 1 AND enabled = 1').get(localServer.id) as { count: number } | undefined;
          localToolCount = toolCountResult?.count || 0;
        } else {
          // 如果数据库中没有本地服务器记录，直接从客户端获取
          const localTools = isConnected ? mcpServerClient.getAvailableTools() : [];
          localToolCount = localTools.length;
        }
      } finally {
        db.close();
      }
      
      servers.push({
        name: 'local',
        displayName: '本地服务器',
        type: 'stdio',
        status: isConnected ? 'connected' : 'disconnected',
        toolCount: localToolCount,
        description: '本地MCP服务器，提供基础工具功能'
      });
    } catch (error) {
      console.error('获取本地服务器信息失败:', error);
      servers.push({
        name: 'local',
        displayName: '本地服务器',
        type: 'stdio',
        status: 'error',
        toolCount: 0,
        description: '本地MCP服务器，提供基础工具功能'
      });
    }
    
    // 从数据库获取外部服务器信息
    try {
      const dbServers = getServersFromDatabase();
      
      // 添加数据库中的服务器信息（排除本地服务器，因为已经手动添加了）
      dbServers.forEach((server: DbServerResult) => {
        // 跳过本地服务器，避免重复
        if (server.name === 'local') {
          return;
        }
        
        servers.push({
          id: server.id,
          name: server.name,
          displayName: server.display_name || server.name,
          type: server.type,
          status: server.status || 'disconnected', // 使用数据库中存储的状态
          toolCount: server.tool_count || 0,
          description: server.description || `外部MCP服务器: ${server.name}`,
          lastConnectedAt: server.last_connected_at,
          errorMessage: server.error_message
        });
      });
    } catch (error) {
      console.error('获取外部服务器信息失败:', error);
    }
    
    return NextResponse.json({
      success: true,
      servers: servers
    });
  } catch (error) {
    console.error('获取服务器列表失败:', error);
    return NextResponse.json(
      { error: '获取服务器列表失败' },
      { status: 500 }
    );
  }
}