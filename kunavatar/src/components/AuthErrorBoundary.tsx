'use client';

import React, { Component, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { safeNavigate } from '@/lib/security/url-validator';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

// 错误显示组件
function AuthErrorDisplay({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const router = useRouter();

  const handleGoToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <div className="flex h-screen bg-theme-background items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-theme-foreground mb-4">认证错误</h2>
        <p className="text-theme-foreground-muted mb-6">
          {error.message.includes('401') || error.message.includes('认证') 
            ? '您的登录状态已过期，请重新登录' 
            : '发生了一个错误，请稍后重试'}
        </p>
        <div className="space-y-3">
          <button
            onClick={handleGoToLogin}
            className="w-full px-4 py-2 bg-theme-primary text-white rounded-md hover:bg-theme-primary-hover transition-colors"
          >
            前往登录
          </button>
          <button
            onClick={onRetry}
            className="w-full px-4 py-2 border border-theme-border text-theme-foreground rounded-md hover:bg-theme-background-secondary transition-colors"
          >
            重试
          </button>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-theme-foreground-muted hover:text-theme-foreground">
              错误详情 (开发模式)
            </summary>
            <pre className="mt-2 p-3 bg-theme-background-secondary rounded text-xs text-theme-foreground-muted overflow-auto">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // 只捕获认证相关的错误
    if (error.message.includes('401') || 
        error.message.includes('认证') || 
        error.message.includes('登录') ||
        error.message.includes('token')) {
      return { hasError: true, error };
    }
    // 其他错误继续抛出
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('认证错误边界捕获到错误:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    // 刷新页面重新尝试认证
    window.location.reload();
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return <AuthErrorDisplay error={this.state.error} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

// Hook版本的错误边界（用于函数组件）
export function useAuthErrorHandler() {
  const router = useRouter();

  const handleAuthError = (error: Error) => {
    console.error('认证错误:', error);
    
    // 如果是认证相关错误，跳转到登录页
    if (error.message.includes('401') || 
        error.message.includes('认证') || 
        error.message.includes('登录') ||
        error.message.includes('token')) {
      // 清除本地存储的认证信息
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      // 跳转到登录页面
      safeNavigate('/login?error=auth_expired', 100);
    }
  };

  return { handleAuthError };
}