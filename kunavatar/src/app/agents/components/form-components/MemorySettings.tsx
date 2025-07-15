'use client';

import React from 'react';
import { Brain } from 'lucide-react';
import { FormInput } from './FormSection';

interface MemorySettingsProps {
  memoryEnabled: boolean;
  memoryLoading: boolean;
  onMemoryEnabledChange: (enabled: boolean) => void;
}

export const MemorySettings: React.FC<MemorySettingsProps> = ({
  memoryEnabled,
  memoryLoading,
  onMemoryEnabledChange
}) => {
  if (memoryLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-theme-primary"></div>
        <span className="ml-2 text-theme-foreground-muted">加载记忆设置...</span>
      </div>
    );
  }

  return (
    <FormInput 
      label="启用记忆功能"
      hint="开启后，智能体将自动总结对话历史，节省上下文空间。详细配置请前往设置页面。"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onMemoryEnabledChange(!memoryEnabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out ${
            memoryEnabled ? 'bg-theme-primary' : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
              memoryEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-sm text-theme-foreground-muted">
          {memoryEnabled ? '已启用' : '已关闭'}
        </span>
        <Brain className={`w-4 h-4 ${memoryEnabled ? 'text-theme-primary' : 'text-gray-400'}`} />
      </div>
    </FormInput>
  );
};