'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UserRole {
  id: number;
  name: string;
  display_name: string;
}

interface UserPermissions {
  isAdmin: boolean;
  roles: UserRole[];
  loading: boolean;
  error: string | null;
}

export function useUserPermissions(): UserPermissions {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkUserPermissions = async () => {
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
            // 认证失败，清除token并跳转到登录页面
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            router.push('/login');
            return;
          }
          throw new Error('获取用户信息失败');
        }

        const data = await response.json();
        
        if (data.success && data.user) {
          const userRoles = data.user.roles || [];
          setRoles(userRoles);
          
          // 检查是否为管理员（角色名称为 'admin' 或显示名称包含 '管理员'）
          const adminRole = userRoles.find((role: UserRole) => 
            role.name === 'admin' || 
            role.display_name.includes('管理员') ||
            role.name === 'administrator'
          );
          
          setIsAdmin(!!adminRole);
        } else {
          setError(data.error || '获取用户信息失败');
        }
      } catch (err) {
        console.error('权限检查失败:', err);
        setError(err instanceof Error ? err.message : '权限检查失败');
      } finally {
        setLoading(false);
      }
    };

    checkUserPermissions();
  }, [router]);

  return {
    isAdmin,
    roles,
    loading,
    error,
  };
}