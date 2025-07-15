import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { z } from 'zod';

// 忘记密码请求验证模式
const ForgotPasswordRequestSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 验证请求数据
    const { email } = ForgotPasswordRequestSchema.parse(body);
    
    // 生成密码重置令牌
    const resetToken = await AuthService.generatePasswordResetToken(email);
    
    if (!resetToken) {
      // 为了安全考虑，即使邮箱不存在也返回成功消息
      return NextResponse.json({
        success: true,
        message: '如果该邮箱地址存在，我们已发送密码重置链接到您的邮箱',
      });
    }

    // 在实际应用中，这里应该发送邮件
    // 目前为了演示，我们直接返回重置令牌（生产环境中不应该这样做）
    console.log(`密码重置令牌: ${resetToken}`);
    console.log(`重置链接: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`);

    return NextResponse.json({
      success: true,
      message: '密码重置链接已发送到您的邮箱',
      // 仅在开发环境中返回令牌
      ...(process.env.NODE_ENV === 'development' && { 
        resetToken,
        resetUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`
      }),
    });

  } catch (error) {
    console.error('密码重置请求失败:', error);
    
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
      error: '密码重置请求失败',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}
