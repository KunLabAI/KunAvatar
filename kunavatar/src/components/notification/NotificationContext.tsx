'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Notification, NotificationConfig, NotificationContextType } from './types';

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: React.ReactNode;
  maxNotifications?: number;
  defaultDuration?: number;
}

export function NotificationProvider({ 
  children, 
  maxNotifications = 10,
  defaultDuration = 4000 
}: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // 生成唯一ID
  const generateId = useCallback(() => {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // 添加通知
  const show = useCallback((config: NotificationConfig): string => {
    const id = generateId();
    const notification: Notification = {
      id,
      type: config.type,
      title: config.title,
      message: config.message,
      duration: config.duration ?? defaultDuration,
      dismissible: config.dismissible ?? true,
      actions: config.actions,
      icon: config.icon,
      timestamp: Date.now(),
    };

    setNotifications(prev => {
      const newNotifications = [notification, ...prev];
      // 限制通知数量，移除最旧的通知
      return newNotifications.slice(0, maxNotifications);
    });

    return id;
  }, [generateId, defaultDuration, maxNotifications]);

  // 便捷方法
  const success = useCallback((
    title: string, 
    message?: string, 
    options?: Partial<NotificationConfig>
  ): string => {
    return show({
      type: 'success',
      title,
      message,
      ...options,
    });
  }, [show]);

  const error = useCallback((
    title: string, 
    message?: string, 
    options?: Partial<NotificationConfig>
  ): string => {
    return show({
      type: 'error',
      title,
      message,
      duration: options?.duration ?? 6000, // 错误通知默认显示更长时间
      ...options,
    });
  }, [show]);

  const warning = useCallback((
    title: string, 
    message?: string, 
    options?: Partial<NotificationConfig>
  ): string => {
    return show({
      type: 'warning',
      title,
      message,
      ...options,
    });
  }, [show]);

  const info = useCallback((
    title: string, 
    message?: string, 
    options?: Partial<NotificationConfig>
  ): string => {
    return show({
      type: 'info',
      title,
      message,
      ...options,
    });
  }, [show]);

  // 移除指定通知
  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // 清除所有通知
  const dismissAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const value: NotificationContextType = useMemo(() => ({
    notifications,
    show,
    success,
    error,
    warning,
    info,
    dismiss,
    dismissAll,
  }), [notifications, show, success, error, warning, info, dismiss, dismissAll]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// Hook for using notifications
export function useNotification(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}