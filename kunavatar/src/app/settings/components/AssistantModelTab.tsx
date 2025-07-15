'use client';

import React from 'react';
import { PromptOptimizeSection } from './PromptOptimizeSection';
import { TitleSummarySection } from './TitleSummarySection';
import { MemorySection } from './MemorySection';
import { PromptOptimizeSettings } from '../hooks/usePromptOptimizeSettings';

interface Model {
  label: string;
  value: string;
}

interface AssistantModelTabProps {
  settings: PromptOptimizeSettings;
  availableModels: Model[];
  modelsLoading: boolean;
  modelsError: string | null;
  onUpdateSetting: <K extends keyof PromptOptimizeSettings>(key: K, value: PromptOptimizeSettings[K]) => void;
}

export function AssistantModelTab({
  settings,
  availableModels,
  modelsLoading,
  modelsError,
  onUpdateSetting
}: AssistantModelTabProps) {
  return (
    <div className="space-y-6">
      <PromptOptimizeSection
          settings={{
            promptEnabled: settings.promptEnabled,
            promptModel: settings.promptModel,
            promptSystemPrompt: settings.promptSystemPrompt
          }}
          availableModels={availableModels}
          modelsLoading={modelsLoading}
          modelsError={modelsError}
          onUpdateSetting={onUpdateSetting}
        />
      
      <TitleSummarySection
        settings={{
          titleSummaryEnabled: settings.titleSummaryEnabled,
          titleSummaryModel: settings.titleSummaryModel,
          titleSummarySystemPrompt: settings.titleSummarySystemPrompt
        }}
        availableModels={availableModels}
        modelsLoading={modelsLoading}
        modelsError={modelsError}
        onUpdateSetting={onUpdateSetting}
      />
      
      <MemorySection
        availableModels={availableModels}
        modelsLoading={modelsLoading}
        modelsError={modelsError}
      />
    </div>
  );
}