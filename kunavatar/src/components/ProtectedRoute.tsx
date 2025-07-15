'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import Loading from './Loading';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  requireAuth = true, 
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 只有在认证状态确定且需要认证但用户未登录时才跳转
    if (!loading && requireAuth && !user) {
      // 检查是否有token，如果没有token直接跳转
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.replace(redirectTo);
      }
    }
  }, [user, loading, requireAuth, redirectTo, router]);

  // 如果正在加载，显示加载状态
  if (loading) {
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

  // 如果需要认证但用户未登录，显示友好提示（这种情况应该很少见，因为会被重定向）
  if (requireAuth && !user) {
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