'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import Loading from './Loading';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  showLoadingOnAuth?: boolean; // 新增：是否在认证时显示加载界面
}

export function ProtectedRoute({ 
  children, 
  requireAuth = true, 
  redirectTo = '/login',
  showLoadingOnAuth = false // 默认不显示加载界面，实现隐式检测
}: ProtectedRouteProps) {
  const { user, loading, initialized } = useAuth();
  const router = useRouter();
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // 检查本地token状态
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    setHasToken(!!token);
  }, []);

  useEffect(() => {
    // 只有在认证状态确定且需要认证但用户未登录时才跳转
    if (initialized && requireAuth && !user && hasToken !== null) {
      // 如果没有token或认证失败，直接跳转
      if (!hasToken) {
        setIsRedirecting(true);
        router.replace(redirectTo);
      }
    }
  }, [user, initialized, requireAuth, redirectTo, router, hasToken]);

  // 如果正在重定向，不显示任何内容
  if (isRedirecting) {
    return null;
  }

  // 如果需要显示加载状态且正在加载
  if (showLoadingOnAuth && loading) {
    return (
      <div className="flex h-screen bg-theme-background items-center justify-center">
        <Loading 
          size="normal"
          text="正在验证身份..."
          showText={true}
          containerStyle={{
            padding: '3rem'
          }}
        />
      </div>
    );
  }

  // 如果还未初始化，根据是否有token决定是否显示内容
  if (!initialized) {
    // 如果有token，先显示内容，后台进行认证
    if (hasToken) {
      return <>{children}</>;
    }
    // 如果没有token且需要认证，不显示内容
    if (requireAuth) {
      return null;
    }
    // 如果不需要认证，直接显示内容
    return <>{children}</>;
  }

  // 如果正在加载但不需要显示加载界面，先渲染内容（隐式检测）
  if (loading) {
    // 如果有token，先显示内容，后台进行认证
    if (hasToken) {
      return <>{children}</>;
    }
    // 如果没有token且需要认证，不显示内容
    if (requireAuth) {
      return null;
    }
  }

  // 如果需要认证但用户未登录且已初始化，显示友好提示
  if (requireAuth && !user && initialized) {
    return (
      <div className="flex h-screen bg-theme-background items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto bg-theme-primary/10 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-theme-foreground mb-2">需要登录</h2>
          <p className="text-theme-foreground-muted mb-4">请登录后访问此页面</p>
          <p className="text-sm text-theme-foreground-muted">正在跳转到登录页面...</p>
        </div>
      </div>
    );
  }

  // 渲染受保护的内容
  return <>{children}</>;
}