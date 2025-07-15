'use client';

import React from 'react';
import { Conversation } from '../../../../lib/database';
import { CustomModel } from '@/lib/database/custom-models';
import { AgentWithRelations } from '@/app/agents/types';
import { ModelSelector } from '@/components/ModelSelector';
import { AgentSelector } from '@/components/AgentSelector';

type SelectorMode = 'model' | 'agent';

interface ChatHeaderProps {
  currentConversation: Conversation | null;
  
  // Model props
  models: CustomModel[];
  selectedModel: string;
  onModelChange: (model: string) => void;

  // Agent props
  agents: AgentWithRelations[];
  selectedAgentId: number | null;
  onAgentChange: (agentId: number | null) => void;

  // Mode props
  selectorMode: SelectorMode;
  onSelectorModeChange: (mode: SelectorMode) => void;
  
  // Agent mode detection
  isAgentMode?: boolean;
  
  // Conversation management
  onCreateNewConversation?: () => Promise<void>;
}

export function ChatHeader({ 
  currentConversation,
  models,
  selectedModel,
  onModelChange,
  agents,
  selectedAgentId,
  onAgentChange,
  selectorMode,
  onSelectorModeChange,
  isAgentMode = false,
  onCreateNewConversation,
}: ChatHeaderProps) {
  
  const title = currentConversation ? currentConversation.title : "新对话";

  // 适配层：将CustomModel[]转换为ModelSelector期望的格式
  const adaptedModels = models.map(model => ({
    name: model.base_model,
    model: model.base_model,
    modified_at: model.ollama_modified_at || model.updated_at || model.created_at,
    size: model.size || 0,
    digest: model.digest || '',
    details: {
      parent_model: '',
      format: model.format || '',
      family: model.family,
      families: [],
      parameter_size: model.parameter_count ? `${model.parameter_count}` : '',
      quantization_level: model.quantization_level || '',
    }
  }));

  const adaptedCustomModels = models.map(model => ({
    base_model: model.base_model,
    display_name: model.display_name,
    family: model.family,
  }));



  const renderModelSelector = () => {
    return (
      <ModelSelector
        models={adaptedModels}
        selectedModel={selectedModel}
        onModelChange={onModelChange}
        customModels={adaptedCustomModels}
      />
    );
  };

  const renderAgentSelector = () => {
    return (
      <AgentSelector
        agents={agents}
        selectedAgentId={selectedAgentId}
        onAgentChange={onAgentChange}
        currentConversationId={currentConversation?.id || null}
        onCreateNewConversation={onCreateNewConversation}
      />
    );
  };

  const renderSelector = () => {
    // 如果处于智能体模式，优先显示智能体选择器
    if (isAgentMode || selectorMode === 'agent') {
      return renderAgentSelector();
    }
    return renderModelSelector();
  };

  // 处理模式切换，在智能体模式下限制某些操作
  const handleModeChange = (mode: SelectorMode) => {
    if (isAgentMode && mode === 'model') {
      console.log('🚫 当前处于智能体模式，无法切换到模型模式');
      return;
    }
    onSelectorModeChange(mode);
  };

  return (
    <div className="h-16 px-3 sm:px-4 bg-theme-background-secondary dark:bg-theme-background duration-300 flex items-center">
      <div className="flex items-center justify-between w-full gap-2 sm:gap-6">
        {/* 左侧：模型选择区域 */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          {/* 模式切换按钮 - 移动端更紧凑 */}
          <div className="flex items-center bg-theme-background-tertiary p-0.5 sm:p-1 rounded-md sm:rounded-lg flex-shrink-0">
            <button 
              onClick={() => handleModeChange('model')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-sm sm:rounded-md transition-colors duration-200 whitespace-nowrap ${
                (selectorMode === 'model' && !isAgentMode)
                  ? 'bg-theme-card shadow text-theme-foreground' 
                  : isAgentMode
                  ? 'text-theme-foreground-muted opacity-50 cursor-not-allowed'
                  : 'text-theme-foreground-muted hover:text-theme-foreground'
              }`}
              disabled={isAgentMode}
              title={isAgentMode ? '当前处于智能体模式' : ''}
            >
              <span className="hidden sm:inline">Model</span>
              <span className="sm:hidden">M</span>
            </button>
            <button
              onClick={() => handleModeChange('agent')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-sm sm:rounded-md transition-colors duration-200 whitespace-nowrap ${
                (selectorMode === 'agent' || isAgentMode)
                  ? 'bg-theme-card shadow text-theme-foreground' 
                  : 'text-theme-foreground-muted hover:text-theme-foreground'
              }`}
            >
              <span className="hidden sm:inline">Agent</span>
              <span className="sm:hidden">A</span>
            </button>
          </div>
          
          {/* 选择器 - 响应式宽度 */}
          <div className="flex-1 min-w-0 max-w-full sm:max-w-xs">
            {renderSelector()}
          </div>
        </div>
        
        {/* 右侧：对话标题 - 桌面端显示 */}
        <div className="hidden md:block flex-shrink-0">
          <h2 className="text-base lg:text-lg font-semibold text-theme-foreground text-right truncate max-w-xs">
            {title}
          </h2>
        </div>
        
        {/* 移动端和平板端：简化标题或菜单按钮 */}
        <div className="md:hidden flex-shrink-0">
          <button 
            className="p-2 text-theme-foreground-muted hover:text-theme-foreground transition-colors duration-200"
            title={title}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}