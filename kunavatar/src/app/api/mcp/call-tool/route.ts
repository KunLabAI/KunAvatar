import { NextRequest, NextResponse } from 'next/server';
import { multiServerMcpClient } from '@/lib/mcp/mcp-multi-server-client';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 处理MCP工具参数，应用默认值
 * 解决某些MCP工具的默认参数被设置为空值导致请求失败的问题
 */
function applyDefaultValues(args: Record<string, any>, inputSchema: any): Record<string, any> {
  if (!inputSchema || !inputSchema.properties) {
    return args;
  }

  const processedArgs = { ...args };
  const properties = inputSchema.properties;
  const required = inputSchema.required || [];

  // 遍历schema中的所有属性
  for (const [propName, propSchema] of Object.entries(properties)) {
    const propDef = propSchema as any;
    const currentValue = processedArgs[propName];
    
    // 如果属性有默认值且当前值为空或未定义
    if (propDef.default !== undefined) {
      const shouldApplyDefault = 
        currentValue === undefined ||
        currentValue === null ||
        currentValue === '' ||
        (Array.isArray(currentValue) && currentValue.length === 0) ||
        (typeof currentValue === 'object' && currentValue !== null && Object.keys(currentValue).length === 0);
      
      if (shouldApplyDefault) {
        processedArgs[propName] = propDef.default;
        console.log(`应用默认值: ${propName} = ${JSON.stringify(propDef.default)}`);
      }
    }
    // 如果属性不是必需的且当前值为空字符串或空数组，则删除该属性
    else if (!required.includes(propName)) {
      if (currentValue === '' || (Array.isArray(currentValue) && currentValue.length === 0)) {
        delete processedArgs[propName];
        console.log(`移除空值参数: ${propName}`);
      }
    }
  }

  return processedArgs;
}

/**
 * MCP工具调用API
 * POST /api/mcp/call-tool
 */
export async function POST(request: NextRequest) {
  try {
    const { name, arguments: args, serverName } = await request.json();
    
    if (!name) {
      return NextResponse.json(
        { success: false, error: '工具名称不能为空' },
        { status: 400 }
      );
    }

    // 读取服务器配置
    const configPath = path.join(process.cwd(), 'mcp-servers.json');
    let config = {};
    
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      const parsedConfig = JSON.parse(configContent);
      config = parsedConfig.mcpServers || {};
    }
    
    // 设置配置
    multiServerMcpClient.setConfig(config);
    
    // 智能连接：只连接包含指定工具的服务器
    let targetServerName = serverName;
    
    if (serverName && serverName !== 'local') {
      // 如果指定了服务器名称，检查该服务器是否已连接
      const connectionStatus = multiServerMcpClient.getConnectionStatus();
      if (!connectionStatus[serverName]) {
        console.log(`连接指定的MCP服务器: ${serverName}`);
        const connected = await multiServerMcpClient.connectServer(serverName);
        if (!connected) {
          return NextResponse.json(
            { success: false, error: `无法连接到服务器 '${serverName}'` },
            { status: 500 }
          );
        }
      }
    } else {
      // 如果没有指定服务器，使用智能连接来找到包含该工具的服务器
      console.log(`智能查找工具 '${name}' 所在的服务器`);
      targetServerName = await multiServerMcpClient.connectForTool(name);
      
      if (!targetServerName) {
        return NextResponse.json(
          { success: false, error: `找不到包含工具 '${name}' 的服务器` },
          { status: 404 }
        );
      }
    }

    // 获取工具schema并应用默认值处理
    let processedArgs = args || {};
    try {
      const allTools = multiServerMcpClient.getAllAvailableTools();
      const tool = allTools.find(t => t.name === name);
      if (tool && tool.inputSchema) {
        processedArgs = applyDefaultValues(args || {}, tool.inputSchema);
        console.log(`工具 ${name} 参数处理完成:`, processedArgs);
      }
    } catch (error) {
      console.warn('参数默认值处理失败，使用原始参数:', error);
    }

    // 调用工具（使用确定的服务器名称）
    const result = await multiServerMcpClient.callTool(name, processedArgs, targetServerName);
    
    return NextResponse.json({
      success: true,
      result,
      serverName: targetServerName || 'auto-detected'
    });
  } catch (error) {
    console.error('MCP多服务器工具调用失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '工具调用失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}
