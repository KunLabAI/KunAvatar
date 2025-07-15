import { useState, useEffect, useCallback } from 'react';

interface UserSettings {
  themePreference: string;
  colorTheme: string;
  chatStyle: string;
  displaySize: string;
}

interface UseUserSettingsReturn {
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

export function useUserSettings(): UseUserSettingsReturn {
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

  // 获取用户设置
  const fetchSettings = useCallback(async () => {
    try {
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
        return;
      }

      const response = await fetch('/api/user-settings?category=appearance', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // 只有当设置真正发生变化时才更新，减少不必要的重新渲染
          const newSettings = data.settings;
          setSettings(prevSettings => {
            const hasChanged = Object.keys(newSettings).some(
              key => prevSettings[key as keyof UserSettings] !== newSettings[key]
            );
            return hasChanged ? newSettings : prevSettings;
          });
        } else {
          throw new Error(data.error || '获取设置失败');
        }
      } else if (response.status === 401) {
        // 认证失败，使用本地存储作为后备
        const localSettings = {
          themePreference: localStorage.getItem('theme-preference') || 'system',
          colorTheme: localStorage.getItem('color-theme') || 'kun',
          chatStyle: localStorage.getItem('simple-chat-style') || 'assistant',
          displaySize: localStorage.getItem('simple-chat-display-size') || 'fullscreen'
        };
        setSettings(localSettings);
      } else {
        throw new Error('获取设置失败');
      }
    } catch (err) {
      console.error('获取用户设置失败:', err);
      setError(err instanceof Error ? err.message : '获取设置失败');
      
      // 使用本地存储作为后备
      const localSettings = {
        themePreference: localStorage.getItem('theme-preference') || 'system',
        colorTheme: localStorage.getItem('color-theme') || 'kun',
        chatStyle: localStorage.getItem('simple-chat-style') || 'assistant',
        displaySize: localStorage.getItem('simple-chat-display-size') || 'fullscreen'
      };
      setSettings(localSettings);
    } finally {
      setLoading(false);
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // 更新单个设置
  const updateSetting = useCallback(async (key: string, value: string): Promise<boolean> => {
    try {
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

      const response = await fetch('/api/user-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          key: {
            themePreference: 'theme-preference',
            colorTheme: 'color-theme',
            chatStyle: 'chat-style',
            displaySize: 'display-size'
          }[key] || key,
          value,
          category: 'appearance'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.success;
      } else {
        console.error('更新设置失败:', response.statusText);
        return false;
      }
    } catch (err) {
      console.error('更新设置失败:', err);
      return false;
    }
  }, []);

  // 批量更新界面设置
  const updateAppearanceSettings = useCallback(async (newSettings: Partial<UserSettings>): Promise<boolean> => {
    try {
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

      const response = await fetch('/api/user-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          appearance: {
            themePreference: newSettings.themePreference,
            colorTheme: newSettings.colorTheme,
            chatStyle: newSettings.chatStyle,
            displaySize: newSettings.displaySize
          }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.success;
      } else {
        console.error('批量更新设置失败:', response.statusText);
        return false;
      }
    } catch (err) {
      console.error('批量更新设置失败:', err);
      return false;
    }
  }, []);

  // 刷新设置
  const refreshSettings = useCallback(async () => {
    await fetchSettings();
  }, [fetchSettings]);

  // 初始化时获取设置
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // 监听设置迁移完成事件
  useEffect(() => {
    const handleMigrationComplete = () => {
      refreshSettings();
    };

    window.addEventListener('userSettingsMigrated', handleMigrationComplete);
    return () => {
      window.removeEventListener('userSettingsMigrated', handleMigrationComplete);
    };
  }, [refreshSettings]);

  return {
    settings,
    loading,
    error,
    updateSetting,
    updateAppearanceSettings,
    refreshSettings
  };
}