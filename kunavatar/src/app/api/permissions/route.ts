import { NextRequest, NextResponse } from 'next/server';
import { permissionOperations } from '@/lib/database';
import { withAuth, canAccessResource } from '@/lib/middleware/auth';

// 获取权限列表
export const GET = withAuth(async (request) => {
  try {
    // 检查权限
    if (!canAccessResource(request.user!.permissions, 'permissions', 'read')) {
      return NextResponse.json({
        success: false,
        error: '权限不足',
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const resource = searchParams.get('resource');

    // 获取权限列表
    let permissions;
    if (resource) {
      permissions = permissionOperations.getByResource(resource);
    } else {
      permissions = permissionOperations.getAll();
    }

    // 按资源分组权限
    const groupedPermissions = permissions.reduce((acc, permission) => {
      if (!acc[permission.resource]) {
        acc[permission.resource] = [];
      }
      acc[permission.resource].push(permission);
      return acc;
    }, {} as Record<string, typeof permissions>);

    return NextResponse.json({
      success: true,
      permissions,
      groupedPermissions,
    });

  } catch (error) {
    console.error('获取权限列表失败:', error);
    
    return NextResponse.json({
      success: false,
      error: '获取权限列表失败',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}, { required: true });
