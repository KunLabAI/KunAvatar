import { NextRequest, NextResponse } from 'next/server';
import { mcpDbOperations } from '@/lib/database';
import SSEMcpClient from '@/lib/mcp/mcp-client-sse';
import { SSEServerConfig } from '@/lib/mcp/mcp-client-sse';
import StreamableHTTPMcpClient from '@/lib/mcp/mcp-client-streamable-http';
import { StreamableHTTPServerConfig } from '@/lib/mcp/mcp-client-streamable-http';
import fs from 'fs/promises';
import path from 'path';

const MCP_CONFIG_PATH = path.join(process.cwd(), 'mcp-servers.json');

// 读取MCP配置文件
async function readMcpConfig() {
  try {
    const configData = await fs.readFile(MCP_CONFIG_PATH, 'utf-8');
    return JSON.parse(configData);
  } catch (error) {
    return {
      mcpServers: {}
    };
  }
}

// 写入MCP配置文件
async function writeMcpConfig(config: any) {
  await fs.writeFile(MCP_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

// GET /api/mcp/servers - 获取所有服务器
export async function GET() {
  try {
    const servers = mcpDbOperations.getAllMcpServers();
    
    // 转换数据格式以匹配前端期望的格式，并添加工具数量
    const formattedServers = servers.map(server => {
      // 获取该服务器的工具数量
      const tools = mcpDbOperations.getMcpToolsByServerId(server.id);
      const toolCount = tools.length;
      
      return {
        id: server.id,
        name: server.name,
        display_name: server.display_name,
        description: server.description || '',
        type: server.type,
        status: server.status,
        enabled: server.enabled,
        errorMessage: server.error_message,
        toolCount: toolCount, // 添加工具数量
        // 根据类型添加相应的配置
        ...(server.type === 'stdio' && {
          command: server.command,
          args: server.args ? JSON.parse(server.args) : [],
          workingDirectory: server.working_directory
        }),
        ...(server.type !== 'stdio' && {
          url: server.url,
          baseUrl: server.base_url,
          port: server.port,
          path: server.path,
          protocol: server.protocol
        }),
        // 通用配置
        headers: server.headers ? JSON.parse(server.headers) : {},
        authType: server.auth_type,
        authConfig: server.auth_config ? JSON.parse(server.auth_config) : {},
        timeoutMs: server.timeout_ms,
        retryAttempts: server.retry_attempts,
        retryDelayMs: server.retry_delay_ms,
        extraConfig: server.extra_config ? JSON.parse(server.extra_config) : {},
        createdAt: server.created_at,
        updatedAt: server.updated_at,
        lastConnectedAt: server.last_connected_at
      };
    });
    
    return NextResponse.json({ success: true, servers: formattedServers });
  } catch (error) {
    console.error('获取服务器列表失败:', error);
    return NextResponse.json(
      { error: '获取服务器列表失败' },
      { status: 500 }
    );
  }
}

// 获取服务器工具列表
async function getServerTools(serverData: any) {
  const { type, url } = serverData;
  
  if (type === 'sse') {
    return await getSSEServerTools(url);
  } else if (type === 'streamable-http') {
    return await getStreamableHTTPServerTools(url);
  }
  
  return [];
}

// 获取SSE服务器工具
async function getSSEServerTools(url: string) {
  let client: SSEMcpClient | null = null;
  
  try {
    const config: SSEServerConfig = {
      name: 'temp-tools-fetch',
      url: url,
      type: 'sse'
    };

    client = new SSEMcpClient(config);
    const connected = await client.connect();
    
    if (!connected) {
      return [];
    }

    const tools = await client.getAvailableTools();
    return tools;
  } catch (error) {
    console.error('获取SSE服务器工具失败:', error);
    return [];
  } finally {
    if (client) {
      try {
        await client.disconnect();
      } catch (e) {
        console.error('断开工具获取连接时出错:', e);
      }
    }
  }
}

// 获取Streamable HTTP服务器工具
async function getStreamableHTTPServerTools(url: string) {
  let client: StreamableHTTPMcpClient | null = null;
  
  try {
    const config: StreamableHTTPServerConfig = {
      name: 'temp-tools-fetch',
      url: url,
      type: 'streamable-http'
    };

    client = new StreamableHTTPMcpClient(config);
    const connected = await client.connect();
    
    if (!connected) {
      return [];
    }

    const tools = await client.getAvailableTools();
    return tools;
  } catch (error) {
    console.error('获取Streamable HTTP服务器工具失败:', error);
    return [];
  } finally {
    if (client) {
      try {
        await client.disconnect();
      } catch (e) {
        console.error('断开工具获取连接时出错:', e);
      }
    }
  }
}

// 保存工具到数据库
function saveToolsToDatabase(serverId: number, tools: any[]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (tools.length === 0) {
      console.log('没有工具需要保存');
      resolve();
      return;
    }

    try {
      console.log(`开始保存 ${tools.length} 个工具到数据库，服务器ID: ${serverId}`);
      
      // 先删除该服务器的旧工具
      mcpDbOperations.deleteMcpToolsByServerId(serverId);
      console.log(`已删除服务器 ${serverId} 的旧工具`);
      
      // 批量插入新工具
      tools.forEach((tool, index) => {
        console.log(`保存工具 ${index + 1}/${tools.length}: ${tool.name}`);
        try {
          const toolId = mcpDbOperations.createMcpTool({
            server_id: serverId,
            name: tool.name,
            description: tool.description || '',
            input_schema: tool.inputSchema || null,
            is_available: true
          });
          console.log(`工具 ${tool.name} 保存成功，ID: ${toolId}`);
        } catch (toolError) {
          console.error(`保存工具 ${tool.name} 失败:`, toolError);
          throw toolError;
        }
      });
      
      // 验证保存结果
      const savedTools = mcpDbOperations.getMcpToolsByServerId(serverId);
      console.log(`验证保存结果：数据库中现有 ${savedTools.length} 个工具`);
      
      resolve();
    } catch (error) {
      console.error('保存工具到数据库失败:', error);
      reject(error);
    }
  });
}

