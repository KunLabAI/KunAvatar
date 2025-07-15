import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { userRoleOperations, rolePermissionOperations } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // 从Authorization头获取访问令牌
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: '访问令牌不存在',
      }, { status: 401 });
    }

    const accessToken = authHeader.substring(7);
    
    // 验证访问令牌
    const verification = await AuthService.verifyAccessToken(accessToken);
    
    if (!verification.valid || !verification.user) {
      return NextResponse.json({
        success: false,
        error: verification.error || '访问令牌无效',
      }, { status: 401 });
    }

    const user = verification.user;
    
    // 获取用户角色
    const roles = userRoleOperations.getUserRoles(user.id);
    
    // 获取用户权限
    const permissions = rolePermissionOperations.getUserPermissions(user.id);
    
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
}
