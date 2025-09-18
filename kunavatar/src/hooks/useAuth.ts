'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { safeNavigateToLogin } from '@/lib/security/url-validator';

interface User {
  id: string;
  username: string;
  email: string;
  roles: Array<{
    id: number;
    name: string;
    display_name: string;
  }>;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (token: string) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
  initialized: boolean; // 新增：标记是否已初始化
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useAuthState() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false); // 改为false，避免初始加载状态
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false); // 新增：标记是否已初始化

  const logout = async () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    
    // 使用安全导航函数跳转到登录页面
    const electronAPI = typeof window !== 'undefined' ? window.electronAPI : undefined;
    safeNavigateToLogin(100, electronAPI);
  };

  const login = (token: string) => {
    localStorage.setItem('accessToken', token);
    // 延迟一小段时间确保localStorage写入完成
    setTimeout(() => {
      checkAuth();
    }, 100);
  };

  // 尝试刷新token
  const refreshToken = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include', // 包含cookies
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.accessToken) {
          localStorage.setItem('accessToken', data.accessToken);
          return data.accessToken;
        }
      }
      return null;
    } catch (error) {
      console.error('Token刷新失败:', error);
      return null;
    }
  }, []);

  const checkAuth = useCallback(async (retryCount = 0, silent = false) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setUser(null);
      setLoading(false);
      setInitialized(true);
      return;
    }

    try {
      // 只有在非静默模式下才设置loading状态
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
          setError(null);
        } else {
          setError(data.error || '获取用户信息失败');
          setUser(null);
        }
      } else if (response.status === 401) {
        // Token 无效，尝试刷新
        console.log('Access token过期，尝试刷新...');
        const newToken = await refreshToken();
        
        if (newToken) {
          // 刷新成功，重新检查认证
          console.log('Token刷新成功，重新验证用户信息...');
          setTimeout(() => checkAuth(0, silent), 100);
          return;
        } else {
          // 刷新失败，清除token并登出
          console.log('Token刷新失败，用户需要重新登录');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setUser(null);
          setError(null);
        }
      } else {
        throw new Error(`认证检查失败: ${response.status}`);
      }
    } catch (error) {
      console.error('认证检查错误:', error);
      const errorMessage = error instanceof Error ? error.message : '认证检查失败';
      
      // 网络错误重试机制（最多重试1次）
      if (retryCount < 1 && (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch'))) {
        console.log(`认证检查重试 ${retryCount + 1}/1`);
        setTimeout(() => checkAuth(retryCount + 1, silent), 1000);
        return;
      }
      
      // 重试失败后清除token
      if (retryCount >= 1) {
        setError(errorMessage);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
      }
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [refreshToken]);

  useEffect(() => {
    // 初始化时静默检查认证状态
    checkAuth(0, true);
  }, [checkAuth]);

  return {
    user,
    loading,
    error,
    login,
    logout,
    checkAuth,
    initialized, // 暴露初始化状态
  };
}