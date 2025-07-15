import { NextRequest, NextResponse } from 'next/server';
import { getUserOllamaClient } from '@/lib/ollama';
import { AuthService } from '@/lib/auth';

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
    const baseUrl = ollamaClient['baseUrl']; // 访问私有属性用于日志
    
    // 使用用户特定的客户端检查连接状态
    const isAvailable = await ollamaClient.isAvailable();

    if (isAvailable) {
      return NextResponse.json({ 
        status: 'connected',
        available: true,
        message: 'Ollama服务运行正常'
      });
    } else {
      return NextResponse.json({ 
        status: 'disconnected',
        available: false,
        message: 'Ollama服务不可用'
      }, { status: 503 });
    }
  } catch (error) {
    console.error('Ollama状态检测失败:', error);
    
    let errorMessage = 'Ollama服务不可用';
    if (error instanceof Error) {
      if (error.name === 'TimeoutError') {
        errorMessage = '连接超时';
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = '连接被拒绝，请检查Ollama是否启动';
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json({ 
      status: 'disconnected',
      available: false,
      message: errorMessage
    }, { status: 503 });
  }
}