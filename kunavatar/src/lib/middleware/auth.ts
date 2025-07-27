import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { rolePermissionOperations } from '@/lib/database';

// 认证中间件选项
export interface AuthMiddlewareOptions {
  required?: boolean; // 是否必须认证
  permissions?: string[]; // 需要的权限列表
  roles?: string[]; // 需要的角色列表
}

// 扩展NextRequest以包含用户信息
export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    username: string;
    email: string;
    roles: string[];
    permissions: string[];
  };
}

// 认证中间件
export async function authMiddleware(
  request: NextRequest,
  options: AuthMiddlewareOptions = { required: true }
): Promise<{ success: boolean; response?: NextResponse; user?: any }> {
  try {
    // 从Authorization头获取访问令牌
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (options.required) {
        return {
          success: false,
          response: NextResponse.json({
            success: false,
            error: '访问令牌不存在',
          }, { status: 401 })
        };
      }
      return { success: true };
    }

    const accessToken = authHeader.substring(7);
    
    // 验证访问令牌
    const verification = await AuthService.verifyAccessToken(accessToken);
    
    if (!verification.valid || !verification.user) {
      if (options.required) {
        return {
          success: false,
          response: NextResponse.json({
            success: false,
            error: verification.error || '访问令牌无效',
          }, { status: 401 })
        };
      }
      return { success: true };
    }

    const user = verification.user;
    
    // 获取用户权限
    const permissions = rolePermissionOperations.getUserPermissions(user.id);
    const userPermissions = permissions.map(p => p.name);
    
    // 检查权限
    if (options.permissions && options.permissions.length > 0) {
      const hasPermission = options.permissions.some(permission => 
        userPermissions.includes(permission)
      );
      
      if (!hasPermission) {
        return {
          success: false,
          response: NextResponse.json({
            success: false,
            error: '权限不足',
          }, { status: 403 })
        };
      }
    }

    // 检查角色（如果需要）
    if (options.roles && options.roles.length > 0) {
      // 这里可以添加角色检查逻辑
      // 暂时跳过，因为我们主要使用权限控制
    }

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        permissions: userPermissions,
      }
    };

  } catch (error) {
    console.error('认证中间件错误:', error);
    
    if (options.required) {
      return {
        success: false,
        response: NextResponse.json({
          success: false,
          error: '认证失败',
          message: error instanceof Error ? error.message : '未知错误',
        }, { status: 500 })
      };
    }
    
    return { success: true };
  }
}

// 权限检查辅助函数
export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  return userPermissions.includes(requiredPermission);
}

export function hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.some(permission => userPermissions.includes(permission));
}

export function hasAllPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.every(permission => userPermissions.includes(permission));
}

// 资源权限检查
export function canAccessResource(userPermissions: string[], resource: string, action: string): boolean {
  const permission = `${resource}:${action}`;
  const managePermission = `${resource}:manage`;
  
  return userPermissions.includes(permission) || userPermissions.includes(managePermission);
}

// 安全处理 API 路由参数
export async function safeGetParams<T = Record<string, string>>(
  params: Promise<T> | undefined
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    if (!params) {
      return {
        success: false,
        error: '无效的请求参数'
      };
    }
    
    const resolvedParams = await params;
    
    if (!resolvedParams) {
      return {
        success: false,
        error: '无效的请求参数'
      };
    }
    
    return {
      success: true,
      data: resolvedParams
    };
  } catch (error) {
    return {
      success: false,
      error: '参数解析失败'
    };
  }
}

// 创建受保护的API处理器
export function withAuth(
  handler: (request: AuthenticatedRequest, context: any) => Promise<NextResponse>,
  options: AuthMiddlewareOptions = { required: true }
) {
  return async (request: NextRequest, context?: any) => {
    const authResult = await authMiddleware(request, options);
    
    if (!authResult.success) {
      return authResult.response!;
    }

    // 将用户信息添加到请求对象
    const authenticatedRequest = request as AuthenticatedRequest;
    if (authResult.user) {
      authenticatedRequest.user = authResult.user;
    }

    return handler(authenticatedRequest, context);
  };
}
