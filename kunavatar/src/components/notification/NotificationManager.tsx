'use client';

import React from 'react';
import { useNotification } from './NotificationContext';
import { NotificationContainer } from './NotificationContainer';

interface NotificationManagerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxNotifications?: number;
}

export function NotificationManager({ 
  position = 'top-right',
  maxNotifications = 5 
}: NotificationManagerProps) {
  const { notifications, dismiss } = useNotification();

  return (
    <NotificationContainer
      notifications={notifications}
      onDismiss={dismiss}
      position={position}
      maxNotifications={maxNotifications}
    />
  );
} 