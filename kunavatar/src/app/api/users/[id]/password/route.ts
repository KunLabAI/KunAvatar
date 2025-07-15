import { NextRequest, NextResponse } from 'next/server';
import { userOperations } from '@/lib/database';
import { withAuth, canAccessResource } from '@/lib/middleware/auth';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// 密码更新请求验证模式
const UpdatePasswordSchema = z.object({
  currentPassword: z.string().optional(), // 用户更新自己密码时需要
  newPassword: z.string().min(6).max(128, '密码长度必须在6-128位之间'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "密码确认不匹配",
  path: ["confirmPassword"],
});

// 更新用户密码
export const PUT = withAuth(async (request, context) => {
  try {
    const { id: userId } = await context.params;
    const id = userId;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: '用户ID无效',
      }, { status: 400 });
    }

    // 检查权限（用户可以更新自己的密码，或者有users:update权限）
    const canUpdateOthers = canAccessResource(request.user!.permissions, 'users', 'update');
    const isOwnProfile = request.user!.id === id;
    
    if (!canUpdateOthers && !isOwnProfile) {
      return NextResponse.json({
        success: false,
        error: '权限不足',
      }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = UpdatePasswordSchema.parse(body);

    // 检查用户是否存在
    const user = userOperations.getById(id);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: '用户不存在',
      }, { status: 404 });
    }

    // 如果是用户更新自己的密码，需要验证当前密码
    if (isOwnProfile && !canUpdateOthers) {
      if (!validatedData.currentPassword) {
        return NextResponse.json({
          success: false,
          error: '请提供当前密码',
        }, { status: 400 });
      }

      // 验证当前密码
      const isCurrentPasswordValid = await bcrypt.compare(
        validatedData.currentPassword, 
        user.password_hash
      );
      
      if (!isCurrentPasswordValid) {
        return NextResponse.json({
          success: false,
          error: '当前密码错误',
        }, { status: 400 });
      }
    }

    // 更新密码
    const success = await userOperations.updatePassword(id, validatedData.newPassword);
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: '密码更新失败',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: '密码更新成功',
    });

  } catch (error) {
    console.error('更新密码失败:', error);
    
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
      error: '更新密码失败',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}, { required: true });
