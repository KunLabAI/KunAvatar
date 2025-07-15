'use client';

import { useEffect, useState } from 'react';
import { Theme, getSavedTheme, saveTheme, getSystemTheme, applyTheme } from '@/lib/theme';

// 主题持久化Hook
export function useThemePersistence() {
  const [theme, setTheme] = useState<Theme>('light');
  const [isHydrated, setIsHydrated] = useState(false);

  // 初始化主题
  useEffect(() => {
    const initTheme = () => {
      // 优先使用保存的主题，否则使用系统主题
      const savedTheme = getSavedTheme();
      const systemTheme = getSystemTheme();
      const initialTheme = savedTheme || systemTheme;
      
      setTheme(initialTheme);
      applyTheme(initialTheme);
      
      // 如果没有保存的主题，保存当前系统主题
      if (!savedTheme) {
        saveTheme(initialTheme);
      }
      
      setIsHydrated(true);
    };

    initTheme();
  }, []);

  // 监听系统主题变化
  useEffect(() => {
    if (!isHydrated) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // 只有在没有手动设置主题时才跟随系统主题
      const savedTheme = getSavedTheme();
      if (!savedTheme) {
        const newTheme = e.matches ? 'dark' : 'light';
        setTheme(newTheme);
        applyTheme(newTheme);
        saveTheme(newTheme);
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [isHydrated]);

  // 更新主题
  const updateTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
    saveTheme(newTheme);
  };

  // 切换主题
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    updateTheme(newTheme);
  };

  return {
    theme,
    setTheme: updateTheme,
    toggleTheme,
    isHydrated,
    isDark: theme === 'dark',
    isLight: theme === 'light',
  };
}

// 主题预加载Hook（防止闪烁）
export function useThemePreload() {
  useEffect(() => {
    // 在页面加载前预设主题，防止闪烁
    const preloadTheme = () => {
      const savedTheme = getSavedTheme();
      const systemTheme = getSystemTheme();
      const theme = savedTheme || systemTheme;
      
      // 立即应用主题类到html元素
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
    };

    // 如果是客户端环境，立即执行
    if (typeof window !== 'undefined') {
      preloadTheme();
    }
  }, []);
}

// 主题同步Hook（用于多标签页同步）
export function useThemeSync() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    // 监听localStorage变化（多标签页同步）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme' && e.newValue) {
        const newTheme = e.newValue as Theme;
        if (newTheme === 'light' || newTheme === 'dark') {
          setTheme(newTheme);
          applyTheme(newTheme);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return { theme };
}
