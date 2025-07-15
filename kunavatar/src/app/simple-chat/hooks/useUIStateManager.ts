'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseUIStateManagerReturn {
  error: string | null;
  isInitializing: boolean;
  hasMinimumLoadTime: boolean;
  
  // 操作函数
  setError: (error: string | null) => void;
  setIsInitializing: (initializing: boolean) => void;
  dismissError: () => void;
  resetInitialization: () => void;
}

export function useUIStateManager(): UseUIStateManagerReturn {
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true); // 初始显示加载界面，避免闪屏
  const [hasMinimumLoadTime, setHasMinimumLoadTime] = useState(false); // 确保最小加载时间，避免闪屏

  // 确保最小加载时间，避免闪屏
  useEffect(() => {
    const minLoadTimer = setTimeout(() => {
      setHasMinimumLoadTime(true);
    }, 300); // 最小300ms加载时间
    
    return () => clearTimeout(minLoadTimer);
  }, []);

  // 关闭错误提示
  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  // 重置初始化状态
  const resetInitialization = useCallback(() => {
    setIsInitializing(true);
    setHasMinimumLoadTime(false);
  }, []);

  return {
    error,
    isInitializing,
    hasMinimumLoadTime,
    setError,
    setIsInitializing,
    dismissError,
    resetInitialization,
  };
} 