'use client';

import React from 'react';
import { useToolSettings } from '../../hooks/useToolSettings';
import { MemoryControl } from '../input-controls/MemoryControl';
import { ToolControl } from '../input-controls/ToolControl';
import { PromptOptimizePanel } from './PromptOptimizePanel';
import { ChatActionsControl } from '../input-controls/ChatActionsControl';
import { ToolPanel } from './ToolPanel';
import { MemoryPanel } from './MemoryPanel';
import Modal from '@/components/Modal';
import { AlertTriangle, XCircle } from 'lucide-react';

// 导入面板管理器类型
interface PanelManager {
  togglePanel: (panel: 'tool-settings' | 'memory' | 'prompt-optimize' | null) => void;
  isPanelOpen: (panel: 'tool-settings' | 'memory' | 'prompt-optimize' | null) => boolean;
}

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
  
  // 接收外部的面板管理器
  panelManager: PanelManager;
  promptOptimizeEnabled?: boolean;
  onPromptOptimizeToggle?: () => void;
}

export function ToolSettings({
  selectedModel,
  enableTools,
  selectedTools,
  onToolsToggle,
  onSelectedToolsChange,
  onInsertText,
  onClearChat,
  conversationId,
  selectedAgentId,
  panelManager,
  promptOptimizeEnabled = false,
  onPromptOptimizeToggle,
}: ToolSettingsProps) {
  // 使用外部传入的面板管理器
  const { togglePanel, isPanelOpen } = panelManager;
  
  const {
    modelSupportsTools,
    isCheckingModel,
    allTools,
    handleToolsToggle,
    handleToolSelection,
    // Modal相关
    showModal,
    modalConfig,
    closeModal,
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
    if (onPromptOptimizeToggle) {
      onPromptOptimizeToggle();
    }
  };

  return (
    <div className="relative">
      {/* 面板容器 */}
      <div className="absolute bottom-full left-0 right-0 mb-4 z-50">
        {/* 提示词优化面板 */}
        {isPanelOpen('prompt-optimize') && (
          <div className="mb-4">
            <PromptOptimizePanel
              onInsertText={onInsertText}
              onToggle={handlePromptOptimizeToggle}
            />
          </div>
        )}
        
        {/* 工具设置面板 */}
        {isPanelOpen('tool-settings') && enableTools && (
          <div className="mb-4">
            <ToolPanel
              allTools={allTools}
              selectedTools={selectedTools}
              onToolSelection={handleToolSelection}
              onToggle={handleToolSettingsToggle}
            />
          </div>
        )}
        
        {/* 记忆面板 */}
        {isPanelOpen('memory') && (
          <div className="mb-4">
            <MemoryPanel 
              conversationId={conversationId || null}
              agentId={selectedAgentId}
              isVisible={true}
              onToggle={handleMemoryToggle}
            />
          </div>
        )}
      </div>
      
      {/* 工具控制按钮组 */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          {/* 左侧功能按钮组 */}
          <div className="flex items-center gap-2">
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
          </div>
          
          {/* 右侧操作按钮组 */}
          <div className="flex items-center gap-2">
            {/* 清除聊天控制 */}
            {onClearChat && (
              <ChatActionsControl onClearChat={onClearChat} />
            )}
          </div>
        </div>
      </div>

      {/* 提示Modal */}
      <Modal
        open={showModal}
        onClose={closeModal}
        title={modalConfig?.title}
        icon={modalConfig?.type === 'error' ? <XCircle className="text-red-500" /> : <AlertTriangle className="text-yellow-500" />}
        actions={[
          {
            label: '确定',
            onClick: closeModal,
            variant: 'primary',
            autoFocus: true,
          },
        ]}
      >
        {modalConfig?.message}
      </Modal>
    </div>
  );
}