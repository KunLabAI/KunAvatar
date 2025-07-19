'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { useRouter } from 'next/navigation';

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

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    // 使用 window.location.href 强制跳转，避免React Router状态问题
    setTimeout(() => {
      window.location.href = '/login';
    }, 100);
  };

  const login = (token: string) => {
    localStorage.setItem('accessToken', token);
    // 延迟一小段时间确保localStorage写入完成
    setTimeout(() => {
      checkAuth();
    }, 100);
  };

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
        // Token 无效，清除并设置状态
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
        setError(null); // 不显示错误，让页面自然跳转到登录
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
  }, []);

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