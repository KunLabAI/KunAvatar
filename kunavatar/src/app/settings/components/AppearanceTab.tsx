'use client';

import React, { useState, useEffect } from 'react';
import { Palette, Monitor, Sun, Moon, MessageSquare, Bot, Check, Minimize2 } from 'lucide-react';
import { useTheme } from '@/theme/contexts/ThemeContext';
import { ChatStyle, DisplaySize } from '@/app/chat/components/input-controls';
import { useUserSettings } from '@/contexts/UserSettingsContext';

interface AppearanceTabProps {
  // 可以接收一些props
}

export function AppearanceTab({}: AppearanceTabProps) {
  const { theme: contextTheme, setTheme: setContextTheme } = useTheme();
  const { settings, loading, error, updateSetting, updateAppearanceSettings } = useUserSettings();
  
  // 从用户设置中获取当前值
  const themePreference = settings.themePreference as 'light' | 'dark' | 'system';
  const colorTheme = settings.colorTheme;
  const chatStyle = settings.chatStyle as ChatStyle;
  const displaySize = settings.displaySize as DisplaySize;

  // 可用的颜色主题（从ColorThemeSwitcher移植）
  const colorThemes = [
    { name: 'kun', color: '#6a5ac2', displayName: '默认' },
    { name: 'green', color: '#7ED389', displayName: '翡翠绿' },
    { name: 'purple', color: '#6a5ac2', displayName: '优雅紫' },
    { name: 'orange', color: '#FE6734', displayName: '巨人橙' },
    { name: 'blue', color: '#284B7B', displayName: '伯克利蓝' },
    { name: 'raspberry', color: '#F56565', displayName: '葡萄柚' },
    { name: 'moonstone', color: '#61A0AF', displayName: '月长石' },
  ];

  // 当设置加载完成后，应用主题设置
  useEffect(() => {
    if (!loading && themePreference && typeof window !== 'undefined') {
      if (themePreference === 'system') {
        // 如果是系统主题，立即应用当前系统偏好
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setContextTheme(prefersDark ? 'dark' : 'light');
      } else {
        setContextTheme(themePreference);
      }
    }
  }, [loading, themePreference, setContextTheme]);

  // 应用颜色主题
  useEffect(() => {
    if (!loading && colorTheme && typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-color-theme', colorTheme);
    }
  }, [loading, colorTheme]);

  // 更新主题（使用用户设置系统）
  const updateTheme = async (newTheme: 'light' | 'dark' | 'system') => {
    // 确保在客户端环境中运行
    if (typeof window === 'undefined') {
      return;
    }
    
    // 立即更新UI
    if (newTheme === 'system') {
      // 检测系统主题偏好
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setContextTheme(prefersDark ? 'dark' : 'light');
      
      // 监听系统主题变化
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        setContextTheme(e.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', handleChange);
    } else {
      setContextTheme(newTheme);
    }
    
    // 保存到数据库
    await updateSetting('themePreference', newTheme);
  };

  // 更新颜色主题
  const updateColorTheme = async (themeName: string) => {
    // 确保在客户端环境中运行
    if (typeof document === 'undefined') {
      return;
    }
    
    // 立即更新UI
    document.documentElement.setAttribute('data-color-theme', themeName);
    
    // 保存到数据库
    await updateSetting('colorTheme', themeName);
  };

  // 更新聊天样式
  const updateChatStyle = async (style: ChatStyle) => {
    await updateSetting('chatStyle', style);
  };

  // 更新显示尺寸
  const updateDisplaySize = async (size: DisplaySize) => {
    await updateSetting('displaySize', size);
  };

  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <div className="bg-theme-background">
        <div className="space-y-6">
          <div className="bg-theme-card rounded-lg p-4 border border-theme-border">
            <div className="animate-pulse">
              <div className="h-4 bg-theme-background-secondary rounded w-1/4 mb-4"></div>
              <div className="space-y-3">
                <div className="h-3 bg-theme-background-secondary rounded"></div>
                <div className="h-3 bg-theme-background-secondary rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-theme-background">
      <div className="space-y-6">
        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-600 dark:text-red-400 text-sm">加载设置时出错: {error}</p>
          </div>
        )}
        
        {/* 标题 */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-theme-foreground flex items-center gap-2">
            <Palette className="w-5 h-5" />
            界面设置
          </h2>
        </div>
        
        {/* 主题设置 */}
        <div className="bg-theme-card rounded-lg p-4 border border-theme-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-theme-foreground mb-1">界面主题色</h3>
              <p className="text-sm text-theme-foreground-muted">选择浅色或深色主题</p>
            </div>
            <div className="flex gap-2">
              {[
                { value: 'light', label: '浅色', icon: Sun },
                { value: 'dark', label: '深色', icon: Moon },
                { value: 'system', label: '跟随系统', icon: Monitor }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => updateTheme(value as 'light' | 'dark' | 'system')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    themePreference === value
                      ? 'bg-theme-primary text-white'
                      : 'bg-theme-background border border-theme-border text-theme-foreground hover:bg-theme-background/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 颜色方案 */}
        <div className="bg-theme-card rounded-lg p-4 border border-theme-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-theme-foreground mb-1">元素主题色</h3>
              <p className="text-sm text-theme-foreground-muted">选择应用的主题色调</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {colorThemes.map((theme) => (
                <button
                  key={theme.name}
                  onClick={() => updateColorTheme(theme.name)}
                  title={theme.displayName}
                  className={`relative group w-8 h-8 rounded-full transition-all duration-200 ${colorTheme === theme.name ? 'transform scale-110 ring-2 ring-theme-primary ring-offset-2 ring-offset-theme-background' : 'hover:scale-110'}`}
                  style={{ 
                    backgroundColor: theme.color
                  }}
                >
                  <span className="absolute top-full mt-1 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md text-xs bg-gray-900/80 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none">
                    {theme.displayName}
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* 聊天样式设置 */}
        <div className="bg-theme-card rounded-lg p-4 border border-theme-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-theme-foreground mb-1">对话样式</h3>
              <p className="text-sm text-theme-foreground-muted">选择聊天界面的显示样式</p>
            </div>
            <div className="flex gap-2">
              {[
                { value: 'conversation', label: '对话模式', icon: MessageSquare },
                { value: 'assistant', label: '助手模式', icon: Bot }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => updateChatStyle(value as ChatStyle)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    chatStyle === value
                      ? 'bg-theme-primary text-white'
                      : 'bg-theme-background border border-theme-border text-theme-foreground hover:bg-theme-background/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}