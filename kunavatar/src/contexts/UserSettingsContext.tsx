'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';

interface UserSettings {
  themePreference: string;
  colorTheme: string;
  chatStyle: string;
  displaySize: string;
}

interface UserSettingsContextType {
  settings: UserSettings;
  loading: boolean;
  error: string | null;
  updateSetting: (key: string, value: string) => Promise<boolean>;
  updateAppearanceSettings: (settings: Partial<UserSettings>) => Promise<boolean>;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: UserSettings = {
  themePreference: 'system',
  colorTheme: 'kun',
  chatStyle: 'assistant',
  displaySize: 'fullscreen'
};

const UserSettingsContext = createContext<UserSettingsContextType | undefined>(undefined);

interface UserSettingsProviderProps {
  children: ReactNode;
}

export function UserSettingsProvider({ children }: UserSettingsProviderProps) {
  const { checkAuth } = useAuth();
  // 优化：先从localStorage读取初始值，避免闪屏
  const [settings, setSettings] = useState<UserSettings>(() => {
    // 尝试从localStorage获取初始设置，避免默认值导致的闪屏
    try {
      return {
        themePreference: localStorage.getItem('theme-preference') || defaultSettings.themePreference,
        colorTheme: localStorage.getItem('color-theme') || defaultSettings.colorTheme,
        chatStyle: localStorage.getItem('simple-chat-style') || defaultSettings.chatStyle,
        displaySize: localStorage.getItem('simple-chat-display-size') || defaultSettings.displaySize
      };
    } catch {
      return defaultSettings;
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  
  // 缓存时间：1小时（减少缓存时间，确保设置更及时更新）
  const CACHE_DURATION = 60 * 60 * 1000;

  // 处理认证失败的辅助函数
  const handleAuthFailure = useCallback(async (response: any) => {
    if (response.error === '认证失败，请重新登录') {
      console.log('检测到认证失败，尝试刷新token...');
      await checkAuth();
      return true; // 表示需要重试
    }
    return false;
  }, [checkAuth]);

  // 获取用户设置
  const fetchSettings = useCallback(async (forceRefresh = false) => {
    // 确保在客户端环境中运行
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      // 检查缓存是否有效
      const now = Date.now();
      const cacheTime = localStorage.getItem('user-settings-cache-time');
      const lastCacheTime = cacheTime ? parseInt(cacheTime) : 0;
      
      if (!forceRefresh && isInitialized && (now - lastCacheTime) < CACHE_DURATION) {
        return;
      }

      // 如果已经初始化过，不要再显示loading状态，避免界面抖动
      if (!isInitialized) {
        setLoading(true);
      }
      setError(null);
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        // 如果没有token，使用本地存储的设置作为后备
        const localSettings = {
          themePreference: localStorage.getItem('theme-preference') || 'system',
          colorTheme: localStorage.getItem('color-theme') || 'kun',
          chatStyle: localStorage.getItem('simple-chat-style') || 'assistant',
          displaySize: localStorage.getItem('simple-chat-display-size') || 'fullscreen'
        };
        setSettings(localSettings);
        setLoading(false);
        setIsInitialized(true);
        setLastFetchTime(now);
        return;
      }

      let response = await apiClient.get('/api/user-settings?category=appearance');

      // 如果认证失败，尝试刷新token后重试
      if (!response.success) {
        const shouldRetry = await handleAuthFailure(response);
        if (shouldRetry) {
          console.log('Token刷新后重试获取设置...');
          response = await apiClient.get('/api/user-settings?category=appearance');
        }
      }

      if (response.success && response.data?.settings) {
        // 只有当设置真正发生变化时才更新，减少不必要的重新渲染
        const newSettings = response.data.settings;
        setSettings(prevSettings => {
          const hasChanged = Object.keys(newSettings).some(
            key => prevSettings[key as keyof UserSettings] !== newSettings[key]
          );
          return hasChanged ? newSettings : prevSettings;
        });
        setLastFetchTime(now);
        
        // 保存缓存时间到localStorage
        localStorage.setItem('user-settings-cache-time', now.toString());
      } else {
        // 获取失败，使用本地存储作为后备
        console.log('获取服务器设置失败，使用本地设置:', response.error);
        const localSettings = {
          themePreference: localStorage.getItem('theme-preference') || 'system',
          colorTheme: localStorage.getItem('color-theme') || 'kun',
          chatStyle: localStorage.getItem('simple-chat-style') || 'assistant',
          displaySize: localStorage.getItem('simple-chat-display-size') || 'fullscreen'
        };
        setSettings(localSettings);
        setLastFetchTime(now);
      }
    } catch (err) {
      console.error('获取用户设置失败:', err);
      setError(err instanceof Error ? err.message : '获取设置失败');
      
      // 使用本地存储作为后备
      if (typeof window !== 'undefined') {
        const localSettings = {
          themePreference: localStorage.getItem('theme-preference') || 'system',
          colorTheme: localStorage.getItem('color-theme') || 'kun',
          chatStyle: localStorage.getItem('simple-chat-style') || 'assistant',
          displaySize: localStorage.getItem('simple-chat-display-size') || 'fullscreen'
        };
        setSettings(localSettings);
      }
      setLastFetchTime(Date.now());
    } finally {
      setLoading(false);
      setIsInitialized(true);
    }
  }, [isInitialized, CACHE_DURATION, handleAuthFailure]);

  // 更新单个设置
  const updateSetting = useCallback(async (key: string, value: string): Promise<boolean> => {
    try {
      // 确保在客户端环境中运行
      if (typeof window === 'undefined') {
        return false;
      }
      
      const token = localStorage.getItem('accessToken');
      
      // 先更新本地状态
      setSettings(prev => ({ ...prev, [key]: value }));
      
      // 同时更新本地存储作为后备
      const localStorageKey = {
        themePreference: 'theme-preference',
        colorTheme: 'color-theme',
        chatStyle: 'simple-chat-style',
        displaySize: 'simple-chat-display-size'
      }[key];
      
      if (localStorageKey) {
        localStorage.setItem(localStorageKey, value);
      }
      
      if (!token) {
        // 如果没有token，只更新本地存储
        return true;
      }

      let response = await apiClient.post('/api/user-settings', {
        key: {
          themePreference: 'theme-preference',
          colorTheme: 'color-theme',
          chatStyle: 'chat-style',
          displaySize: 'display-size'
        }[key] || key,
        value,
        category: 'appearance'
      });

      // 如果认证失败，尝试刷新token后重试
      if (!response.success) {
        const shouldRetry = await handleAuthFailure(response);
        if (shouldRetry) {
          console.log('Token刷新后重试更新设置...');
          response = await apiClient.post('/api/user-settings', {
            key: {
              themePreference: 'theme-preference',
              colorTheme: 'color-theme',
              chatStyle: 'chat-style',
              displaySize: 'display-size'
            }[key] || key,
            value,
            category: 'appearance'
          });
        }
      }

      if (response.success) {
        // 更新缓存时间
        setLastFetchTime(Date.now());
        return response.success;
      } else {
        console.error('更新设置失败:', response.error);
        return false;
      }
    } catch (err) {
      console.error('更新设置失败:', err);
      return false;
    }
  }, [handleAuthFailure]);

  // 批量更新界面设置
  const updateAppearanceSettings = useCallback(async (newSettings: Partial<UserSettings>): Promise<boolean> => {
    try {
      // 确保在客户端环境中运行
      if (typeof window === 'undefined') {
        return false;
      }
      
      const token = localStorage.getItem('accessToken');
      
      // 先更新本地状态
      setSettings(prev => ({ ...prev, ...newSettings }));
      
      // 同时更新本地存储作为后备
      Object.entries(newSettings).forEach(([key, value]) => {
        const localStorageKey = {
          themePreference: 'theme-preference',
          colorTheme: 'color-theme',
          chatStyle: 'simple-chat-style',
          displaySize: 'simple-chat-display-size'
        }[key];
        
        if (localStorageKey && value) {
          localStorage.setItem(localStorageKey, value);
        }
      });
      
      if (!token) {
        // 如果没有token，只更新本地存储
        return true;
      }

      let response = await apiClient.post('/api/user-settings', {
        appearance: {
          themePreference: newSettings.themePreference,
          colorTheme: newSettings.colorTheme,
          chatStyle: newSettings.chatStyle,
          displaySize: newSettings.displaySize
        }
      });

      // 如果认证失败，尝试刷新token后重试
      if (!response.success) {
        const shouldRetry = await handleAuthFailure(response);
        if (shouldRetry) {
          console.log('Token刷新后重试批量更新设置...');
          response = await apiClient.post('/api/user-settings', {
            appearance: {
              themePreference: newSettings.themePreference,
              colorTheme: newSettings.colorTheme,
              chatStyle: newSettings.chatStyle,
              displaySize: newSettings.displaySize
            }
          });
        }
      }

      if (response.success) {
        // 更新缓存时间
        setLastFetchTime(Date.now());
        return response.success;
      } else {
        console.error('批量更新设置失败:', response.error);
        return false;
      }
    } catch (err) {
      console.error('批量更新设置失败:', err);
      return false;
    }
  }, [handleAuthFailure]);

  // 强制刷新设置
  const refreshSettings = useCallback(async () => {
    await fetchSettings(true);
  }, [fetchSettings]);

  // 初始化时获取设置
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const value: UserSettingsContextType = {
    settings,
    loading,
    error,
    updateSetting,
    updateAppearanceSettings,
    refreshSettings
  };

  return (
    <UserSettingsContext.Provider value={value}>
      {children}
    </UserSettingsContext.Provider>
  );
}

export function useUserSettings(): UserSettingsContextType {
  const context = useContext(UserSettingsContext);
  if (context === undefined) {
    throw new Error('useUserSettings must be used within a UserSettingsProvider');
  }
  return context;
}