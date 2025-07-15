import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { LoginCredentialsSchema } from '@/lib/database/users';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 验证登录凭据
    const credentials = LoginCredentialsSchema.parse(body);
    
    // 执行登录
    const authResult = await AuthService.login(credentials.username, credentials.password);
    
    if (!authResult) {
      return NextResponse.json({
        success: false,
        error: '用户名或密码错误',
      }, { status: 401 });
    }

    // 移除密码哈希字段
    const { password_hash, ...userWithoutPassword } = authResult.user;

    // 设置HTTP-only cookie存储刷新令牌
    const response = NextResponse.json({
      success: true,
      message: '登录成功',
      user: userWithoutPassword,
      accessToken: authResult.accessToken,
    });

    // 设置刷新令牌cookie（HTTP-only，安全）
    response.cookies.set('refreshToken', authResult.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7天
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('用户登录失败:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: '输入数据验证失败',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      }, { status: 400 });
    }

    if (error instanceof Error) {
      // 处理特定的业务错误
      if (error.message.includes('用户账户待审核')) {
        return NextResponse.json({
          success: false,
          error: error.message,
        }, { status: 401 });
      }
      
      if (error.message.includes('用户账户已被禁用或暂停')) {
        return NextResponse.json({
          success: false,
          error: error.message,
        }, { status: 403 });
      }
    }

    return NextResponse.json({
      success: false,
      error: '登录失败',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}
