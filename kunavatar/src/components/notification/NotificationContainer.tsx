'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { NotificationItem } from './NotificationItem';
import { Notification } from './types';

interface NotificationContainerProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxNotifications?: number;
}

export function NotificationContainer({
  notifications,
  onDismiss,
  position = 'top-right',
  maxNotifications = 5,
}: NotificationContainerProps) {
  // 限制显示的通知数量
  const visibleNotifications = notifications.slice(0, maxNotifications);

  // 根据位置获取容器样式
  const getContainerStyles = () => {
    const baseStyles = 'fixed z-50 flex flex-col gap-3 p-4 pointer-events-none';
    
    const positionStyles = {
      'top-right': 'top-8 right-0', // 向下偏移32px（h-8）避免被标题栏遮挡
      'top-left': 'top-8 left-0',   // 向下偏移32px（h-8）避免被标题栏遮挡
      'bottom-right': 'bottom-0 right-0',
      'bottom-left': 'bottom-0 left-0',
    };

    return `${baseStyles} ${positionStyles[position]}`;
  };

  // 根据位置决定通知堆叠顺序
  const orderedNotifications = position.includes('bottom') 
    ? [...visibleNotifications].reverse() 
    : visibleNotifications;

  // 居中弹窗样式
  const getCenterModalStyles = () =>
    'fixed z-[9999] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-auto';

  if (notifications.length === 0) {
    return null;
  }

  return (
    <>
      {/* 居中弹窗：操作类通知（带actions） */}
      <AnimatePresence>
        {notifications.filter(n => n.actions && n.actions.length > 0).map(notification => (
          <div key={notification.id} className={getCenterModalStyles()}>
            <NotificationItem
              notification={notification}
              onDismiss={onDismiss}
              position={position}
            />
          </div>
        ))}
      </AnimatePresence>
      {/* 右上/右下等普通通知 */}
      <div className={getContainerStyles()}>
        <AnimatePresence mode="popLayout">
          {orderedNotifications
            .filter(n => !(n.actions && n.actions.length > 0))
            .map((notification) => (
            <div key={notification.id} className="pointer-events-auto">
              <NotificationItem
                notification={notification}
                onDismiss={onDismiss}
                position={position}
              />
            </div>
          ))}
        </AnimatePresence>
        {/* 显示更多通知的指示器 */}
        {notifications.length > maxNotifications && (
          <div className="pointer-events-auto">
            <div className="bg-theme-background-secondary border border-theme-border rounded-xl p-3 shadow-lg backdrop-blur-sm">
              <p className="text-sm text-theme-foreground-muted text-center">
                还有 {notifications.length - maxNotifications} 条通知...
              </p>
              <button
                onClick={() => {
                  // 清除所有超出显示限制的通知
                  notifications.slice(maxNotifications).forEach(notification => {
                    onDismiss(notification.id);
                  });
                }}
                className="w-full mt-2 px-3 py-1.5 text-xs font-medium text-theme-foreground-muted hover:text-theme-foreground bg-theme-background-tertiary hover:bg-theme-card-hover rounded-lg transition-colors"
              >
                清除所有
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}