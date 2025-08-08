'use client';

import React, { ReactNode, useEffect } from 'react';

interface BaseControlButtonProps {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  loading?: boolean;
  variant?: 'default' | 'primary' | 'danger';
  size?: 'sm' | 'md';
  tooltip?: string;
  badge?: {
    count: number;
    position: 'top-left' | 'top-right';
    color?: 'blue' | 'red' | 'green';
  };
  children: ReactNode;
  className?: string;
  // 新增：ESC键关闭支持
  enableEscClose?: boolean;
  onEscClose?: () => void;
}

export function BaseControlButton({
  onClick,
  disabled = false,
  active = false,
  loading = false,
  variant = 'default',
  size = 'md',
  tooltip,
  badge,
  children,
  className = '',
  enableEscClose = false,
  onEscClose,
}: BaseControlButtonProps) {
  
  // ESC键监听 - 只在按钮激活且启用ESC关闭时生效
  useEffect(() => {
    if (!enableEscClose || !active || !onEscClose) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onEscClose();
      }
    };
    
    // 添加全局键盘监听，使用较低优先级（非capture模式）
    // 这样ToolSettings的ESC处理会优先执行
    document.addEventListener('keydown', handleKeyDown, false);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, false);
    };
  }, [enableEscClose, active, onEscClose]);
  
  // 现代化尺寸样式
  const sizeClasses = {
    sm: 'w-9 h-9',
    md: 'w-10 h-10',
  };

  // 操作区域图标样式 - 使用全局CSS变量
  const variantClasses = {
    default: disabled
      ? 'text-[var(--color-foreground-muted)] cursor-not-allowed opacity-50'
      : active
        ? 'text-[var(--color-primary)] hover:bg-[var(--color-background)] '
        : 'text-[var(--color-foreground-secondary)] hover:bg-[var(--color-background)]',
    primary: disabled
      ? 'text-[var(--color-foreground-muted)] bg-[var(--color-background-tertiary)] cursor-not-allowed opacity-50'
      : 'text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]',
    danger: disabled
      ? 'text-[var(--color-foreground-muted)] cursor-not-allowed opacity-50'
      : 'text-[var(--color-error)] hover:bg-[var(--color-background)] hover:text-[var(--color-error)]',
  };

  const badgeColors = {
    blue: 'bg-[var(--color-info)]',
    red: 'bg-[var(--color-error)]',
    green: 'bg-[var(--color-success)]',
  };

  const badgePositions = {
    'top-left': '-top-1 -left-1',
    'top-right': '-top-1 -right-1',
  };

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`
          relative ${sizeClasses[size]} rounded-xl transition-all duration-200 
          flex items-center justify-center ${variantClasses[variant]} ${className}
        `}
      >
        
        {/* 图标内容 */}
        <div className={`relative z-10 ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}>
          {children}
        </div>
        
        {/* 数量徽章 - 现代化样式 */}
        {badge && badge.count > 0 && (
          <div className={`
            absolute ${badgePositions[badge.position]} min-w-[18px] h-[18px] 
            ${badgeColors[badge.color || 'blue']} text-white text-xs rounded-full 
            border-2 border-[var(--color-card)] z-20 flex items-center justify-center 
            px-1 font-medium
          `}>
            {badge.count > 99 ? '99+' : badge.count}
          </div>
        )}

      </button>
      
      {/* 工具提示 - 主题色样式 */}
      {tooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[var(--color-card)] text-[var(--color-foreground)] text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-[9999] shadow-lg">
          {tooltip}
          {/* 工具提示箭头 */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-transparent border-t-[var(--color-card)]"></div>
        </div>
      )}
    </div>
  );
}