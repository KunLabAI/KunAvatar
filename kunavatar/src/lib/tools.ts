import type { Tool } from './ollama';
import { mcpClient, type McpToolCall } from './mcp/mcp-client';

/**
 * 清理参数以符合Ollama要求
 * 移除Ollama不支持的JSON Schema字段
 */
function cleanParametersForOllama(inputSchema: any): any {
  if (!inputSchema || typeof inputSchema !== 'object') {
    return {
      type: 'object',
      properties: {},
      required: []
    };
  }

  const cleaned = { ...inputSchema };
  
  // 移除Ollama不支持的字段
  delete cleaned.$schema;
  delete cleaned.$id;
  delete cleaned.$ref;
  delete cleaned.definitions;
  delete cleaned.additionalProperties;
  
  // 确保必需字段存在
  if (!cleaned.type) cleaned.type = 'object';
  if (!cleaned.properties) cleaned.properties = {};
  if (!cleaned.required) cleaned.required = [];
  
  return cleaned;
}

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
 * 将MCP工具转换为Ollama格式
 */
function convertMcpToolToOllamaFormat(mcpTool: any): Tool {
  return {
    type: 'function' as const,
    function: {
      name: mcpTool.name,
      description: mcpTool.description || '',
      parameters: cleanParametersForOllama(mcpTool.inputSchema)
    },
    // 保留服务器信息用于分类
    serverName: mcpTool.serverName,
    serverType: mcpTool.serverType
  } as any;
}

/**
 * 验证工具是否符合Ollama要求
 */
function validateOllamaTool(tool: Tool): boolean {
  try {
    return (
      tool.type === 'function' &&
      typeof tool.function.name === 'string' &&
      tool.function.name.length > 0 &&
      typeof tool.function.description === 'string' &&
      tool.function.parameters &&
      tool.function.parameters.type === 'object' &&
      Array.isArray(tool.function.parameters.required)
    );
  } catch (error) {
    console.warn('工具验证失败:', error);
    return false;
  }
}

// 保留测试工具用于模型兼容性检查
export const testTool: Tool = {
  type: 'function',
  function: {
    name: 'test_tool',
    description: '测试工具调用功能',
    parameters: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: '测试消息'
        }
      },
      required: ['message']
    }
  }
};

// 所有可用工具的集合 - 现在从MCP服务器动态获取
export let availableTools: Tool[] = [];

/**
 * 从MCP服务器获取可用工具列表
 */
export async function loadAvailableTools(): Promise<Tool[]> {
  try {
    // 确保MCP客户端已连接
    if (!mcpClient.isClientConnected()) {
      const connected = await mcpClient.connect();
      if (!connected) {
        console.warn('无法连接到MCP服务器，使用空工具列表');
        return [];
      }
    }

    // 获取MCP工具并转换为Ollama工具格式
    const mcpTools = await mcpClient.getAvailableTools();
    availableTools = mcpTools
      .map(tool => convertMcpToolToOllamaFormat(tool))
      .filter(tool => validateOllamaTool(tool));

    console.log(`已从MCP服务器加载 ${availableTools.length} 个工具`);
    return availableTools;
  } catch (error) {
    console.error('加载MCP工具失败:', error);
    return [];
  }
}

