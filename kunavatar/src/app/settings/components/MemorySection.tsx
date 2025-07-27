'use client';
import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, RefreshCw, RotateCcw, Save, X, Sliders } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import defaultPrompts from '../../../config/default-prompts.json';
import { PageLoading } from '@/components/Loading';
import { ModelSelector } from '@/components/ModelSelector';

interface Model {
  label: string;
  value: string;
}

// 定义全局记忆设置的类型
interface GlobalMemorySettings {
  memory_enabled: boolean;
  memory_model: string;
  memory_trigger_rounds: number;
  max_memory_entries: number;
  summary_style: 'brief' | 'detailed' | 'structured';
  memory_system_prompt: string;
}

interface MemorySectionProps {
  availableModels: Model[];
  modelsLoading: boolean;
  modelsError: string | null;
}

const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-6">
    <h3 className="section-title !text-theme-foreground-muted">{title}</h3>
    {children}
  </div>
);

const FormInput = ({ 
  label, 
  required = false, 
  error,
  hint,
  children
}: { 
  label: string; 
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    <label className="text-sm font-medium text-theme-foreground block">
      {label}
      {required && <span className="text-theme-error ml-1">*</span>}
    </label>
    {children}
    {error && (
      <p className="text-sm text-theme-error">{error}</p>
    )}
    {hint && !error && (
      <p className="text-xs text-theme-foreground-muted">{hint}</p>
    )}
  </div>
);

export function MemorySection({
  availableModels,
  modelsLoading,
  modelsError,
}: MemorySectionProps) {
  const [settings, setSettings] = useState<GlobalMemorySettings | null>(null);
  const [localSettings, setLocalSettings] = useState<GlobalMemorySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [promptMode, setPromptMode] = useState<'preset' | 'custom'>('preset');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 防抖定时器
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // 添加ESC键退出弹窗功能
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsModalOpen(false);
      }
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isModalOpen]);

  // 加载全局记忆设置
  useEffect(() => {
    const loadGlobalSettings = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          console.warn('No access token found, cannot load memory settings');
          setIsLoading(false);
          return;
        }

        const response = await fetch('/api/user-settings?category=memory', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          const settingsMap = new Map(data.map((s: any) => [s.key, s.value]));
          
          const loadedSettings = {
            memory_enabled: settingsMap.get('memory_enabled') === '1',
            memory_model: String(settingsMap.get('memory_model') || ''),
            memory_trigger_rounds: parseInt(String(settingsMap.get('memory_trigger_rounds') || '20'), 10),
            max_memory_entries: parseInt(String(settingsMap.get('max_memory_entries') || '10'), 10),
            summary_style: (settingsMap.get('summary_style') as any) || 'detailed',
            memory_system_prompt: String(settingsMap.get('memory_system_prompt') || defaultPrompts.memory_system_prompt.value),
          };
          setSettings(loadedSettings);
          setLocalSettings(loadedSettings);
          setHasUnsavedChanges(false);
        }
      } catch (error) {
        console.error('加载全局记忆设置失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadGlobalSettings();
  }, []);

  // 处理本地设置更新
  const handleLocalSettingUpdate = (key: keyof GlobalMemorySettings, value: any) => {
    setLocalSettings(prev => {
      if (!prev) return null;
      const newSettings = { ...prev, [key]: value };
      // 检查是否有未保存的更改
      setHasUnsavedChanges(JSON.stringify(newSettings) !== JSON.stringify(settings));
      return newSettings;
    });
  };

  // 处理模型选择更新（立即保存）
  const handleModelUpdate = (model: string) => {
    setSettings(prev => prev ? { ...prev, memory_model: model } : null);
    setLocalSettings(prev => prev ? { ...prev, memory_model: model } : null);
    saveSetting('memory_model', model);
  };

  // 处理开关更新（立即保存）
  const handleEnabledUpdate = (enabled: boolean) => {
    setSettings(prev => prev ? { ...prev, memory_enabled: enabled } : null);
    setLocalSettings(prev => prev ? { ...prev, memory_enabled: enabled } : null);
    saveSetting('memory_enabled', enabled);
  };

  // 保存设置到后端
  const saveSetting = async (key: string, value: any) => {
    // 对于数字输入，如果值是NaN（例如，输入框为空），则不保存
    if (typeof value === 'number' && isNaN(value)) {
        return;
    }
      
    setIsSaving(true);
    try {
      // 对布尔值进行转换
      const apiValue = typeof value === 'boolean' ? (value ? '1' : '0') : String(value);
      const token = localStorage.getItem('accessToken');

      await fetch('/api/user-settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ key, value: apiValue, category: 'memory' }),
      });
    } catch (error) {
      console.error(`保存设置 ${key} 失败:`, error);
    } finally {
      // 短暂延迟后更新状态，提供视觉反馈
      setTimeout(() => setIsSaving(false), 300);
    }
  };

  // 保存所有设置
  const handleSaveAllSettings = async () => {
    if (!localSettings || !hasUnsavedChanges) return;
    
    setIsSaving(true);
    try {
      // 批量保存所有更改的设置
      const savePromises = [];
      
      if (localSettings.memory_trigger_rounds !== settings?.memory_trigger_rounds) {
        savePromises.push(saveSetting('memory_trigger_rounds', localSettings.memory_trigger_rounds));
      }
      if (localSettings.max_memory_entries !== settings?.max_memory_entries) {
        savePromises.push(saveSetting('max_memory_entries', localSettings.max_memory_entries));
      }
      if (localSettings.summary_style !== settings?.summary_style) {
        savePromises.push(saveSetting('summary_style', localSettings.summary_style));
      }
      if (localSettings.memory_system_prompt !== settings?.memory_system_prompt) {
        savePromises.push(saveSetting('memory_system_prompt', localSettings.memory_system_prompt));
      }
      
      await Promise.all(savePromises);
      
      // 更新主设置状态
      setSettings(localSettings);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('保存设置失败:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSystemPrompt = () => {
    const defaultPrompt = defaultPrompts.memory_system_prompt.value;
    handleLocalSettingUpdate('memory_system_prompt', defaultPrompt);
  };

  // 重置本地更改
  const handleResetChanges = () => {
    if (settings) {
      setLocalSettings(settings);
      setHasUnsavedChanges(false);
    }
  };

  if (isLoading) {
    return (
      <PageLoading 
        text="loading..." 
        fullScreen={false}
      />
    );
  }

  if (!settings) {
    return (
      <section className="bg-theme-card border border-theme-border rounded-2xl p-6">
        <p className="text-red-500">无法加载记忆设置。</p>
      </section>
    );
  }

  return (
    <div className="rounded-lg p-6 border" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
      {/* 标题区域 */}
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="w-5 h-5"/>
        <div>
          <h3 className="section-title">全局记忆</h3>
        </div>
        {isSaving && (
          <div className="ml-auto text-xs flex items-center gap-1" style={{ color: 'var(--color-foreground-muted)' }}>
            <RefreshCw className="w-3 h-3 animate-spin" />
            保存中...
          </div>
        )}
      </div>
      
      {/* 主控制区域 */}
      <div className="space-y-4">
        {/* 顶部控制栏 - 左右分布 */}
        <div className="flex items-center justify-between">
          {/* 左侧：模型选择器 */}
          <div className="flex-1" style={{ maxWidth: '300px' }}>
            <ModelSelector
              models={availableModels.map(model => ({
                name: model.value,
                model: model.value,
                size: 0,
                modified_at: '',
                digest: '',
                details: {
                  parent_model: '',
                  format: '',
                  family: model.value,
                  families: [],
                  parameter_size: '',
                  quantization_level: ''
                }
              }))}
              selectedModel={settings.memory_model}
              onModelChange={handleModelUpdate}
              disabled={!settings.memory_enabled || isSaving}
            />
          </div>
          
          {/* 右侧：设置按钮和开关 */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              disabled={!settings.memory_enabled || isSaving}
              className="p-2 rounded-lg border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
              style={{
                backgroundColor: 'var(--color-background-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-foreground)'
              }}
              title="记忆设置"
            >
              <Sliders className="w-4 h-4" />
            </button>
            <label className="flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.memory_enabled}
                onChange={e => handleEnabledUpdate(e.target.checked)}
                className="sr-only"
                disabled={isSaving}
              />
              <span className={`w-10 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out ${settings.memory_enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <span className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${settings.memory_enabled ? 'translate-x-4' : ''}`}></span>
              </span>
            </label>
          </div>
        </div>
        
        {/* 错误提示 */}
        {modelsError && (
          <p className="text-sm flex items-center gap-1" style={{ color: 'var(--color-error)' }}>
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--color-error)' }}></span>
            {modelsError}
          </p>
        )}
      </div>

      {/* 记忆设置弹窗 */}
        <AnimatePresence>
          {isModalOpen && (
            <motion.div 
              className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div 
                className="bg-theme-background rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-theme-border"
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: -10 }}
              >
                {/* 头部 */}
                <div className="flex items-center justify-between p-8 pb-6 border-b border-theme-border">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-theme-primary to-theme-accent flex items-center justify-center">
                      <Sliders className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="page-title text-theme-foreground">记忆设置</h2>
                      <p className="text-theme-foreground-muted text-sm">配置全局记忆功能的参数和行为</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="w-10 h-10 rounded-full bg-theme-card hover:bg-theme-card-hover flex items-center justify-center text-theme-foreground-muted hover:text-theme-foreground transition-all duration-200 border border-theme-border"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {/* 表单内容 */}
                <div className="flex-1 overflow-y-auto scrollbar-thin p-8 space-y-8">
                  {/* 基础设置 */}
                  <FormSection title="基础设置">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormInput 
                        label="触发轮数" 
                        hint="每隔多少轮对话触发一次记忆总结"
                      >
                        <input
                          type="number"
                          min={5} max={100}
                          value={localSettings?.memory_trigger_rounds || ''}
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10);
                            if (value >= 5 && value <= 100) {
                                handleLocalSettingUpdate('memory_trigger_rounds', value)
                            } else if (e.target.value === '') {
                                handleLocalSettingUpdate('memory_trigger_rounds', 20)
                            }
                          }}
                          className="form-input-base disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={!settings.memory_enabled || isSaving}
                        />
                      </FormInput>
                      
                      <FormInput 
                        label="记忆上限" 
                        hint="最多保存多少条记忆"
                      >
                        <input
                          type="number"
                          min={1} max={50}
                          value={localSettings?.max_memory_entries || ''}
                          onChange={(e) => {
                              const value = parseInt(e.target.value, 10);
                              if (value >= 1 && value <= 50) {
                                  handleLocalSettingUpdate('max_memory_entries', value)
                              } else if (e.target.value === '') {
                                  handleLocalSettingUpdate('max_memory_entries', 10)
                              }
                          }}
                          className="form-input-base disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={!settings.memory_enabled || isSaving}
                        />
                      </FormInput>
                    </div>
                  </FormSection>

                  {/* 提示词设置 */}
                  <FormSection title="提示词设置">
                    <FormInput label="提示词模式">
                      <div className="flex gap-3">
                        <button
                          onClick={() => setPromptMode('preset')}
                          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                            promptMode === 'preset' 
                              ? 'bg-theme-primary text-white shadow-md' 
                              : 'bg-theme-card text-theme-foreground hover:bg-theme-card-hover border border-theme-border'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          disabled={!settings.memory_enabled || isSaving}
                        >
                          预设风格
                        </button>
                        <button
                          onClick={() => setPromptMode('custom')}
                          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                            promptMode === 'custom' 
                              ? 'bg-theme-primary text-white shadow-md' 
                              : 'bg-theme-card text-theme-foreground hover:bg-theme-card-hover border border-theme-border'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          disabled={!settings.memory_enabled || isSaving}
                        >
                          自定义提示词
                        </button>
                      </div>
                    </FormInput>

                    {/* 预设风格选择 */}
                    {promptMode === 'preset' && (
                      <FormInput 
                        label="总结风格" 
                        hint="选择记忆总结的详细程度和组织方式"
                      >
                        <select
                          value={localSettings?.summary_style || 'detailed'}
                          onChange={(e) => handleLocalSettingUpdate('summary_style', e.target.value)}
                          className="form-input-base disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={!settings.memory_enabled || isSaving}
                        >
                          <option value="brief">简洁 - 提取关键信息点</option>
                          <option value="detailed">详细 - 保留更多上下文</option>
                          <option value="structured">结构化 - 按主题分类整理</option>
                        </select>
                      </FormInput>
                    )}

                    {/* 自定义提示词 */}
                    {promptMode === 'custom' && (
                      <FormInput 
                        label="自定义系统提示词" 
                        hint="配置记忆总结的指导规则，帮助AI更好地理解对话内容并生成合适的记忆摘要"
                      >
                        <textarea
                          value={localSettings?.memory_system_prompt || ''}
                          onChange={e => handleLocalSettingUpdate('memory_system_prompt', e.target.value)}
                          className="form-input-base h-48 resize-none font-mono text-sm"
                          placeholder="输入记忆总结系统提示词..."
                          disabled={!settings.memory_enabled || isSaving}
                        />
                      </FormInput>
                    )}
                  </FormSection>
              </div>
                
                {/* 底部操作 */}
                <div className="p-8 flex justify-between items-center border-t border-theme-border bg-theme-background-secondary">
                  <div>
                    {promptMode === 'custom' && (
                      <button
                        onClick={handleResetSystemPrompt}
                        className="btn-base btn-secondary px-6 py-3"
                        disabled={!settings.memory_enabled || isSaving}
                      >
                        <RotateCcw className="w-4 h-4" />
                        重置为默认
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        handleResetChanges();
                        setIsModalOpen(false);
                      }}
                      className="btn-base btn-secondary px-6 py-3"
                    >
                      取消
                    </button>
                    <button
                      onClick={async () => {
                        await handleSaveAllSettings();
                        setIsModalOpen(false);
                      }}
                      className="btn-base btn-primary px-6 py-3"
                      disabled={!hasUnsavedChanges || isSaving}
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          保存中...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          {hasUnsavedChanges ? '更新设置' : '保存设置'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
       </div>
   );
}