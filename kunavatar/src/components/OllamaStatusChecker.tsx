'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { useOllamaStatus } from '@/hooks/useOllamaStatus';
import OllamaNotification from './OllamaNotification';

const STORAGE_KEY = 'ollama-notification-session';

export default function OllamaStatusChecker() {
  const { user } = useAuth();
  const { status, checkOllamaStatus, isAvailable, isChecking } = useOllamaStatus();
  const [showNotification, setShowNotification] = useState(false);
  const [hasCheckedOnLogin, setHasCheckedOnLogin] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // 生成当前登录会话ID
  useEffect(() => {
    if (user && !currentSessionId) {
      const sessionId = `${user.id}-${Date.now()}`;
      setCurrentSessionId(sessionId);
    } else if (!user) {
      setCurrentSessionId(null);
    }
  }, [user, currentSessionId]);

  // 检查是否应该显示提示（基于当前登录会话）
  const shouldShowNotification = () => {
    if (!currentSessionId) return false;
    
    const dismissedSessionId = localStorage.getItem(STORAGE_KEY);
    // 如果没有记录或者记录的会话ID与当前不同，则应该显示提示
    return !dismissedSessionId || dismissedSessionId !== currentSessionId;
  };

  useEffect(() => {
    // 只有在用户登录且还没有检查过时才进行检测
    if (user && currentSessionId && !hasCheckedOnLogin && !isChecking) {
      setHasCheckedOnLogin(true);
      
      // 延迟一小段时间，确保页面加载完成
      const timer = setTimeout(() => {
        checkOllamaStatus().then(() => {
          // 检测完成后，如果Ollama不可用且应该显示提示，则显示
          if (!isAvailable && status.status === 'disconnected' && shouldShowNotification()) {
            setShowNotification(true);
          }
        });
      }, 2000); // 延迟时间，避免与登录流程冲突

      return () => clearTimeout(timer);
    }
  }, [user, currentSessionId, hasCheckedOnLogin, isChecking, checkOllamaStatus, isAvailable, status.status, shouldShowNotification]);

  // 监听状态变化，如果检测到Ollama不可用，显示提示
  useEffect(() => {
    if (hasCheckedOnLogin && !isAvailable && status.status === 'disconnected' && shouldShowNotification()) {
      setShowNotification(true);
    }
  }, [hasCheckedOnLogin, isAvailable, status.status, shouldShowNotification]);

  // 用户注销时重置状态
  useEffect(() => {
    if (!user) {
      setHasCheckedOnLogin(false);
      setShowNotification(false);
      setCurrentSessionId(null);
    }
  }, [user]);

  const handleRetry = async () => {
    await checkOllamaStatus();
    // 如果重新检测后Ollama可用，关闭提示
    if (isAvailable) {
      setShowNotification(false);
    }
  };

  const handleClose = () => {
    // 记录当前会话ID，表示本次登录不再提示
    if (currentSessionId) {
      localStorage.setItem(STORAGE_KEY, currentSessionId);
    }
    setShowNotification(false);
  };

  return (
    <OllamaNotification
      open={showNotification}
      onClose={handleClose}
      onRetry={handleRetry}
    />
  );
}