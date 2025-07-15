import { NextResponse } from 'next/server';
import { multiServerMcpClient } from '@/lib/mcp/mcp-multi-server-client';
import Database from 'better-sqlite3';
import * as path from 'path';
import { mcpToolOperations } from '@/lib/database';
import { mcpServerOperations } from '@/lib/database';

const dbPath = path.join(process.cwd(), 'chat.db');

// 确保本地MCP服务器记录存在于数据库中
function ensureLocalServerExists() {
  const db = new Database(dbPath);
  try {
    // 检查本地服务器是否已存在
    const existingServer = db.prepare('SELECT id, args FROM mcp_servers WHERE name = ?').get('local') as { id: number, args: string } | undefined;
    
    if (!existingServer) {
      // 创建本地服务器记录
      const result = db.prepare(`
        INSERT INTO mcp_servers (
          name, display_name, description, type, enabled, 
          command, args, working_directory, 
          created_at, updated_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
      `).run(
        'local',
        '本地MCP服务器',
        '内置的本地MCP服务器，提供基础工具功能',
        'stdio',
        1, // enabled
        'npx',
        JSON.stringify(['tsx', 'src/lib/mcp/mcp-server.ts']),
        process.cwd(),
        'connected'
      );
      
      console.log('已创建本地MCP服务器记录，ID:', result.lastInsertRowid);
      return result.lastInsertRowid as number;
    } else {
      // 检查并修复args字段格式
      try {
        const parsedArgs = JSON.parse(existingServer.args);
        // 如果args不是数组格式，则更新它
        if (!Array.isArray(parsedArgs)) {
          db.prepare(`
            UPDATE mcp_servers 
            SET args = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `).run(
            JSON.stringify(['tsx', 'src/lib/mcp/mcp-server.ts']),
            existingServer.id
          );
          console.log('已修复本地MCP服务器的args字段格式');
        }
      } catch (error) {
        // 如果args字段无法解析，则更新为正确格式
        db.prepare(`
          UPDATE mcp_servers 
          SET args = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `).run(
          JSON.stringify(['tsx', 'src/lib/mcp/mcp-server.ts']),
          existingServer.id
        );
        console.log('已修复本地MCP服务器的args字段格式（解析错误）');
      }
    }
    
    return existingServer.id;
  } finally {
    db.close();
  }
}

// 从数据库获取服务器配置
function getServersFromDatabase() {
  const db = new Database(dbPath);
  try {
    const servers = db.prepare('SELECT * FROM mcp_servers WHERE enabled = 1').all();
    const config: any = {};
    
    servers.forEach((server: any) => {
      const serverConfig: any = {
        type: server.type,
        command: server.command,
        args: server.args ? JSON.parse(server.args) : [],
        env: server.env ? JSON.parse(server.env) : {}
      };
      
      // 添加SSE/HTTP相关配置
      if (server.url) {
        serverConfig.url = server.url;
      }
      
      if (server.tools) {
        serverConfig.tools = JSON.parse(server.tools);
      }
      
      config[server.name] = serverConfig;
    });
    
    return config;
  } finally {
    db.close();
  }
}

// 保存工具到数据库
async function saveToolsToDatabase(tools: any[]) {
  const db = new Database(dbPath);
  try {
    // 获取服务器ID映射
    const servers = db.prepare('SELECT id, name FROM mcp_servers WHERE enabled = 1').all();
    const serverMap = new Map();
    servers.forEach((server: any) => {
      serverMap.set(server.name, server.id);
    });
    
    // 为每个工具保存到数据库
    for (const tool of tools) {
      const serverId = serverMap.get(tool.serverName);
      if (serverId) {
        // 检查工具是否已存在
        const existingTool = db.prepare('SELECT id FROM mcp_tools WHERE server_id = ? AND name = ?').get(serverId, tool.name) as { id: number } | undefined;
        
        if (existingTool) {
          // 更新现有工具
          const result = db.prepare(`
            UPDATE mcp_tools
            SET description = ?, input_schema = ?, is_available = ?, updated_at = datetime('now')
            WHERE id = ?
          `).run(tool.description || null, JSON.stringify(tool.inputSchema), true, existingTool.id);
        } else {
          // 插入新工具
          db.prepare(`
            INSERT INTO mcp_tools (server_id, name, description, input_schema, is_available, enabled, created_at, updated_at)
            VALUES (?, ?, ?, ?, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `).run(serverId, tool.name, tool.description || '', JSON.stringify(tool.inputSchema || {}));
        }
      }
    }
    
    console.log(`已保存 ${tools.length} 个工具到数据库`);
  } catch (error) {
    console.error('保存工具到数据库失败:', error);
  } finally {
    db.close();
  }
}

