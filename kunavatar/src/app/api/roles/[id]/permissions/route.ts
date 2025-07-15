import { NextRequest, NextResponse } from 'next/server';
import { rolePermissionOperations, roleOperations, permissionOperations } from '@/lib/database';
import { withAuth, canAccessResource } from '@/lib/middleware/auth';
import { z } from 'zod';

// 权限分配请求验证模式
const PermissionAssignmentSchema = z.object({
  permissions: z.array(z.string()),
});

// 获取角色的权限列表
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

    // 检查角色是否存在
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
      permissions: permissions.map(permission => ({
        id: permission.id,
        name: permission.name,
        display_name: permission.display_name,
        description: permission.description,
        resource: permission.resource,
        action: permission.action,
      })),
    });

  } catch (error) {
    console.error('获取角色权限失败:', error);
    
    return NextResponse.json({
      success: false,
      error: '获取角色权限失败',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}, { required: true });

// 更新角色权限
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
    const { permissions } = PermissionAssignmentSchema.parse(body);

    // 检查角色是否存在
    const role = roleOperations.getById(roleId);
    if (!role) {
      return NextResponse.json({
        success: false,
        error: '角色不存在',
      }, { status: 404 });
    }

    // 检查是否为系统角色 - 只有拥有系统管理权限的用户才能修改系统角色
    if (role.is_system && !canAccessResource(request.user!.permissions, 'system', 'admin')) {
      return NextResponse.json({
        success: false,
        error: '只有系统管理员才能修改系统角色的权限',
      }, { status: 403 });
    }

    // 验证所有权限是否存在
    for (const permissionId of permissions) {
      const permission = permissionOperations.getById(permissionId);
      if (!permission) {
        return NextResponse.json({
          success: false,
          error: `权限 ${permissionId} 不存在`,
        }, { status: 400 });
      }
    }

    // 获取当前角色权限
    const currentPermissions = rolePermissionOperations.getRolePermissions(roleId);
    const currentPermissionIds = currentPermissions.map(p => p.id.toString());

    // 计算需要添加和移除的权限
    const toAdd = permissions.filter(id => !currentPermissionIds.includes(id));
    const toRemove = currentPermissionIds.filter(id => !permissions.includes(id));

    // 移除权限
    for (const permissionId of toRemove) {
      rolePermissionOperations.revokePermission(roleId, permissionId);
    }

    // 添加权限
    for (const permissionId of toAdd) {
      rolePermissionOperations.grantPermission(roleId, permissionId, request.user!.id);
    }

    // 获取更新后的权限列表
    const updatedPermissions = rolePermissionOperations.getRolePermissions(roleId);

    return NextResponse.json({
      success: true,
      message: '角色权限更新成功',
      permissions: updatedPermissions.map(permission => ({
        id: permission.id,
        name: permission.name,
        display_name: permission.display_name,
        resource: permission.resource,
        action: permission.action,
      })),
    });

  } catch (error) {
    console.error('更新角色权限失败:', error);
    
    return NextResponse.json({
      success: false,
      error: '更新角色权限失败',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}, { required: true });