// 根据工具名称获取工具定义
export async function getToolsByNames(toolNames: string[]): Promise<Tool[]> {
  console.log('getToolsByNames 被调用，请求的工具:', toolNames);
  
  // 在服务器端，从mcpServerClient和多服务器客户端获取工具
  if (typeof window === 'undefined') {
    const { mcpServerClient } = require('./mcp/mcp-client-server');
    const { multiServerMcpClient } = require('./mcp/mcp-multi-server-client');
    
    const allTools: Tool[] = [];
    const toolMap = new Map<string, Tool>(); // 用于去重
    
    // 首先尝试从数据库直接获取工具
    try {
      console.log('尝试从数据库获取工具...');
      const response = await fetch('http://localhost:3000/api/mcp/tools', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.tools && data.tools.length > 0) {
          console.log('从数据库获取到工具:', data.tools.map((t: any) => t.name));
          
          const dbTools = data.tools
            .map((tool: any) => convertMcpToolToOllamaFormat(tool))
            .filter((tool: Tool) => validateOllamaTool(tool));
          
          dbTools.forEach((tool: Tool) => {
            toolMap.set(tool.function.name, tool);
          });
          
          console.log('从数据库转换的工具:', dbTools.map((t: Tool) => t.function.name));
        }
      }
    } catch (error) {
      console.error('从数据库获取工具失败:', error);
    }
    
    // 1. 获取原有MCP工具
    try {
      const mcpTools = mcpServerClient.getAvailableTools();
      const serverTools = mcpTools
        .map((tool: any) => convertMcpToolToOllamaFormat(tool))
        .filter((tool: Tool) => validateOllamaTool(tool));
      
      // 添加到工具映射中进行去重
      serverTools.forEach((tool: Tool) => {
        toolMap.set(tool.function.name, tool);
      });
      
      console.log('从原有MCP服务器获取到工具:', serverTools.map((t: Tool) => t.function.name));
    } catch (error) {
      console.error('获取原有MCP工具失败:', error);
    }
    
    // 2. 获取多服务器MCP工具
    try {
      // 首先加载MCP配置
      console.log('加载MCP服务器配置...');
      const fs = require('fs').promises;
      const path = require('path');
      const configPath = path.join(process.cwd(), 'mcp-servers.json');
      
      let config = {};
      try {
        const configData = await fs.readFile(configPath, 'utf-8');
        const parsedConfig = JSON.parse(configData);
        config = parsedConfig.mcpServers || {};
        console.log('加载的MCP配置:', Object.keys(config));
      } catch (configError) {
        console.warn('无法加载MCP配置文件:', configError);
      }
      
      // 设置配置，但不自动连接所有服务器
      multiServerMcpClient.setConfig(config);
      console.log('设置多服务器客户端配置，检查已连接的服务器...');
      
      // 只获取已连接服务器的工具，不强制连接所有服务器
      const connectionStatus = multiServerMcpClient.getConnectionStatus();
      const hasConnectedServers = Object.values(connectionStatus).some(status => status);
      
      let multiServerTools: any[] = [];
      if (hasConnectedServers) {
        // 如果有已连接的服务器，获取它们的工具
        multiServerTools = multiServerMcpClient.getAllAvailableTools();
        console.log('从已连接的服务器获取到的工具:', multiServerTools);
      } else {
        console.log('没有已连接的MCP服务器，跳过工具获取');
      }
      
      const convertedMultiServerTools = multiServerTools
        .map((tool: any) => convertMcpToolToOllamaFormat(tool))
        .filter((tool: Tool) => validateOllamaTool(tool));
      
      // 添加到工具映射中进行去重
      convertedMultiServerTools.forEach((tool: Tool) => {
        toolMap.set(tool.function.name, tool);
      });
      
      console.log('转换后的多服务器工具:', convertedMultiServerTools.map((t: Tool) => t.function.name));
    } catch (error) {
      console.error('获取多服务器MCP工具失败:', error);
    }
    
    // 将去重后的工具转换为数组
    allTools.push(...Array.from(toolMap.values()));
    console.log('所有可用工具:', allTools.map((t: Tool) => t.function.name));
    
    // 如果从数据库获取到了工具，优先使用数据库中的工具
    if (toolMap.size > 0) {
      console.log('使用数据库中的工具，工具数量:', toolMap.size);
      
      // 过滤用户请求的工具
      const filteredTools = toolNames
        .map(name => toolMap.get(name))
        .filter((tool): tool is Tool => tool !== undefined);
      
      const foundToolNames = filteredTools.map((t: Tool) => t.function.name);
      const missingTools = toolNames.filter(name => !foundToolNames.includes(name));
      
      console.log('从数据库找到的工具:', foundToolNames);
      if (missingTools.length > 0) {
        console.warn('数据库中未找到的工具:', missingTools);
      }
      
      return filteredTools;
    }
    
    // 过滤用户请求的工具，并记录不存在的工具
    console.log('开始过滤工具，请求的工具名称:', toolNames);
    console.log('所有可用工具名称:', allTools.map((t: Tool) => t.function.name));
    
    const filteredTools = allTools.filter((tool: Tool) => {
      const isIncluded = toolNames.includes(tool.function.name);
      console.log(`工具 ${tool.function.name} 是否匹配:`, isIncluded);
      return isIncluded;
    });
    
    const foundToolNames = filteredTools.map((t: Tool) => t.function.name);
    const missingTools = toolNames.filter(name => !foundToolNames.includes(name));
    
    if (missingTools.length > 0) {
      console.warn('以下工具不存在:', missingTools);
      console.warn('可能的原因: 工具名称不匹配或服务器未连接');
    }
    
    console.log('过滤后的工具:', filteredTools.map((t: Tool) => t.function.name));
    console.log('过滤后的工具数量:', filteredTools.length);
    
    return filteredTools;
  }
  
  // 在客户端，使用缓存的availableTools
  const filteredTools = availableTools.filter(tool => toolNames.includes(tool.function.name));
  console.log('客户端过滤后的工具:', filteredTools.map((t: Tool) => t.function.name));
  return filteredTools;
}

