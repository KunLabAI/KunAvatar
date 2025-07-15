'use client';

import React, { useState, useRef, useEffect } from 'react';
import ModelLogo from '@/app/model-manager/components/ModelLogo';
import { OllamaModel } from '@/app/simple-chat/types';
import { Brain } from 'lucide-react';

export interface CustomModel {
  base_model: string;
  display_name: string;
  family?: string;
}

interface ModelSelectorProps {
  models: OllamaModel[];
  selectedModel: string;
  onModelChange: (model: string) => void;
  customModels?: CustomModel[];
  disabled?: boolean;
  className?: string;
}

export function ModelSelector({
  models,
  selectedModel,
  onModelChange,
  customModels = [],
  disabled = false,
  className = '',
}: ModelSelectorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getModelDisplayInfo = (model: OllamaModel) => {
    const customModel = customModels.find(m => m.base_model === model.name);
    return {
      displayName: customModel?.display_name || model.name,
      family: customModel?.family || model.details?.family || model.name,
    };
  };

  let currentModelInfo;
  const currentModel = models.find(m => m.name === selectedModel);

  if (currentModel) {
    currentModelInfo = getModelDisplayInfo(currentModel);
  } else if (selectedModel) {
    const customModel = customModels.find(m => m.base_model === selectedModel);
    currentModelInfo = {
      displayName: customModel?.display_name || selectedModel,
      family: customModel?.family || 'default',
    };
  } else {
    currentModelInfo = {
      displayName: '请选择模型',
      family: 'default',
    };
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => !disabled && setIsDropdownOpen(!isDropdownOpen)}
        className={`form-input-base flex items-center gap-3 text-left ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        disabled={disabled}
      >
        {currentModelInfo && selectedModel ? (
          <ModelLogo
            modelName={currentModelInfo.family}
            size="sm"
            containerSize={24}
            imageSize={16}
            className="bg-theme-background-secondary border-theme-border flex-shrink-0"
          />
        ) : (
          <div className="w-5 h-5 bg-theme-background-secondary rounded-md border border-theme-border flex-shrink-0 flex items-center justify-center">
            <Brain className="w-4 h-4 text-theme-foreground-muted" />
          </div>
        )}
        
        <span className="flex-1 text-left truncate">
          {currentModelInfo?.displayName || '请选择模型'}
        </span>
        
        <svg
          className={`w-4 h-4 text-theme-foreground-muted transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isDropdownOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-theme-card border border-theme-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto scrollbar-thin">
          {models.length > 0 ? models.map((model) => {
            const displayInfo = getModelDisplayInfo(model);
            const isSelected = model.name === selectedModel;
            
            return (
              <button
                key={model.name}
                onClick={() => {
                  onModelChange(model.name);
                  setIsDropdownOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-theme-card-hover transition-colors duration-200 ${
                  isSelected ? 'bg-theme-background-secondary' : ''
                }`}
              >
                <ModelLogo
                  modelName={displayInfo.family}
                  size="sm"
                  containerSize={24}
                  imageSize={16}
                  className="bg-theme-background-secondary border-theme-border flex-shrink-0"
                />
                
                <span className="flex-1 truncate text-theme-foreground">
                  {displayInfo.displayName}
                </span>
                
                {isSelected && (
                  <svg className="w-4 h-4 text-theme-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          }) : (
            <div className="px-3 py-2 text-sm text-theme-foreground-muted">没有可用模型</div>
          )}
        </div>
      )}
    </div>
  );
} 