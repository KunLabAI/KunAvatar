'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Theme, ThemeConfig, initializeTheme, applyTheme, saveTheme } from '@/lib/theme';

// 创建主题上下文
const ThemeContext = createContext<ThemeConfig | undefined>(undefined);

// 主题提供者组件属性
interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

// 主题提供者组件
export function ThemeProvider({ children, defaultTheme = 'light' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [isInitialized, setIsInitialized] = useState(false);

  // 设置主题的函数
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    saveTheme(newTheme);
  };

  // 切换主题的函数
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  // 初始化主题
  useEffect(() => {
    const initialTheme = initializeTheme();
    setThemeState(initialTheme);
    setIsInitialized(true);
  }, []);

  // 监听系统主题变化
  useEffect(() => {
    if (!isInitialized) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      // 只有在没有手动设置主题时才跟随系统主题
      const savedTheme = localStorage.getItem('theme');
      if (!savedTheme) {
        const systemTheme = e.matches ? 'dark' : 'light';
        setTheme(systemTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [isInitialized]);

  // 提供主题配置
  const themeConfig: ThemeConfig = {
    theme,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={themeConfig}>
      {children}
    </ThemeContext.Provider>
  );
}

// 使用主题的Hook
export function useTheme(): ThemeConfig {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
}

// 主题切换Hook（简化版本）
export function useThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  
  return {
    theme,
    toggleTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
  };
}