/**
 * 初始化MCP工具系统
 */
export async function initializeMcpTools(): Promise<boolean> {
  try {
    const success = await mcpClient.connect();
    if (success) {
      console.log('MCP工具系统初始化成功');
      await refreshMcpTools();
    } else {
      console.warn('MCP工具系统初始化失败');
    }
    return success;
  } catch (error) {
    console.error('MCP工具系统初始化出错:', error);
    return false;
  }
}

/**
 * 刷新MCP工具列表
 */
export async function refreshMcpTools(): Promise<void> {
  try {
    if (mcpClient.isClientConnected()) {
      const mcpTools = await mcpClient.refreshTools();
      console.log(`已刷新 ${mcpTools.length} 个MCP工具`);
    }
  } catch (error) {
    console.error('刷新MCP工具失败:', error);
  }
}

/**
 * 获取所有可用工具（包括原有MCP工具和多服务器MCP工具）
 */
export async function getAllAvailableTools(): Promise<Tool[]> {
  const tools: Tool[] = [];
  
  // 0. 本地预设工具已在mcp-server.ts中定义，通过MCP协议获取，无需在此处重复定义
  
  try {
    // 1. 获取原有的MCP工具（仅在已连接时获取）
    if (mcpClient.isClientConnected()) {
      const mcpTools = mcpClient.getAvailableTools();
      const convertedMcpTools: Tool[] = mcpTools
        .map((tool: any) => convertMcpToolToOllamaFormat(tool))
        .filter((tool: Tool) => validateOllamaTool(tool));
      
      tools.push(...convertedMcpTools);
    }
    
    // 2. 获取多服务器MCP工具
    try {
      const response = await fetch('/api/mcp/tools');
      const data = await response.json();
      
      if (data.success && data.tools) {
        const multiServerTools: Tool[] = data.tools
          .map((tool: any) => {
            // 为多服务器工具添加服务器名称标识
            const toolWithServerInfo = {
              ...tool,
              description: tool.description + (tool.serverName ? ` (来自 ${tool.serverName})` : '')
            };
            return convertMcpToolToOllamaFormat(toolWithServerInfo);
          })
          .filter((tool: Tool) => validateOllamaTool(tool));
        
        tools.push(...multiServerTools);
      }
    } catch (error) {
      console.error('获取多服务器MCP工具失败:', error);
    }
    
  } catch (error) {
    console.error('获取MCP工具失败:', error);
  }
  
  // 去重：根据工具名称去除重复项，保留最后一个（多服务器工具优先）
  const uniqueTools = tools.reduce((acc: Tool[], current: Tool) => {
    const existingIndex = acc.findIndex(tool => tool.function.name === current.function.name);
    if (existingIndex >= 0) {
      // 如果已存在同名工具，替换为当前工具（后加载的优先）
      acc[existingIndex] = current;
    } else {
      acc.push(current);
    }
    return acc;
  }, []);
  
  console.log(`去重后获取到 ${uniqueTools.length} 个工具`);
  return uniqueTools;
}

/**
 * 检查工具是否可用（检查MCP工具）
 */
export async function isToolAvailable(toolName: string): Promise<boolean> {
  try {
    // 仅在已连接时检查工具可用性
    if (mcpClient.isClientConnected()) {
      return mcpClient.isToolAvailable(toolName);
    }
    
    // 如果未连接，检查多服务器客户端
    if (typeof window === 'undefined') {
      // 服务器端
      const { multiServerMcpClient } = require('./mcp/mcp-multi-server-client');
      return multiServerMcpClient.isToolAvailable(toolName);
    }
    
    return false;
  } catch (error) {
    console.error('检查MCP工具可用性失败:', error);
    return false;
  }
}

