import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // 从cookie中获取刷新令牌
    const refreshToken = request.cookies.get('refreshToken')?.value;
    
    if (!refreshToken) {
      return NextResponse.json({
        success: false,
        error: '刷新令牌不存在',
      }, { status: 401 });
    }

    // 刷新访问令牌
    const result = await AuthService.refreshToken(refreshToken);
    
    if (!result) {
      // 刷新令牌无效，清除cookie
      const response = NextResponse.json({
        success: false,
        error: '刷新令牌无效或已过期',
      }, { status: 401 });

      response.cookies.set('refreshToken', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        path: '/',
      });

      return response;
    }

    return NextResponse.json({
      success: true,
      message: '令牌刷新成功',
      accessToken: result.accessToken,
    });

  } catch (error) {
    console.error('令牌刷新失败:', error);
    
    return NextResponse.json({
      success: false,
      error: '令牌刷新失败',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}