// POST /api/mcp/servers - 创建新服务器
export async function POST(request: NextRequest) {
  try {
    const serverData = await request.json();
    
    // 详细日志：调试validatedTools传递问题
    console.log('=== 添加服务器请求调试 ===');
    console.log('服务器名称:', serverData.name);
    console.log('请求体包含的字段:', Object.keys(serverData));
    console.log('validatedTools字段存在:', 'validatedTools' in serverData);
    console.log('validatedTools类型:', typeof serverData.validatedTools);
    console.log('validatedTools是否为数组:', Array.isArray(serverData.validatedTools));
    if (serverData.validatedTools) {
      console.log('validatedTools长度:', serverData.validatedTools.length);
      console.log('validatedTools内容:', JSON.stringify(serverData.validatedTools, null, 2));
    }
    console.log('=== 调试信息结束 ===');
    
    // 使用前端验证时获取的工具信息，避免重复连接
    let tools: any[] = [];
    if (serverData.validatedTools && Array.isArray(serverData.validatedTools)) {
      tools = serverData.validatedTools;
      console.log(`使用前端验证时获取的 ${tools.length} 个工具`);
    } else {
      console.warn(`服务器 ${serverData.name} 没有提供验证的工具信息，请确保前端已完成连接测试`);
    }
    
    // 创建服务器
    const serverId = mcpDbOperations.createMcpServer({
      name: serverData.name,
      display_name: serverData.display_name,
      description: serverData.description,
      type: serverData.type,
      enabled: serverData.enabled ?? true,
      command: serverData.command,
      args: serverData.args,
      working_directory: serverData.working_directory,
      url: serverData.url,
      base_url: serverData.base_url,
      port: serverData.port,
      path: serverData.path,
      protocol: serverData.protocol,
      headers: serverData.headers,
      auth_type: serverData.auth_type,
      auth_config: serverData.auth_config,
      timeout_ms: serverData.timeout_ms,
      retry_attempts: serverData.retry_attempts,
      retry_delay_ms: serverData.retry_delay_ms,
      extra_config: serverData.extra_config
    });
    
    try {
      // 保存工具到数据库
      if (tools.length > 0) {
        await saveToolsToDatabase(serverId, tools);
        console.log(`已保存 ${tools.length} 个工具到数据库`);
        
        // 如果成功获取到工具，将服务器状态设置为connected
        mcpDbOperations.updateMcpServerStatus(serverId, 'connected');
        console.log(`服务器 ${serverData.name} 状态已设置为connected`);
      }
      
      // 同步服务器配置到 mcp-servers.json 文件
      try {
        const config = await readMcpConfig();
        
        // 构建服务器配置对象
        const serverConfig: any = {
          type: serverData.type
        };
        
        // 根据服务器类型添加相应配置
        if (serverData.type === 'sse' || serverData.type === 'streamable-http') {
          if (serverData.url) serverConfig.url = serverData.url;
          if (serverData.base_url) serverConfig.base_url = serverData.base_url;
          if (serverData.port) serverConfig.port = serverData.port;
          if (serverData.path) serverConfig.path = serverData.path;
          if (serverData.protocol) serverConfig.protocol = serverData.protocol;
        } else if (serverData.type === 'stdio') {
          if (serverData.command) serverConfig.command = serverData.command;
          if (serverData.args) serverConfig.args = serverData.args;
          if (serverData.working_directory) serverConfig.working_directory = serverData.working_directory;
        }
        
        // 添加可选配置
        if (serverData.description) serverConfig.description = serverData.description;
        if (serverData.headers) serverConfig.headers = serverData.headers;
        if (serverData.auth_type) serverConfig.auth_type = serverData.auth_type;
        if (serverData.auth_config) serverConfig.auth_config = serverData.auth_config;
        if (serverData.timeout_ms) serverConfig.timeout_ms = serverData.timeout_ms;
        if (serverData.retry_attempts) serverConfig.retry_attempts = serverData.retry_attempts;
        if (serverData.retry_delay_ms) serverConfig.retry_delay_ms = serverData.retry_delay_ms;
        if (serverData.extra_config) serverConfig.extra_config = serverData.extra_config;
        
        // 添加到配置文件
        config.mcpServers[serverData.name] = serverConfig;
        
        // 写入配置文件
        await writeMcpConfig(config);
        console.log(`已同步服务器 ${serverData.name} 到 mcp-servers.json`);
        
        // 通知多服务器客户端重新加载配置
        try {
          const { multiServerMcpClient } = require('../../../../lib/mcp/mcp-multi-server-client');
          multiServerMcpClient.setConfig(config.mcpServers);
          
          // 跳过立即连接服务器，避免重复连接
          // 服务器将在实际使用时按需连接
          console.log(`已添加服务器 ${serverData.name} 到配置，将在需要时自动连接`);
        } catch (error) {
          console.error('连接新MCP服务器失败:', error);
        }
      } catch (syncError) {
        console.error('同步到 mcp-servers.json 失败:', syncError);
        // 不影响主流程，继续返回成功
      }
      
      // 获取新创建的服务器
      const newServer = mcpDbOperations.getMcpServerById(serverId);
      
      return NextResponse.json({
        ...newServer,
        toolCount: tools.length
      }, { status: 201 });
    } catch (toolError) {
      console.error('保存工具到数据库失败:', toolError);
      // 即使工具保存失败，也返回成功创建的服务器
      const newServer = mcpDbOperations.getMcpServerById(serverId);
      
      return NextResponse.json({
        ...newServer,
        toolCount: 0,
        warning: '服务器创建成功，但工具保存失败'
      }, { status: 201 });
    }
  } catch (error) {
    console.error('创建服务器失败:', error);
    return NextResponse.json(
      { error: '创建服务器失败' },
      { status: 500 }
    );
  }
}