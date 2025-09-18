'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { safeNavigateToLogin } from '@/lib/security/url-validator';

/**
 * 处理认证错误的工具函数
 * 当遇到401错误时，清除本地存储的token并跳转到登录页面
 */
export function useAuthErrorHandler() {
  const router = useRouter();

  const handleAuthError = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    safeNavigateToLogin(100);
  }, []);

  return { handleAuthError };
}

/**
 * 检查响应状态并处理认证错误
 * @param response - fetch响应对象
 * @param handleAuthError - 认证错误处理函数
 * @returns 如果是401错误返回true，否则返回false
 */
export function checkAuthError(response: Response, handleAuthError: () => void): boolean {
  if (response.status === 401) {
    handleAuthError();
    return true;
  }
  return false;
}

/**
 * 通用的API请求错误处理函数
 * @param response - fetch响应对象
 * @param handleAuthError - 认证错误处理函数
 * @param errorMessage - 默认错误消息
 * @returns 处理后的错误信息或null（如果是401错误）
 */
export async function handleApiError(
  response: Response, 
  handleAuthError: () => void, 
  errorMessage: string = '请求失败'
): Promise<string | null> {
  if (checkAuthError(response, handleAuthError)) {
    return null; // 401错误已处理，返回null
  }

  try {
    const data = await response.json();
    return data.error || errorMessage;
  } catch {
    return errorMessage;
  }
}

/**
 * 带认证的fetch包装函数
 * 自动添加Authorization头
 * @param url - 请求URL
 * @param options - fetch选项
 * @returns Promise<Response>
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('accessToken');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(url, {
    ...options,
    headers,
  });
}