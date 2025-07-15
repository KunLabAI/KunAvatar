export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number; // 毫秒，0表示不自动消失
  dismissible?: boolean;
  actions?: NotificationAction[];
  icon?: React.ReactNode;
  timestamp: number;
}

export interface NotificationConfig {
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
  actions?: NotificationAction[];
  icon?: React.ReactNode;
}

export interface NotificationContextType {
  notifications: Notification[];
  show: (config: NotificationConfig) => string;
  success: (title: string, message?: string, options?: Partial<NotificationConfig>) => string;
  error: (title: string, message?: string, options?: Partial<NotificationConfig>) => string;
  warning: (title: string, message?: string, options?: Partial<NotificationConfig>) => string;
  info: (title: string, message?: string, options?: Partial<NotificationConfig>) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
} 