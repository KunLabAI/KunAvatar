'use client';

import React from 'react';
import { useToolSettings } from '../../hooks/useToolSettings';
import { usePanelManager } from '../../hooks/usePanelManager';
import { MemoryControl } from '../input-controls/MemoryControl';
import { ToolControl } from '../input-controls/ToolControl';
import { PromptOptimizeControl } from '../input-controls/PromptOptimizeControl';
import { PromptOptimizePanel } from './PromptOptimizePanel';
import { ChatActionsControl } from '../input-controls/ChatActionsControl';
import { ToolPanel } from './ToolPanel';
import { MemoryPanel } from './MemoryPanel';

interface ToolSettingsProps {
  selectedModel: string;
  enableTools: boolean;
  selectedTools: string[];
  onToolsToggle: (enabled: boolean) => void;
  onSelectedToolsChange: (tools: string[]) => void;
  onInsertText: (text: string) => void;
  onClearChat?: () => void;
  
  // 记忆相关现在由面板管理器统一管理
  conversationId?: string | null;
  selectedAgentId?: number | null;
}

export function ToolSettings({
  selectedModel,
  enableTools,
  selectedTools,
  onToolsToggle,
  onSelectedToolsChange,
  onInsertText,
  onClearChat,
  // 移除记忆面板相关属性
  conversationId,
  selectedAgentId,
}: ToolSettingsProps) {
  // 统一的面板管理器
  const { togglePanel, isPanelOpen } = usePanelManager();
  
  const {
    modelSupportsTools,
    isCheckingModel,
    allTools,
    handleToolsToggle,
    handleToolSelection,
  } = useToolSettings({
    selectedModel,
    enableTools,
    selectedTools,
    onToolsToggle,
    onSelectedToolsChange,
  });

  // 处理工具面板切换
  const handleToolSettingsToggle = () => {
    togglePanel('tool-settings');
  };

  // 处理记忆面板切换
  const handleMemoryToggle = () => {
    togglePanel('memory');
  };

  // 处理提示词优化面板切换
  const handlePromptOptimizeToggle = () => {
    togglePanel('prompt-optimize');
  };

  return (
    <div className="relative">
      {/* 面板容器 */}
      <div className="absolute bottom-full left-0 right-0 mb-6 z-50">
        {/* 提示词优化面板 */}
        {isPanelOpen('prompt-optimize') && (
          <PromptOptimizePanel
            onInsertText={onInsertText}
            onToggle={handlePromptOptimizeToggle}
          />
        )}
        
        {/* 工具设置面板 */}
        {isPanelOpen('tool-settings') && enableTools && (
          <ToolPanel
            allTools={allTools}
            selectedTools={selectedTools}
            onToolSelection={handleToolSelection}
            onToggle={handleToolSettingsToggle}
          />
        )}
        
        {/* 记忆面板 */}
        {isPanelOpen('memory') && (
          <MemoryPanel 
            conversationId={conversationId || null}
            agentId={selectedAgentId}
            isVisible={true}
            onToggle={handleMemoryToggle}
          />
        )}
      </div>
      
      {/* 输入控制按钮组 */}
      <div className="mb-3">
        <div className="flex items-center gap-3">
          {/* 提示词优化控制 */}
          <PromptOptimizeControl
            onInsertText={onInsertText}
            isOpen={isPanelOpen('prompt-optimize')}
            onToggle={handlePromptOptimizeToggle}
          />
          
          {/* 工具控制 */}
          <ToolControl
            enableTools={enableTools}
            isCheckingModel={isCheckingModel}
            modelSupportsTools={modelSupportsTools}
            showToolSettings={isPanelOpen('tool-settings')}
            selectedToolsCount={selectedTools.length}
            onToolsToggle={handleToolsToggle}
            onShowToolSettings={handleToolSettingsToggle}
            isOpen={isPanelOpen('tool-settings')}
            onToggle={handleToolSettingsToggle}
          />
          
          {/* 记忆控制 */}
          <MemoryControl
            isMemoryVisible={isPanelOpen('memory')}
            onMemoryToggle={handleMemoryToggle}
            conversationId={conversationId || null}
            isOpen={isPanelOpen('memory')}
            onToggle={handleMemoryToggle}
          />
          
          {/* 清除聊天控制 */}
          {onClearChat && (
            <ChatActionsControl onClearChat={onClearChat} />
          )}
        </div>
      </div>
    </div>
  );
}