// 从数据库获取工具列表
function getToolsFromDatabase(serverName?: string, includeDisabled = false) {
  const db = new Database(dbPath);
  try {
    let query = `
      SELECT 
        t.id,
        t.server_id,
        t.name,
        t.description,
        t.input_schema,
        t.is_available,
        t.enabled,
        s.name as server_name,
        s.type as server_type
      FROM mcp_tools t
      JOIN mcp_servers s ON t.server_id = s.id
      WHERE t.is_available = 1 AND s.enabled = 1
    `;
    
    // 如果不包含禁用的工具，则添加enabled过滤条件
    if (!includeDisabled) {
      query += ' AND t.enabled = 1';
    }
    
    const params: any[] = [];
    if (serverName) {
      query += ' AND s.name = ?';
      params.push(serverName);
    }
    
    query += ' ORDER BY s.name, t.name';
    
    const tools = db.prepare(query).all(...params);
    
    return tools.map((tool: any) => {
      // 解析inputSchema并清理$schema字段以符合Ollama要求
       let inputSchema: any = {};
       if (tool.input_schema) {
         try {
           inputSchema = JSON.parse(tool.input_schema);
           if (inputSchema && typeof inputSchema === 'object' && '$schema' in inputSchema) {
             delete inputSchema.$schema;
           }
         } catch (error) {
           console.error('解析工具inputSchema失败:', error);
           inputSchema = {};
         }
       }
      
      return {
        id: tool.id,
        server_id: tool.server_id,
        name: tool.name,
        description: tool.description,
        input_schema: tool.input_schema,
        inputSchema,
        is_available: Boolean(tool.is_available),
        enabled: Boolean(tool.enabled),
        usage_count: 0,
        created_at: '',
        updated_at: '',
        server_name: tool.server_name,
        serverName: tool.server_name,
        serverType: tool.server_type
      };
    });
  } finally {
    db.close();
  }
}

/**
 * 获取MCP工具列表API
 * GET /api/mcp/tools?server=xxx&refresh=true&available=true
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const serverName = searchParams.get('server'); // 指定服务器名称
    const refresh = searchParams.get('refresh') === 'true'; // 是否强制刷新
    const includeDisabled = searchParams.get('includeDisabled') === 'true'; // 是否包含禁用的工具
    const availableOnly = searchParams.get('available') === 'true';

    // Fast path for getting all available tools for UI components
    if (availableOnly) {
      const tools = mcpToolOperations.getAvailable();
      return NextResponse.json({ success: true, tools });
    }
    
    let tools: any[] = [];
    
    // 优先从数据库获取工具（除非强制刷新）
    if (!refresh) {
      tools = getToolsFromDatabase(serverName ?? undefined, includeDisabled);
      
      // 直接返回数据库中的工具，不再连接外部服务器
      console.log(`从数据库获取到 ${tools.length} 个工具`);
      return NextResponse.json({
        success: true,
        tools: tools,
        fromCache: true
      });
    }
    
    // 如果数据库中没有数据或强制刷新，从服务器获取
    console.log('从服务器获取工具列表...');
    
    // 获取本地MCP工具
    if (!serverName || serverName === 'local') {
      try {
        // 确保本地服务器记录存在于数据库中
        ensureLocalServerExists();
        
        const { mcpServerClient } = require('../../../../lib/mcp/mcp-client-server');
        
        // 如果未连接，先尝试连接
        if (!mcpServerClient.isClientConnected()) {
          console.log('本地MCP客户端未连接，正在尝试连接...');
          const connected = await mcpServerClient.connect();
          if (!connected) {
            console.error('本地MCP客户端连接失败');
            return NextResponse.json({
              success: true,
              tools: [],
              fromCache: false,
              error: '本地MCP客户端连接失败'
            });
          }
        }
        
        if (mcpServerClient.isClientConnected()) {
          const localTools = mcpServerClient.getAvailableTools();
          console.log(`获取到 ${localTools.length} 个本地MCP工具:`, localTools.map((t: { name: string }) => t.name));
          
          const localToolsWithServer = localTools.map((tool: any) => ({
            ...tool,
            serverName: 'local',
            serverType: 'stdio'
          }));
          
          tools.push(...localToolsWithServer);
          
          // 保存本地工具到数据库
          if (localToolsWithServer.length > 0) {
            await saveToolsToDatabase(localToolsWithServer);
          }
        }
      } catch (error) {
        console.error('获取本地MCP工具失败:', error);
      }
    }
    
    // 获取外部服务器MCP工具
    if (!serverName || serverName !== 'local') {
      try {
        // 从数据库获取服务器配置
        const config = getServersFromDatabase();
        
        // 如果指定了服务器名称，只获取该服务器的配置
        const targetConfig: any = {};
        if (serverName && serverName !== 'local') {
          if (config[serverName]) {
            targetConfig[serverName] = config[serverName];
          }
        } else if (!serverName) {
          Object.assign(targetConfig, config);
        }
        
        if (Object.keys(targetConfig).length > 0) {
          console.log('MCP服务器配置:', JSON.stringify(targetConfig, null, 2));
          
          // 设置配置并确保连接
          multiServerMcpClient.setConfig(targetConfig);
          console.log('开始连接所有MCP服务器...');
          await multiServerMcpClient.connectAll();
          
          // 获取连接状态
          const connectionStatus = multiServerMcpClient.getConnectionStatus();
          console.log('MCP服务器连接状态:', connectionStatus);
          
          // 刷新所有工具
          console.log('开始刷新所有工具...');
          await multiServerMcpClient.refreshAllTools();
          
          // 获取所有工具列表
          const multiServerTools = multiServerMcpClient.getAllAvailableTools();
          console.log(`获取到 ${multiServerTools.length} 个多服务器MCP工具:`, multiServerTools.map(t => ({ name: t.name, server: t.serverName })));
          
          // 保存工具到数据库
          await saveToolsToDatabase(multiServerTools);
          
          // 过滤指定服务器的工具
          if (serverName) {
            tools.push(...multiServerTools.filter(tool => tool.serverName === serverName));
          } else {
            tools.push(...multiServerTools);
          }
        }
      } catch (error) {
        console.error('获取多服务器MCP工具失败:', error);
      }
    }
    
    console.log(`总共返回 ${tools.length} 个工具`);
    return NextResponse.json({
      success: true,
      tools: tools,
      fromCache: false
    });
  } catch (error) {
    console.error('获取MCP工具列表失败:', error);
    return NextResponse.json(
      { error: '获取工具列表失败' },
      { status: 500 }
    );
  }
}