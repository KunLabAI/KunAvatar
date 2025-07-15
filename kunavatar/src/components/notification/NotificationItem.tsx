'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  X 
} from 'lucide-react';
import { Notification, NotificationType } from './types';

interface NotificationItemProps {
  notification: Notification;
  onDismiss: (id: string) => void;
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function NotificationItem({ 
  notification, 
  onDismiss,
  position 
}: NotificationItemProps) {
  // 自动消失逻辑
  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(notification.id);
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, [notification.duration, notification.id, onDismiss]);

  // 图标映射
  const getIcon = (type: NotificationType) => {
    const defaultIcons = {
      success: CheckCircle,
      error: AlertCircle,
      warning: AlertTriangle,
      info: Info,
    };

    if (notification.icon) {
      return notification.icon;
    }

    const IconComponent = defaultIcons[type];
    return <IconComponent className="w-5 h-5" />;
  };

  // 样式配置
  const getStyles = (type: NotificationType) => {
    const styles = {
      success: {
        container: 'bg-[var(--color-background-secondary)] border border-[var(--color-success)]',
        icon: 'text-[var(--color-success)]',
        title: 'text-[var(--color-foreground)]',
        message: 'text-[var(--color-foreground-muted)]',
      },
      error: {
        container: 'bg-[var(--color-background-secondary)] border border-[var(--color-error)]',
        icon: 'text-[var(--color-error)]',
        title: 'text-[var(--color-foreground)]',
        message: 'text-[var(--color-foreground-muted)]',
      },
      warning: {
        container: 'bg-[var(--color-background-secondary)] border border-[var(--color-warning)]',
        icon: 'text-[var(--color-warning)]',
        title: 'text-[var(--color-foreground)]',
        message: 'text-[var(--color-foreground-muted)]',
      },
      info: {
        container: 'bg-[var(--color-background-secondary)] border border-[var(--color-info)]',
        icon: 'text-[var(--color-info)]',
        title: 'text-[var(--color-foreground)]',
        message: 'text-[var(--color-foreground-muted)]',
      },
    };
    return styles[type];
  };

  // 动画变体
  const getAnimationVariants = () => {
    const isRight = position.includes('right');
    const isTop = position.includes('top');

    return {
      initial: {
        opacity: 0,
        x: isRight ? 300 : -300,
        y: isTop ? -20 : 20,
        scale: 0.9,
      },
      animate: {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
      },
      exit: {
        opacity: 0,
        x: isRight ? 300 : -300,
        scale: 0.9,
        transition: {
          duration: 0.2,
        },
      },
    };
  };

  const styles = getStyles(notification.type);
  const icon = getIcon(notification.type);

  return (
    <motion.div
      layout
      variants={getAnimationVariants()}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
      }}
      className="w-full max-w-sm"
    >
      <div className={`
        relative p-4 rounded-lg border shadow-sm
        transition-all duration-200
        ${styles.container}
      `}>
        <div className="flex items-start gap-3">
          {/* 图标 */}
          <div className={`flex-shrink-0 ${styles.icon}`}>
            {icon}
          </div>
          
          {/* 内容 */}
          <div className="flex-1 min-w-0">
            <h4 className={`text-sm font-semibold ${styles.title}`}>
              {notification.title}
            </h4>
            
            {notification.message && (
              <p className={`text-sm mt-1 ${styles.message}`}>
                {notification.message}
              </p>
            )}

            {/* 操作按钮 */}
            {notification.actions && notification.actions.length > 0 && (
              <div className="flex gap-2 mt-3">
                {notification.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.onClick}
                    className={`
                      px-3 py-1.5 text-xs font-medium rounded-md border transition-colors
                      ${action.variant === 'primary' 
                        ? `${styles.icon} border-[var(--color-border)] bg-[var(--color-background-tertiary)] hover:bg-[var(--color-card-hover)]` 
                        : 'text-[var(--color-foreground-muted)] border border-transparent hover:bg-[var(--color-background-tertiary)]'
                      }
                    `}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 关闭按钮 */}
          {notification.dismissible !== false && (
            <button
              onClick={() => onDismiss(notification.id)}
              className={`
                flex-shrink-0 p-1 rounded-md transition-colors
                text-[var(--color-foreground-muted)] hover:bg-[var(--color-background-tertiary)]
              `}
              aria-label="关闭通知"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 进度条（如果有持续时间） */}
        {notification.duration && notification.duration > 0 && (
          <motion.div
            className={`absolute bottom-0 left-0 h-1 rounded-bl-lg ${styles.icon} bg-current/20`}
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ 
              duration: notification.duration / 1000, 
              ease: 'linear' 
            }}
          />
        )}
      </div>
    </motion.div>
  );
} 