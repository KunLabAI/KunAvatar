'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useThemeToggle } from '@/theme/contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'button' | 'icon';
  showLabel?: boolean;
}

export function ThemeToggle({ 
  className = '', 
  size = 'md', 
  variant = 'button',
  showLabel = false 
}: ThemeToggleProps) {
  const { theme, toggleTheme, isDark } = useThemeToggle();

  // 尺寸配置
  const sizeConfig = {
    sm: {
      button: 'w-8 h-8',
      icon: 'w-4 h-4',
      text: 'text-xs'
    },
    md: {
      button: 'w-10 h-10',
      icon: 'w-5 h-5',
      text: 'text-sm'
    },
    lg: {
      button: 'w-12 h-12',
      icon: 'w-6 h-6',
      text: 'text-base'
    }
  };

  const config = sizeConfig[size];

  if (variant === 'icon') {
    return (
      <button
        onClick={toggleTheme}
        className={`
          ${config.button}
          flex items-center justify-center
          rounded-full
          bg-theme-background-tertiary hover:bg-theme-card-hover
          text-theme-foreground-muted hover:text-theme-foreground
          transition-all duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2
          focus:ring-offset-theme-background
          ${className}
        `}
        title={isDark ? '切换到浅色模式' : '切换到深色模式'}
        aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
      >
        <div className={`relative ${config.icon}`}>
          {/* 太阳图标 */}
          <Sun 
            className={`
              ${config.icon}
              absolute inset-0
              transition-all duration-300 ease-in-out
              ${isDark 
                ? 'opacity-0 rotate-90 scale-0' 
                : 'opacity-100 rotate-0 scale-100'
              }
            `}
          />
          {/* 月亮图标 */}
          <Moon 
            className={`
              ${config.icon}
              absolute inset-0
              transition-all duration-300 ease-in-out
              ${isDark 
                ? 'opacity-100 rotate-0 scale-100' 
                : 'opacity-0 -rotate-90 scale-0'
              }
            `}
          />
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`
        flex items-center gap-2 px-3 py-2
        rounded-lg
        bg-theme-background-tertiary hover:bg-theme-card-hover
        text-theme-foreground-secondary hover:text-theme-foreground
        transition-all duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2
        focus:ring-offset-theme-background
        ${config.text}
        ${className}
      `}
      title={isDark ? '切换到浅色模式' : '切换到深色模式'}
      aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
    >
      <div className="relative">
        {/* 太阳图标 */}
        <Sun 
          className={`
            ${config.icon}
            absolute inset-0
            transition-all duration-300 ease-in-out
            ${isDark 
              ? 'opacity-0 rotate-90 scale-0' 
              : 'opacity-100 rotate-0 scale-100'
            }
          `}
        />
        {/* 月亮图标 */}
        <Moon 
          className={`
            ${config.icon}
            absolute inset-0
            transition-all duration-300 ease-in-out
            ${isDark 
              ? 'opacity-100 rotate-0 scale-100' 
              : 'opacity-0 -rotate-90 scale-0'
            }
          `}
        />
      </div>
      
      {showLabel && (
        <span className="font-medium">
          {isDark ? '浅色' : '深色'}
        </span>
      )}
    </button>
  );
}

// 简化版主题切换开关
export function ThemeSwitch({ className = '' }: { className?: string }) {
  const { isDark, toggleTheme } = useThemeToggle();

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full
        transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2
        focus:ring-offset-theme-background
        ${isDark ? 'bg-theme-primary' : 'bg-theme-border-secondary'}
        ${className}
      `}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white
          transition-transform duration-200 ease-in-out
          ${isDark ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  );
}
