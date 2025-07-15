import { NextRequest, NextResponse } from 'next/server';
import { userOperations, userRoleOperations, roleOperations } from '@/lib/database';
import { withAuth, canAccessResource } from '@/lib/middleware/auth';
import { z } from 'zod';

// 角色分配请求验证模式
const AssignRoleSchema = z.object({
  roleId: z.string().uuid(),
});

const RemoveRoleSchema = z.object({
  roleId: z.string().uuid(),
});

const UpdateRolesSchema = z.object({
  roles: z.array(z.string().uuid()),
});

// 获取用户角色
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

    // 检查权限
    if (!canAccessResource(request.user!.permissions, 'users', 'read')) {
      return NextResponse.json({
        success: false,
        error: '权限不足',
      }, { status: 403 });
    }

    // 检查用户是否存在
    const user = userOperations.getById(id);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: '用户不存在',
      }, { status: 404 });
    }

    // 获取用户角色
    const roles = userRoleOperations.getUserRoles(id);

    return NextResponse.json({
      success: true,
      roles: roles.map(role => ({
        id: role.id,
        name: role.name,
        display_name: role.display_name,
        description: role.description,
        is_system: role.is_system,
      })),
    });

  } catch (error) {
    console.error('获取用户角色失败:', error);
    
    return NextResponse.json({
      success: false,
      error: '获取用户角色失败',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}, { required: true });

// 分配角色给用户
export const POST = withAuth(async (request, context) => {
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
    if (!canAccessResource(request.user!.permissions, 'users', 'update')) {
      return NextResponse.json({
        success: false,
        error: '权限不足',
      }, { status: 403 });
    }

    const body = await request.json();
    const { roleId } = AssignRoleSchema.parse(body);

    // 检查用户是否存在
    const user = userOperations.getById(id);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: '用户不存在',
      }, { status: 404 });
    }

    // 检查角色是否存在
    const role = roleOperations.getById(roleId);
    if (!role) {
      return NextResponse.json({
        success: false,
        error: '角色不存在',
      }, { status: 404 });
    }

    // 检查用户是否已有该角色
    const hasRole = userRoleOperations.hasRole(id, roleId);
    if (hasRole) {
      return NextResponse.json({
        success: false,
        error: '用户已拥有该角色',
      }, { status: 409 });
    }

    // 分配角色
    const success = userRoleOperations.assignRole(id, roleId, request.user!.id);
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: '角色分配失败',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: '角色分配成功',
    });

  } catch (error) {
    console.error('分配角色失败:', error);
    
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
      error: '分配角色失败',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}, { required: true });

// 移除用户角色
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
    if (!canAccessResource(request.user!.permissions, 'users', 'update')) {
      return NextResponse.json({
        success: false,
        error: '权限不足',
      }, { status: 403 });
    }

    const body = await request.json();
    const { roleId } = RemoveRoleSchema.parse(body);

    // 检查用户是否存在
    const user = userOperations.getById(id);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: '用户不存在',
      }, { status: 404 });
    }

    // 检查角色是否存在
    const role = roleOperations.getById(roleId);
    if (!role) {
      return NextResponse.json({
        success: false,
        error: '角色不存在',
      }, { status: 404 });
    }

    // 检查用户是否有该角色
    const hasRole = userRoleOperations.hasRole(id, roleId);
    if (!hasRole) {
      return NextResponse.json({
        success: false,
        error: '用户没有该角色',
      }, { status: 404 });
    }

    // 移除角色
    const success = userRoleOperations.removeRole(id, roleId);
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: '角色移除失败',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: '角色移除成功',
    });

  } catch (error) {
    console.error('移除角色失败:', error);
    
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
      error: '移除角色失败',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}, { required: true });

// 批量更新用户角色
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

    // 检查权限
    if (!canAccessResource(request.user!.permissions, 'users', 'update')) {
      return NextResponse.json({
        success: false,
        error: '权限不足',
      }, { status: 403 });
    }

    const body = await request.json();
    const { roles } = UpdateRolesSchema.parse(body);

    // 检查用户是否存在
    const user = userOperations.getById(id);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: '用户不存在',
      }, { status: 404 });
    }

    // 获取当前用户角色
    const currentRoles = userRoleOperations.getUserRoles(id);
    const currentRoleIds = currentRoles.map(role => role.id);

    // 移除不在新角色列表中的角色
    for (const roleId of currentRoleIds) {
      if (!roles.includes(roleId)) {
        userRoleOperations.removeRole(id, roleId);
      }
    }

    // 添加新角色
    for (const roleId of roles) {
      if (!currentRoleIds.includes(roleId)) {
        // 检查角色是否存在
        const role = roleOperations.getById(roleId);
        if (role) {
          userRoleOperations.assignRole(id, roleId, request.user!.id);
        }
      }
    }

    // 获取更新后的角色列表
    const updatedRoles = userRoleOperations.getUserRoles(id);

    return NextResponse.json({
      success: true,
      message: '用户角色更新成功',
      roles: updatedRoles.map(role => ({
        id: role.id,
        name: role.name,
        display_name: role.display_name,
        description: role.description,
        is_system: role.is_system,
      })),
    });

  } catch (error) {
    console.error('更新用户角色失败:', error);
    
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
      error: '更新用户角色失败',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}, { required: true });
