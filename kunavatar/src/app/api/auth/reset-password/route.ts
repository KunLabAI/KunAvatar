import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { z } from 'zod';

// 重置密码请求验证模式
const ResetPasswordRequestSchema = z.object({
  token: z.string().min(1, '重置令牌不能为空'),
  password: z.string().min(6).max(128, '密码长度必须在6-128位之间'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "密码确认不匹配",
  path: ["confirmPassword"],
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 验证请求数据
    const { token, password } = ResetPasswordRequestSchema.parse(body);
    
    // 重置密码
    const success = await AuthService.resetPassword(token, password);
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: '密码重置失败，令牌可能无效或已过期',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: '密码重置成功，请使用新密码登录',
    });

  } catch (error) {
    console.error('密码重置失败:', error);
    
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

    return NextResponse.json({
      success: false,
      error: '密码重置失败',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}

// 验证重置令牌的GET接口
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: '重置令牌不能为空',
      }, { status: 400 });
    }

    // 验证重置令牌
    const verification = await AuthService.verifyPasswordResetToken(token);
    
    if (!verification.valid) {
      return NextResponse.json({
        success: false,
        error: verification.error || '令牌无效',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: '令牌有效',
    });

  } catch (error) {
    console.error('令牌验证失败:', error);
    
    return NextResponse.json({
      success: false,
      error: '令牌验证失败',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}
