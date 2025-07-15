import { NextRequest, NextResponse } from 'next/server';
import { userOperations, roleOperations, userRoleOperations } from '@/lib/database';
import { CreateUserSchema } from '@/lib/database/users';
import { z } from 'zod';

// 注册请求验证模式
const RegisterRequestSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6).max(128, '密码长度必须在6-128位之间'),
  confirmPassword: z.string(),
  first_name: z.string().max(50).optional(),
  last_name: z.string().max(50).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "密码确认不匹配",
  path: ["confirmPassword"],
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 验证请求数据
    const validatedData = RegisterRequestSchema.parse(body);
    
    // 创建用户数据 - 新用户默认为待审核状态
    const userData = {
      username: validatedData.username,
      email: validatedData.email,
      password: validatedData.password,
      first_name: validatedData.first_name,
      last_name: validatedData.last_name,
      status: 'pending' as const, // 新用户需要管理员审核
      email_verified: false,
    };

    // 创建用户
    const userId = await userOperations.create(userData);
    
    // 注意：新用户不会自动分配角色，需要管理员审核后手动分配

    // 获取创建的用户信息（不包含密码）
    const user = userOperations.getById(userId);
    if (!user) {
      throw new Error('用户创建失败');
    }

    // 移除密码哈希字段
    const { password_hash, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      message: '用户注册成功，请等待管理员审核后方可登录',
      user: userWithoutPassword,
    }, { status: 201 });

  } catch (error) {
    console.error('用户注册失败:', error);
    
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
      if (error.message.includes('用户名已存在') || error.message.includes('邮箱已存在')) {
        return NextResponse.json({
          success: false,
          error: error.message,
        }, { status: 409 });
      }
    }

    return NextResponse.json({
      success: false,
      error: '用户注册失败',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}