// 工具执行函数
export class ToolExecutor {
  /**
   * 执行工具调用（仅使用MCP工具）
   */
  static async executeToolCall(toolName: string, args: any, serverName?: string): Promise<string> {
    try {
      // 只使用MCP工具
      return await this.executeMcpTool(toolName, args, serverName);
    } catch (error) {
      return `工具执行失败: ${error instanceof Error ? error.message : '未知错误'}`;
    }
  }

  /**
   * 执行MCP工具调用
   */
  private static async executeMcpTool(toolName: string, args: any, serverName?: string): Promise<string> {
    try {
      // 在服务器端使用mcpServerClient和多服务器客户端，在客户端使用mcpClient
      if (typeof window === 'undefined') {
        // 服务器端
        const { mcpServerClient } = require('./mcp/mcp-client-server');
        const { multiServerMcpClient } = require('./mcp/mcp-multi-server-client');
        
        // 首先尝试从原有MCP服务器调用工具
        try {
          if (!mcpServerClient.isClientConnected()) {
            await mcpServerClient.connect();
          }
          
          if (mcpServerClient.isToolAvailable(toolName)) {
            // 获取工具schema并应用默认值
            const availableTools = mcpServerClient.getAvailableTools();
            const tool = availableTools.find((t: any) => t.name === toolName);
            const processedArgs = tool ? applyDefaultValues(args || {}, tool.inputSchema) : (args || {});
            
            const result = await mcpServerClient.callTool({
              name: toolName,
              arguments: processedArgs
            });
            
            if (!result.isError && result.content) {
              const textContent = result.content
                .filter((item: { type: string }) => item.type === 'text')
                .map((item: { text: string }) => item.text)
                .join('\n');
              return textContent || '工具执行成功';
            }
          }
        } catch (error) {
          console.log('原有MCP服务器调用失败，尝试多服务器客户端:', error);
        }
        
        // 如果原有MCP服务器没有该工具或调用失败，尝试多服务器客户端
        try {
          let targetServer = serverName;
          
          // 如果指定了服务器名称，优先使用指定的服务器
          if (serverName) {
            console.log(`使用指定的服务器: ${serverName}`);
            // 确保指定的服务器已连接
            const connectionStatus = multiServerMcpClient.getConnectionStatus();
            if (!connectionStatus[serverName]) {
              console.log(`连接指定的服务器: ${serverName}`);
              const connected = await multiServerMcpClient.connectServer(serverName);
              if (!connected) {
                throw new Error(`无法连接到指定的服务器 '${serverName}'`);
              }
            }
          } else {
            // 如果没有指定服务器，使用智能连接，只连接包含该工具的服务器
            console.log(`智能查找工具 '${toolName}' 所在的服务器`);
            targetServer = await multiServerMcpClient.connectForTool(toolName);
            if (!targetServer) {
              throw new Error(`找不到包含工具 '${toolName}' 的服务器`);
            }
          }
          
          // 获取工具schema并应用默认值
          const allTools = multiServerMcpClient.getAllAvailableTools();
          const tool = allTools.find((t: any) => t.name === toolName);
          const processedArgs = tool ? applyDefaultValues(args || {}, tool.inputSchema) : (args || {});
          
          const result = await multiServerMcpClient.callTool(toolName, processedArgs, targetServer);
          
          if (!result.isError && result.content) {
            const textContent = result.content
              .filter((item: { type: string }) => item.type === 'text')
              .map((item: { text: string }) => item.text)
              .join('\n');
            return textContent || '工具执行成功';
          } else {
            throw new Error(result.content?.[0]?.text || '工具调用失败');
          }
        } catch (error) {
          console.error('多服务器MCP工具调用失败:', error);
          throw new Error('所有MCP服务器都无法执行该工具');
        }
      } else {
        // 客户端 - 通过API调用，默认值处理在服务器端进行
        const result = await mcpClient.callTool({
          name: toolName,
          arguments: args || {},
          serverName
        });
        
        if (!result.isError && result.content) {
          const textContent = result.content
            .filter(item => item.type === 'text')
            .map(item => item.text)
            .join('\n');
          return textContent || '工具执行成功';
        } else {
          throw new Error(result.content?.[0]?.text || '工具调用失败');
        }
      }
    } catch (error) {
      console.error('MCP工具调用失败:', error);
      throw error;
    }
  }
}

// 本地工具实现已删除，现在使用真正的MCP工具