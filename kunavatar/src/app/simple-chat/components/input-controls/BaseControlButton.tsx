'use client';

import React, { ReactNode } from 'react';

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
  statusIndicator?: {
    status: 'success' | 'error' | 'warning';
    position: 'top-right' | 'top-left';
    tooltip?: string;
  };
  children: ReactNode;
  className?: string;
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
  statusIndicator,
  children,
  className = '',
}: BaseControlButtonProps) {
  
  // 基础尺寸样式
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
  };

  // 变体样式 - 使用全局CSS变量
  const variantClasses = {
    default: disabled
      ? 'text-[var(--color-foreground-muted)] bg-[var(--color-background-secondary)] cursor-not-allowed opacity-60'
      : active
        ? 'text-[var(--color-primary)] bg-[var(--color-background)] hover:bg-[var(--color-card-hover)]'
        : 'text-[var(--color-foreground-secondary)] bg-[var(--color-background)] hover:bg-[var(--color-card-hover)]',
    primary: disabled
      ? 'text-[var(--color-foreground-muted)] bg-[var(--color-background-secondary)] cursor-not-allowed opacity-60'
      : 'text-[var(--color-primary)] bg-[var(--color-background)] hover:bg-[var(--color-card-hover)]',
    danger: disabled
      ? 'text-[var(--color-foreground-muted)] bg-[var(--color-background-secondary)] cursor-not-allowed opacity-60'
      : 'text-[var(--color-foreground-secondary)] bg-[var(--color-background)] hover:bg-[var(--color-card-hover)] hover:text-[var(--color-error)]',
  };

  const statusIndicatorColors = {
    success: 'bg-[var(--color-success)]',
    error: 'bg-[var(--color-error)]',
    warning: 'bg-[var(--color-warning)]',
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

  const statusPositions = {
    'top-right': '-top-0.5 -right-0.5',
    'top-left': '-top-0.5 -left-0.5',
  };

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`
          relative ${sizeClasses[size]} rounded-[var(--radius-lg)] transition-all duration-200 
          flex items-center justify-center ${variantClasses[variant]} ${className}
        `}
      >
        {/* Loading 动画 */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin" />
          </div>
        )}
        
        {/* 图标内容 */}
        <div className="relative z-10">
          {children}
        </div>
        
        {/* 数量徽章 */}
        {badge && badge.count > 0 && (
          <div className={`
            absolute ${badgePositions[badge.position]} min-w-[18px] h-[18px] 
            ${badgeColors[badge.color || 'blue']} text-white text-xs rounded-full 
            border-2 border-[var(--color-background)] z-20 flex items-center justify-center 
            px-1
          `}>
            {badge.count > 99 ? '99+' : badge.count}
          </div>
        )}
        
        {/* 状态指示器 */}
        {statusIndicator && (
          <div 
            className={`
              absolute ${statusPositions[statusIndicator.position]} w-3 h-3 rounded-full 
              border-2 border-[var(--color-background)] z-20 
              ${statusIndicatorColors[statusIndicator.status]}
            `}
            title={statusIndicator.tooltip}
          />
        )}
      </button>
      
      {/* 工具提示 */}
      {tooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-[var(--color-foreground)] text-[var(--color-background)] text-xs rounded-[var(--radius-md)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          {tooltip}
        </div>
      )}
    </div>
  );
}