'use client';

import React from 'react';
import { Brain } from 'lucide-react';
import { FormInput } from './FormSection';
import { useI18n } from '@/contexts/I18nContext';

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
  const { t } = useI18n();
  if (memoryLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-theme-primary"></div>
        <span className="ml-2 text-theme-foreground-muted">{t('agents.form.memory.loadingSettings')}</span>
      </div>
    );
  }

  return (
    <FormInput 
      label={t('agents.form.memory.enableMemory')}
      hint={t('agents.form.memory.hint')}
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
          {memoryEnabled ? t('agents.form.memory.enabled') : t('agents.form.memory.disabled')}
        </span>
        <Brain className={`w-4 h-4 ${memoryEnabled ? 'text-theme-primary' : 'text-gray-400'}`} />
      </div>
    </FormInput>
  );
};