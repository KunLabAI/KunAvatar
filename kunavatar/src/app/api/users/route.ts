import { NextRequest, NextResponse } from 'next/server';
import { userOperations, userRoleOperations, rolePermissionOperations, roleOperations } from '@/lib/database';
import { CreateUserSchema, UpdateUserSchema } from '@/lib/database/users';
import { withAuth, canAccessResource } from '@/lib/middleware/auth';
import { z } from 'zod';

// 用户查询参数验证模式
const UserQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val)).pipe(z.number().min(1)).optional(),
  limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(100)).optional(),
  search: z.string().optional(),
  status: z.enum(['pending', 'active', 'inactive', 'suspended']).optional(),
  sort_by: z.enum(['username', 'email', 'created_at', 'last_login_at']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
});

// 获取用户列表
export const GET = withAuth(async (request) => {
  try {
    // 检查权限
    if (!canAccessResource(request.user!.permissions, 'users', 'read')) {
      return NextResponse.json({
        success: false,
        error: '权限不足',
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // 验证查询参数
    const validatedParams = UserQuerySchema.parse(queryParams);
    
    // 获取用户列表
    const users = userOperations.getAll(validatedParams);
    
    // 为每个用户添加角色和权限信息
    const usersWithDetails = users.map(user => {
      const roles = userRoleOperations.getUserRoles(user.id);
      const permissions = rolePermissionOperations.getUserPermissions(user.id);
      
      // 移除密码哈希
      const { password_hash, ...userWithoutPassword } = user;
      
      return {
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
      };
    });

    // 获取用户统计信息
    const stats = userOperations.getStats();

    return NextResponse.json({
      success: true,
      users: usersWithDetails,
      stats,
      pagination: {
        page: validatedParams.page || 1,
        limit: validatedParams.limit || 20,
        total: usersWithDetails.length,
      },
    });

  } catch (error) {
    console.error('获取用户列表失败:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: '查询参数验证失败',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: '获取用户列表失败',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}, { required: true });

// 创建用户
export const POST = withAuth(async (request) => {
  try {
    // 检查权限
    if (!canAccessResource(request.user!.permissions, 'users', 'create')) {
      return NextResponse.json({
        success: false,
        error: '权限不足',
      }, { status: 403 });
    }

    const body = await request.json();
    
    // 验证请求数据
    const validatedData = CreateUserSchema.parse(body);
    
    // 创建用户
    const userId = await userOperations.create(validatedData);
    
    // 分配角色（如果提供了角色）
    if (validatedData.roles && validatedData.roles.length > 0) {
      try {
        for (const roleId of validatedData.roles) {
          userRoleOperations.assignRole(userId, roleId);
        }
      } catch (roleError) {
        console.error('分配角色失败:', roleError);
        // 注意：用户已创建，但角色分配失败
      }
    } else {
      // 如果没有指定角色，分配默认用户角色
      try {
        const userRole = roleOperations.getByName('user');
        if (userRole) {
          userRoleOperations.assignRole(userId, userRole.id);
        }
      } catch (roleError) {
        console.error('分配默认角色失败:', roleError);
      }
    }
    
    // 获取创建的用户信息（包含角色）
    const user = userOperations.getById(userId);
    if (!user) {
      throw new Error('用户创建失败');
    }

    // 获取用户角色和权限
    const roles = userRoleOperations.getUserRoles(userId);
    const permissions = rolePermissionOperations.getUserPermissions(userId);

    // 移除密码哈希字段
    const { password_hash, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      message: '用户创建成功',
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
    }, { status: 201 });

  } catch (error) {
    console.error('创建用户失败:', error);
    
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
      error: '创建用户失败',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}, { required: true });
