'use client';

import React, { useState } from 'react';
import { Sparkles, RefreshCw, RotateCcw, Save, Settings, X } from 'lucide-react';
import defaultPrompts from '@/config/default-prompts.json';
import { ModelSelector } from '@/components/ModelSelector';

interface Model {
  label: string;
  value: string;
}

interface PromptOptimizeSectionProps {
  settings: {
    promptEnabled: boolean;
    promptModel: string;
    promptSystemPrompt: string;
  };
  availableModels: Model[];
  modelsLoading: boolean;
  modelsError: string | null;
  onUpdateSetting: (key: 'promptEnabled' | 'promptModel' | 'promptSystemPrompt', value: any) => void;
}

export function PromptOptimizeSection({
  settings,
  availableModels,
  modelsLoading,
  modelsError,
  onUpdateSetting
}: PromptOptimizeSectionProps) {
  // 系统提示词本地状态
  const [localSystemPrompt, setLocalSystemPrompt] = useState(settings.promptSystemPrompt);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 当外部设置变化时，更新本地状态
  React.useEffect(() => {
    setLocalSystemPrompt(settings.promptSystemPrompt);
    setHasUnsavedChanges(false);
  }, [settings.promptSystemPrompt]);

  // 处理系统提示词变化
  const handleSystemPromptChange = (value: string) => {
    setLocalSystemPrompt(value);
    setHasUnsavedChanges(value !== settings.promptSystemPrompt);
  };

  // 保存系统提示词
  const handleSaveSystemPrompt = () => {
    onUpdateSetting('promptSystemPrompt', localSystemPrompt);
    setHasUnsavedChanges(false);
  };

  // 重置系统提示词
  const handleResetSystemPrompt = () => {
    const defaultValue = defaultPrompts.prompt_optimize_system_prompt.value;
    setLocalSystemPrompt(defaultValue);
    setHasUnsavedChanges(defaultValue !== settings.promptSystemPrompt);
  };



  return (
    <div className="rounded-lg p-6 bg-theme-card">
      {/* 标题区域 */}
      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="w-5 h-5"/>
        <div>
          <h3 className="section-title">提示优化</h3>
        </div>
      </div>
      
      {/* 主控制区域 - 单行布局 */}
      <div className="flex items-center gap-4 mb-4">
        {/* 优化模型 */}
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
                selectedModel={settings.promptModel}
                onModelChange={(model) => onUpdateSetting('promptModel', model)}
                disabled={!settings.promptEnabled}
                className="w-full"
              />
            )}
          </div>
        </div>
        
        {/* 系统提示词按钮 */}
        <button
          onClick={() => setIsModalOpen(true)}
          disabled={!settings.promptEnabled}
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
            checked={settings.promptEnabled}
            onChange={e => onUpdateSetting('promptEnabled', e.target.checked)}
            className="sr-only"
          />
          <span className={`w-10 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out ${settings.promptEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
            <span className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${settings.promptEnabled ? 'translate-x-4' : ''}`}></span>
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
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-theme-foreground">系统提示词设置</h2>
                  <p className="text-sm text-theme-foreground-muted mt-1">配置AI优化提示词的指导规则</p>
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
                  placeholder="输入提示词优化系统提示词..."
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