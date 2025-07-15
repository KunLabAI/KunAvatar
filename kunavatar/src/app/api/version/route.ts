import { NextRequest, NextResponse } from 'next/server';
import { getUserOllamaClient } from '@/lib/ollama';
import { AuthService } from '@/lib/auth';

// Ollama版本信息代理接口
export async function GET(request: NextRequest) {
  try {
    // 从Authorization头获取访问令牌
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '访问令牌不存在' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7);
    
    // 验证访问令牌
    const verification = await AuthService.verifyAccessToken(accessToken);
    
    if (!verification.valid || !verification.user) {
      return NextResponse.json(
        { error: verification.error || '访问令牌无效' },
        { status: 401 }
      );
    }

    // 获取用户特定的Ollama客户端
    const ollamaClient = getUserOllamaClient(verification.user.id.toString());
    const baseUrl = ollamaClient['baseUrl'];
    
    const response = await fetch(`${baseUrl}/api/version`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('获取Ollama版本失败:', response.status, response.statusText);
      return NextResponse.json(
        { error: '无法获取Ollama版本信息' },
        { status: 503 }
      );
    }

    const versionData = await response.json();
    return NextResponse.json(versionData);
  } catch (error) {
    console.error('Ollama版本API错误:', error);
    return NextResponse.json(
      { error: 'Ollama服务不可用' },
      { status: 503 }
    );
  }
}