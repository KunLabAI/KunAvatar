import { NextRequest, NextResponse } from 'next/server';
import { userOperations, userRoleOperations, rolePermissionOperations } from '@/lib/database';
import { UpdateUserSchema } from '@/lib/database/users';
import { withAuth, canAccessResource } from '@/lib/middleware/auth';
import { z } from 'zod';

// 获取单个用户
export const GET = withAuth(async (request, context) => {
  try {
    const { id: userId } = await context.params;
    const id = userId;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: '用户ID无效',
      }, { status: 400 });
    }

    // 检查权限（用户可以查看自己的信息，或者有users:read权限）
    const canViewOthers = canAccessResource(request.user!.permissions, 'users', 'read');
    const isOwnProfile = request.user!.id === id;
    
    if (!canViewOthers && !isOwnProfile) {
      return NextResponse.json({
        success: false,
        error: '权限不足',
      }, { status: 403 });
    }

    // 获取用户信息
    const user = userOperations.getById(id);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: '用户不存在',
      }, { status: 404 });
    }

    // 获取用户角色和权限
    const roles = userRoleOperations.getUserRoles(id);
    const permissions = rolePermissionOperations.getUserPermissions(id);
    
    // 移除密码哈希字段
    const { password_hash, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      user: {
        ...userWithoutPassword,
        roles: roles.map(role => ({
          id: role.id,
          name: role.name,
          display_name: role.display_name,
        })),
        permissions: permissions.map(permission => ({
          id: permission.id,
          name: permission.name,
          display_name: permission.display_name,
          resource: permission.resource,
          action: permission.action,
        })),
      },
    });

  } catch (error) {
    console.error('获取用户信息失败:', error);
    
    return NextResponse.json({
      success: false,
      error: '获取用户信息失败',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}, { required: true });

// 更新用户
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

    // 检查权限（用户可以更新自己的基本信息，或者有users:update权限）
    const canUpdateOthers = canAccessResource(request.user!.permissions, 'users', 'update');
    const isOwnProfile = request.user!.id === id;
    
    if (!canUpdateOthers && !isOwnProfile) {
      return NextResponse.json({
        success: false,
        error: '权限不足',
      }, { status: 403 });
    }

    const body = await request.json();
    
    // 如果是用户更新自己的信息，限制可更新的字段
    let validatedData;
    if (isOwnProfile && !canUpdateOthers) {
      // 普通用户只能更新基本信息，不能更改状态等敏感字段
      const SelfUpdateSchema = UpdateUserSchema.omit({ status: true, email_verified: true });
      validatedData = SelfUpdateSchema.parse(body);
    } else {
      validatedData = UpdateUserSchema.parse(body);
    }
    
    // 更新用户信息
    const success = await userOperations.update(id, validatedData);
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: '用户更新失败',
      }, { status: 400 });
    }

    // 获取更新后的用户信息
    const user = userOperations.getById(id);
    if (!user) {
      throw new Error('获取更新后的用户信息失败');
    }

    // 获取用户角色和权限
    const roles = userRoleOperations.getUserRoles(id);
    const permissions = rolePermissionOperations.getUserPermissions(id);

    // 移除密码哈希字段
    const { password_hash, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      message: '用户更新成功',
      user: {
        ...userWithoutPassword,
        roles: roles.map(role => ({
          id: role.id,
          name: role.name,
          display_name: role.display_name,
        })),
        permissions: permissions.map(permission => ({
          id: permission.id,
          name: permission.name,
          display_name: permission.display_name,
          resource: permission.resource,
          action: permission.action,
        })),
      },
    });

  } catch (error) {
    console.error('更新用户失败:', error);
    
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
      error: '更新用户失败',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}, { required: true });

// 删除用户
export const DELETE = withAuth(async (request, context) => {
  try {
    const { id: userId } = await context.params;
    const id = userId;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: '用户ID无效',
      }, { status: 400 });
    }

    // 检查权限
    if (!canAccessResource(request.user!.permissions, 'users', 'delete')) {
      return NextResponse.json({
        success: false,
        error: '权限不足',
      }, { status: 403 });
    }

    // 防止用户删除自己
    if (request.user!.id === id) {
      return NextResponse.json({
        success: false,
        error: '不能删除自己的账户',
      }, { status: 400 });
    }

    // 检查用户是否存在
    const user = userOperations.getById(id);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: '用户不存在',
      }, { status: 404 });
    }

    // 删除用户
    const success = userOperations.delete(id);
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: '用户删除失败',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: '用户删除成功',
    });

  } catch (error) {
    console.error('删除用户失败:', error);
    
    return NextResponse.json({
      success: false,
      error: '删除用户失败',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}, { required: true });
