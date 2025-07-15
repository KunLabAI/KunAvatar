'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, RefreshCw, RotateCcw, Save, Settings, X } from 'lucide-react';
import defaultPrompts from '../../../config/default-prompts.json';
import { ModelSelector } from '@/components/ModelSelector';

interface Model {
  label: string;
  value: string;
}

interface TitleSummarySectionProps {
  settings: {
    titleSummaryEnabled: boolean;
    titleSummaryModel: string;
    titleSummarySystemPrompt: string;
  };
  availableModels: Model[];
  modelsLoading: boolean;
  modelsError: string | null;
  onUpdateSetting: (key: 'titleSummaryEnabled' | 'titleSummaryModel' | 'titleSummarySystemPrompt', value: any) => void;
}

export function TitleSummarySection({
  settings,
  availableModels,
  modelsLoading,
  modelsError,
  onUpdateSetting
}: TitleSummarySectionProps) {
  const [localSystemPrompt, setLocalSystemPrompt] = useState(settings.titleSummarySystemPrompt);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setLocalSystemPrompt(settings.titleSummarySystemPrompt);
    setHasUnsavedChanges(false);
  }, [settings.titleSummarySystemPrompt]);

  const handleSystemPromptChange = (value: string) => {
    setLocalSystemPrompt(value);
    setHasUnsavedChanges(value !== settings.titleSummarySystemPrompt);
  };

  const handleSaveSystemPrompt = () => {
    onUpdateSetting('titleSummarySystemPrompt', localSystemPrompt);
    setHasUnsavedChanges(false);
  };

  const handleResetSystemPrompt = () => {
    const defaultValue = defaultPrompts.title_summary_system_prompt.value;
    setLocalSystemPrompt(defaultValue);
    setHasUnsavedChanges(defaultValue !== settings.titleSummarySystemPrompt);
  };

  return (
    <div className="rounded-lg p-6 border" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
      {/* 标题区域 */}
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare className="w-5 h-5"/>
        <div>
          <h3 className="section-title">标题总结</h3>
        </div>
      </div>
      
      {/* 主控制区域 - 单行布局 */}
      <div className="flex items-center gap-4 mb-4">
        {/* 标题生成模型 */}
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1" style={{ maxWidth: '300px' }}>
            {modelsLoading ? (
              <div className="flex items-center justify-center h-9 form-input-base disabled:opacity-50">
                <RefreshCw className="w-4 h-4 animate-spin" style={{ color: 'var(--color-primary)' }} />
              </div>
            ) : (
              <ModelSelector
                models={availableModels.map(model => ({
                  name: model.value,
                  model: model.value,
                  modified_at: '',
                  size: 0,
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
                selectedModel={settings.titleSummaryModel}
                onModelChange={(model) => onUpdateSetting('titleSummaryModel', model)}
                disabled={!settings.titleSummaryEnabled}
                className="w-full"
              />
            )}
          </div>
        </div>
        
        {/* 系统提示词按钮 */}
        <button
          onClick={() => setIsModalOpen(true)}
          disabled={!settings.titleSummaryEnabled}
          className="p-2 rounded-lg border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
          style={{
            backgroundColor: 'var(--color-background-secondary)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-foreground)'
          }}
          title="配置系统提示词"
        >
          <Settings className="w-4 h-4" />
        </button>
        
        {/* 开关按钮 */}
        <label className="flex items-center cursor-pointer select-none">
          <input
            type="checkbox"
            checked={settings.titleSummaryEnabled}
            onChange={e => onUpdateSetting('titleSummaryEnabled', e.target.checked)}
            className="sr-only"
          />
          <span className={`w-10 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out ${settings.titleSummaryEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
            <span className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${settings.titleSummaryEnabled ? 'translate-x-4' : ''}`}></span>
          </span>
        </label>
      </div>
      
      {/* 错误提示 */}
      {modelsError && (
        <div className="mb-4">
          <p className="text-sm flex items-center gap-1" style={{ color: 'var(--color-error)' }}>
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--color-error)' }}></span>
            {modelsError}
          </p>
        </div>
      )}
        
        {/* 系统提示词弹窗 */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-theme-background rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden border border-theme-border">
              {/* 头部 */}
              <div className="flex items-center justify-between p-8 pb-6 border-b border-theme-border">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-theme-primary to-theme-accent flex items-center justify-center">
                    <Settings className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-theme-foreground">系统提示词设置</h2>
                    <p className="text-sm text-theme-foreground-muted mt-1">配置AI生成标题的指导规则</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl hover:bg-theme-background-secondary transition-colors"
                >
                  <X className="w-5 h-5 text-theme-foreground-muted" />
                </button>
              </div>
              
              {/* 内容区域 */}
              <div className="flex-1 overflow-y-auto p-8">
                <div className="space-y-4">
                  <label className="text-sm font-medium text-theme-foreground block">
                    系统提示词
                  </label>
                  <textarea
                    value={localSystemPrompt}
                    onChange={e => handleSystemPromptChange(e.target.value)}
                    className="w-full h-64 p-4 rounded-xl border border-theme-border bg-theme-background-secondary text-theme-foreground resize-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent"
                    placeholder="输入标题生成系统提示词..."
                  />
                </div>
              </div>
              
              {/* 底部操作 */}
              <div className="p-8 flex justify-between items-center border-t border-theme-border bg-theme-background-secondary">
                <div>
                  <button
                    onClick={handleResetSystemPrompt}
                    className="btn-base btn-secondary px-6 py-3"
                  >
                    <RotateCcw className="w-4 h-4" />
                    重置为默认
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="btn-base btn-secondary px-6 py-3"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      handleSaveSystemPrompt();
                      setIsModalOpen(false);
                    }}
                    disabled={!hasUnsavedChanges}
                    className="btn-base btn-primary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    {hasUnsavedChanges ? '更新' : '保存'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}