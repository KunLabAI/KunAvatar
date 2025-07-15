import { NextRequest, NextResponse } from 'next/server';
import SSEMcpClient from '@/lib/mcp/mcp-client-sse';
import { SSEServerConfig } from '@/lib/mcp/mcp-client-sse';
import StreamableHTTPMcpClient from '@/lib/mcp/mcp-client-streamable-http';
import { StreamableHTTPServerConfig } from '@/lib/mcp/mcp-client-streamable-http';

// POST - 测试MCP服务器连接
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, type } = body;
    
    if (!url || !type) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 验证URL格式
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'URL格式无效' },
        { status: 400 }
      );
    }

    let validationResult;
    
    if (type === 'sse') {
      // 验证SSE连接
      validationResult = await validateSSEConnection(url);
    } else if (type === 'streamable-http' || type === 'streamable_http') {
      // 验证Streamable HTTP连接
      validationResult = await validateStreamableHTTPConnection(url);
    } else if (type === 'http') {
      // 验证HTTP连接
      validationResult = await validateHTTPConnection(url);
    } else {
      return NextResponse.json(
        { error: '不支持的服务器类型' },
        { status: 400 }
      );
    }

    return NextResponse.json(validationResult);
  } catch (error) {
    console.error('测试服务器连接失败:', error);
    return NextResponse.json(
      { error: '连接测试失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

// 验证SSE连接
async function validateSSEConnection(url: string) {
  let client: SSEMcpClient | null = null;
  
  try {
    // 创建临时的SSE客户端配置
    const config: SSEServerConfig = {
      name: 'temp-validation',
      url: url,
      type: 'sse'
    };

    // 创建SSE客户端实例
    client = new SSEMcpClient(config);

    // 尝试连接
    const connected = await client.connect();
    
    if (!connected) {
      return {
        success: false,
        error: '无法连接到SSE服务器'
      };
    }

    // 获取工具列表
    const tools = await client.getAvailableTools();

    return {
      success: true,
      message: '连接成功',
      tools: tools,
      toolCount: tools.length
    };
  } catch (error) {
    return {
      success: false,
      error: `连接失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  } finally {
    // 确保断开连接
    if (client) {
      try {
        await client.disconnect();
      } catch (e) {
        console.error('断开验证连接时出错:', e);
      }
    }
  }
}

// 验证Streamable HTTP连接
async function validateStreamableHTTPConnection(url: string) {
  let client: StreamableHTTPMcpClient | null = null;
  
  try {
    // 创建临时的Streamable HTTP客户端配置
    const config: StreamableHTTPServerConfig = {
      name: 'temp-validation',
      url: url,
      type: 'streamable-http',
      timeout: 30000, // 30秒超时
      retryAttempts: 3, // 重试3次
      // 从URL中提取API密钥
      apiKey: new URL(url).searchParams.get('api_key') || undefined
    };

    // 创建Streamable HTTP客户端实例
    client = new StreamableHTTPMcpClient(config);

    // 尝试连接
    const connected = await client.connect();
    
    if (!connected) {
      return {
        success: false,
        error: '无法连接到Streamable HTTP服务器'
      };
    }

    // 获取工具列表
    const tools = await client.getAvailableTools();

    return {
      success: true,
      message: '连接成功',
      tools: tools,
      toolCount: tools.length
    };
  } catch (error) {
    return {
      success: false,
      error: `连接失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  } finally {
    // 确保断开连接
    if (client) {
      try {
        await client.disconnect();
      } catch (e) {
        console.error('断开验证连接时出错:', e);
      }
    }
  }
}

// 验证HTTP连接
async function validateHTTPConnection(url: string) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `服务器响应错误: ${response.status} ${response.statusText}`
      };
    }

    const data = await response.json();
    
    if (data.error) {
      return {
        success: false,
        error: `服务器返回错误: ${data.error.message || data.error}`
      };
    }

    if (!data.result || !data.result.tools) {
      return {
        success: false,
        error: '服务器未返回有效的工具列表'
      };
    }

    return {
      success: true,
      message: '连接成功',
      tools: data.result.tools,
      toolCount: data.result.tools.length
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: '连接超时'
      };
    }
    return {
      success: false,
      error: `连接失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}