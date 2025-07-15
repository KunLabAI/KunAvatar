import { useState, useEffect } from 'react';
import defaultPrompts from '../../../config/default-prompts.json';

// 提示词优化设置接口
export interface PromptOptimizeSettings {
  // 提示词优化分区
  promptModel: string;
  promptEnabled: boolean;
  promptSystemPrompt: string;
  
  // 消息标题总结分区
  titleSummaryModel: string;
  titleSummaryEnabled: boolean;
  titleSummarySystemPrompt: string;
  
  // 记忆模块分区
  memoryModel: string;
  memoryEnabled: boolean;
  memoryTriggerRounds: number;
  memoryTriggerTokens: number;
  memorySystemPrompt: string;
  summarizeStyle: 'brief' | 'detailed' | 'structured';
  maxMemoryEntries: number;
}

// 默认设置
const DEFAULT_SETTINGS: PromptOptimizeSettings = {
  promptModel: '', // 将在运行时设置为第一个可用模型
  promptEnabled: true,
  promptSystemPrompt: defaultPrompts.prompt_optimize_system_prompt.value,
  titleSummaryModel: '', // 将在运行时设置为第一个可用模型
  titleSummaryEnabled: true, // 默认启用标题总结功能
  titleSummarySystemPrompt: defaultPrompts.title_summary_system_prompt.value,
  memoryModel: '', // 将在运行时设置为第一个可用模型
  memoryEnabled: false,
  memoryTriggerRounds: 20,
  memoryTriggerTokens: 8000,
  memorySystemPrompt: defaultPrompts.memory_system_prompt.value,
  summarizeStyle: 'detailed',
  maxMemoryEntries: 10,
};

const STORAGE_KEY = 'prompt_optimize_settings';

export function usePromptOptimizeSettings() {
  const [settings, setSettings] = useState<PromptOptimizeSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // 从localStorage和数据库加载设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // 从localStorage加载设置
        const stored = localStorage.getItem(STORAGE_KEY);
        let localSettings = DEFAULT_SETTINGS;
        
        if (stored) {
          const parsed = JSON.parse(stored);
          localSettings = { ...DEFAULT_SETTINGS, ...parsed };
        }

        // 从用户设置API加载三个系统提示词
        const systemPromptKeys = [
          { key: 'prompt_optimize_system_prompt', field: 'promptSystemPrompt' },
          { key: 'title_summary_system_prompt', field: 'titleSummarySystemPrompt' },
          { key: 'memory_system_prompt', field: 'memorySystemPrompt' }
        ];

        // 获取认证令牌
        const token = localStorage.getItem('accessToken');
        if (!token) {
          console.warn('No access token found, skipping API calls');
          setSettings(localSettings);
          return;
        }

        for (const { key, field } of systemPromptKeys) {
          try {
            const response = await fetch(`/api/user-settings?key=${key}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            if (response.ok) {
              const result = await response.json();
              // 检查返回的是数组且不为空，并且第一个元素有value属性
              if (Array.isArray(result) && result.length > 0 && result[0].value) {
                (localSettings as any)[field] = result[0].value;
              }
              // 如果API返回空数组，说明设置不存在，保持使用默认值或localStorage中的值
            }
          } catch (apiError) {
            console.warn(`Failed to load ${key} from API, using default:`, apiError);
          }
        }

        setSettings(localSettings);
      } catch (error) {
        console.error('Failed to load prompt optimize settings:', error);
        setSettings(DEFAULT_SETTINGS);
      } finally {
        setIsLoaded(true);
      }
    };

    loadSettings();
  }, []);

  // 保存设置到localStorage和数据库
  const saveSettings = async (newSettings: Partial<PromptOptimizeSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    try {
      // 保存系统提示词到用户设置API（只保存实际传入的系统提示词）
      const systemPromptMappings = {
        promptSystemPrompt: { key: 'prompt_optimize_system_prompt', category: 'prompt_optimize' },
        titleSummarySystemPrompt: { key: 'title_summary_system_prompt', category: 'title_summary' },
        memorySystemPrompt: { key: 'memory_system_prompt', category: 'memory' }
      };

      for (const [settingKey, value] of Object.entries(newSettings)) {
         if (settingKey in systemPromptMappings && value !== undefined) {
           const mapping = systemPromptMappings[settingKey as keyof typeof systemPromptMappings];
           try {
             // 直接使用POST方法保存到用户设置
             const token = localStorage.getItem('accessToken');
             const response = await fetch('/api/user-settings', {
               method: 'POST',
               headers: {
                 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${token}`,
               },
               body: JSON.stringify({
                 key: mapping.key,
                 value: value,
                 category: mapping.category
               }),
             });
             
             if (!response.ok) {
               const errorData = await response.json().catch(() => ({}));
               throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
             }
           } catch (apiError) {
             console.error(`Failed to save ${mapping.key} to API`, apiError);
             throw apiError; // 重新抛出错误以便上层处理
           }
         }
       }

      // 保存其他设置到localStorage（排除系统提示词）
      const { promptSystemPrompt, titleSummarySystemPrompt, memorySystemPrompt, ...localSettings } = updatedSettings;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localSettings));
    } catch (error) {
      console.error('Failed to save prompt optimize settings:', error);
    }
  };

  // 重置设置
  const resetSettings = async () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      // 重置localStorage
      localStorage.removeItem(STORAGE_KEY);
      
      // 重置用户设置API中的三个系统提示词
      const systemPromptResets = [
        { key: 'prompt_optimize_system_prompt', value: defaultPrompts.prompt_optimize_system_prompt.value, category: 'prompt_optimize' },
        { key: 'title_summary_system_prompt', value: defaultPrompts.title_summary_system_prompt.value, category: 'title_summary' },
        { key: 'memory_system_prompt', value: defaultPrompts.memory_system_prompt.value, category: 'memory' }
      ];

      for (const reset of systemPromptResets) {
        try {
          const token = localStorage.getItem('accessToken');
          const response = await fetch('/api/user-settings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(reset),
          });
          
          if (!response.ok) {
            console.error(`Failed to reset ${reset.key} via API`);
          }
        } catch (apiError) {
          console.error(`API error when resetting ${reset.key}:`, apiError);
        }
      }
    } catch (error) {
      console.error('Failed to reset prompt optimize settings:', error);
    }
  };

  // 更新单个设置项的便捷方法
  const updateSetting = <K extends keyof PromptOptimizeSettings>(
    key: K,
    value: PromptOptimizeSettings[K]
  ) => {
    saveSettings({ [key]: value });
  };

  return {
    settings,
    isLoaded,
    saveSettings,
    resetSettings,
    updateSetting,
  };
}