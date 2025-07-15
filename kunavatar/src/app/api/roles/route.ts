import { NextRequest, NextResponse } from 'next/server';
import { roleOperations, rolePermissionOperations } from '@/lib/database';
import { CreateRoleSchema, CreateRoleFromUISchema } from '@/lib/database/roles';
import { withAuth, canAccessResource } from '@/lib/middleware/auth';
import { z } from 'zod';

// 获取角色列表
export const GET = withAuth(async (request) => {
  try {
    // 检查权限
    if (!canAccessResource(request.user!.permissions, 'roles', 'read')) {
      return NextResponse.json({
        success: false,
        error: '权限不足',
      }, { status: 403 });
    }

    // 获取角色列表
    const roles = roleOperations.getAll();
    
    // 为每个角色添加权限信息
    const rolesWithPermissions = roles.map(role => {
      const permissions = rolePermissionOperations.getRolePermissions(role.id);
      
      return {
        ...role,
        permissions: permissions.map(permission => ({
          id: permission.id,
          name: permission.name,
          display_name: permission.display_name,
          resource: permission.resource,
          action: permission.action,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      roles: rolesWithPermissions,
    });

  } catch (error) {
    console.error('获取角色列表失败:', error);
    
    return NextResponse.json({
      success: false,
      error: '获取角色列表失败',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}, { required: true });

// 创建角色
export const POST = withAuth(async (request) => {
  try {
    // 检查权限
    if (!canAccessResource(request.user!.permissions, 'roles', 'manage')) {
      return NextResponse.json({
        success: false,
        error: '权限不足',
      }, { status: 403 });
    }

    const body = await request.json();
    
    // 验证请求数据 - 使用前端UI专用的验证模式
    const validatedData = CreateRoleFromUISchema.parse(body);
    
    // 创建角色
    const roleId = roleOperations.create(validatedData);
    
    // 获取创建的角色信息
    const role = roleOperations.getById(roleId);
    if (!role) {
      throw new Error('角色创建失败');
    }

    return NextResponse.json({
      success: true,
      message: '角色创建成功',
      role,
    }, { status: 201 });

  } catch (error) {
    console.error('创建角色失败:', error);
    
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
      if (error.message.includes('角色名已存在')) {
        return NextResponse.json({
          success: false,
          error: error.message,
        }, { status: 409 });
      }
    }

    return NextResponse.json({
      success: false,
      error: '创建角色失败',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}, { required: true });
