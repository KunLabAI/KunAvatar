import { NextRequest, NextResponse } from 'next/server';
import { UserSettingOperations } from '@/lib/database/user-settings';
import { AuthService } from '@/lib/auth';

// 读取配置
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

    // 从数据库获取用户的Ollama连接设置
    const ollamaUrl = UserSettingOperations.getValue(
      verification.user.id.toString(),
      'ollama-base-url',
      'http://localhost:11434'
    );
    
    return NextResponse.json({
      baseUrl: ollamaUrl,
      source: 'database'
    });
  } catch (error) {
    console.error('读取Ollama配置失败:', error);
    return NextResponse.json(
      { error: '读取配置失败' },
      { status: 500 }
    );
  }
}

// 保存配置
export async function POST(request: NextRequest) {
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

    const { baseUrl } = await request.json();
    
    if (!baseUrl || typeof baseUrl !== 'string') {
      return NextResponse.json(
        { error: '无效的baseUrl参数' },
        { status: 400 }
      );
    }

    // 验证URL格式
    try {
      new URL(baseUrl.trim());
    } catch {
      return NextResponse.json(
        { error: '无效的URL格式' },
        { status: 400 }
      );
    }

    // 保存到数据库
    const success = UserSettingOperations.setValue(
      verification.user.id.toString(),
      'ollama-base-url',
      baseUrl.trim(),
      'system'
    );
    
    if (!success) {
      return NextResponse.json(
        { error: '保存配置失败' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      baseUrl: baseUrl.trim(),
      message: '配置已保存'
    });
  } catch (error) {
    console.error('保存Ollama配置失败:', error);
    return NextResponse.json(
      { error: '保存配置失败' },
      { status: 500 }
    );
  }
}