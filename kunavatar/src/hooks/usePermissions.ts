'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Permission {
  id: number;
  name: string;
  display_name: string;
  resource: string;
  action: string;
}

interface Role {
  id: number;
  name: string;
  display_name: string;
}

interface UserPermissions {
  permissions: Permission[];
  roles: Role[];
  loading: boolean;
  error: string | null;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  canAccessResource: (resource: string, action: string) => boolean;
  isAdmin: boolean;
}

export function usePermissions(): UserPermissions {
  const router = useRouter();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserPermissions = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('accessToken');
        
        if (!token) {
          setError('未登录');
          return;
        }

        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            router.push('/login');
            return;
          }
          throw new Error('获取用户权限失败');
        }

        const data = await response.json();
        
        if (data.success && data.user) {
          setPermissions(data.user.permissions || []);
          setRoles(data.user.roles || []);
        } else {
          setError(data.error || '获取用户权限失败');
        }
      } catch (err) {
        console.error('权限检查失败:', err);
        setError(err instanceof Error ? err.message : '权限检查失败');
      } finally {
        setLoading(false);
      }
    };

    fetchUserPermissions();
  }, [router]);

  // 检查是否有指定权限
  const hasPermission = (permission: string): boolean => {
    return permissions.some(p => p.name === permission);
  };

  // 检查是否有任意一个权限
  const hasAnyPermission = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.some(permission => hasPermission(permission));
  };

  // 检查是否有所有权限
  const hasAllPermissions = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.every(permission => hasPermission(permission));
  };

  // 检查是否可以访问资源
  const canAccessResource = (resource: string, action: string): boolean => {
    const permission = `${resource}:${action}`;
    const managePermission = `${resource}:manage`;
    
    return hasPermission(permission) || hasPermission(managePermission);
  };

  // 检查是否为管理员
  const isAdmin = roles.some(role => 
    role.name === 'admin' || 
    role.display_name.includes('管理员') ||
    role.name === 'administrator' ||
    role.name === 'superadmin'
  );

  return {
    permissions,
    roles,
    loading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessResource,
    isAdmin,
  };
}
