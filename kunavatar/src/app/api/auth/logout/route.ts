import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // 从cookie中获取刷新令牌
    const refreshToken = request.cookies.get('refreshToken')?.value;
    
    if (refreshToken) {
      // 撤销刷新令牌
      await AuthService.logout(refreshToken);
    }

    // 创建响应并清除cookie
    const response = NextResponse.json({
      success: true,
      message: '登出成功',
    });

    // 清除刷新令牌cookie
    response.cookies.set('refreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('用户登出失败:', error);
    
    return NextResponse.json({
      success: false,
      error: '登出失败',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}
