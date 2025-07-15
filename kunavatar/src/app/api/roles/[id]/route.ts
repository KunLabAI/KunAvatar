import { NextRequest, NextResponse } from 'next/server';
import { roleOperations, rolePermissionOperations } from '@/lib/database';
import { withAuth, canAccessResource } from '@/lib/middleware/auth';
import { z } from 'zod';

// 更新角色请求验证模式
const UpdateRoleSchema = z.object({
  display_name: z.string().min(1, '显示名称不能为空').max(100, '显示名称不能超过100个字符'),
  description: z.string().optional(),
});

// 获取单个角色信息
export const GET = withAuth(async (request, context) => {
  try {
    const { id: roleId } = await context.params;
    
    if (!roleId) {
      return NextResponse.json({
        success: false,
        error: '角色ID无效',
      }, { status: 400 });
    }

    // 检查权限
    if (!canAccessResource(request.user!.permissions, 'roles', 'read')) {
      return NextResponse.json({
        success: false,
        error: '权限不足',
      }, { status: 403 });
    }

    // 获取角色信息
    const role = roleOperations.getById(roleId);
    if (!role) {
      return NextResponse.json({
        success: false,
        error: '角色不存在',
      }, { status: 404 });
    }

    // 获取角色权限
    const permissions = rolePermissionOperations.getRolePermissions(roleId);
    
    return NextResponse.json({
      success: true,
      role: {
        ...role,
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
    console.error('获取角色信息失败:', error);
    
    return NextResponse.json({
      success: false,
      error: '获取角色信息失败',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}, { required: true });

// 更新角色信息
export const PUT = withAuth(async (request, context) => {
  try {
    const { id: roleId } = await context.params;
    
    if (!roleId) {
      return NextResponse.json({
        success: false,
        error: '角色ID无效',
      }, { status: 400 });
    }

    // 检查权限
    if (!canAccessResource(request.user!.permissions, 'roles', 'manage')) {
      return NextResponse.json({
        success: false,
        error: '权限不足',
      }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = UpdateRoleSchema.parse(body);

    // 检查角色是否存在
    const existingRole = roleOperations.getById(roleId);
    if (!existingRole) {
      return NextResponse.json({
        success: false,
        error: '角色不存在',
      }, { status: 404 });
    }

    // 检查是否为系统角色
    if (existingRole.is_system) {
      return NextResponse.json({
        success: false,
        error: '系统角色不能编辑',
      }, { status: 403 });
    }

    // 更新角色
    const success = roleOperations.update(roleId, {
      display_name: validatedData.display_name,
      description: validatedData.description,
    });

    if (!success) {
      return NextResponse.json({
        success: false,
        error: '更新角色失败',
      }, { status: 500 });
    }

    // 获取更新后的角色信息
    const updatedRole = roleOperations.getById(roleId);
    
    return NextResponse.json({
      success: true,
      message: '角色更新成功',
      role: updatedRole,
    });

  } catch (error) {
    console.error('更新角色失败:', error);
    
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
      error: '更新角色失败',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}, { required: true });

// 删除角色
export const DELETE = withAuth(async (request, context) => {
  try {
    const { id: roleId } = await context.params;
    
    if (!roleId) {
      return NextResponse.json({
        success: false,
        error: '角色ID无效',
      }, { status: 400 });
    }

    // 检查权限
    if (!canAccessResource(request.user!.permissions, 'roles', 'manage')) {
      return NextResponse.json({
        success: false,
        error: '权限不足',
      }, { status: 403 });
    }

    // 检查角色是否存在
    const role = roleOperations.getById(roleId);
    if (!role) {
      return NextResponse.json({
        success: false,
        error: '角色不存在',
      }, { status: 404 });
    }

    // 检查是否为系统角色
    if (role.is_system) {
      return NextResponse.json({
        success: false,
        error: '系统角色不能删除',
      }, { status: 403 });
    }

    // 删除角色
    const success = roleOperations.delete(roleId);
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: '删除角色失败',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '角色删除成功',
    });

  } catch (error) {
    console.error('删除角色失败:', error);
    
    return NextResponse.json({
      success: false,
      error: '删除角色失败',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}, { required: true });