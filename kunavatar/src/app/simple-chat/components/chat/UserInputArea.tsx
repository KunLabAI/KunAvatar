'use client';

import React from 'react';
import { MessageInput } from './MessageInput';
import { ToolSettings } from '../tools/ToolSettings';
import { Conversation } from '../../../../lib/database';
import { usePanelManager } from '../../hooks/usePanelManager';

interface UserInputAreaProps {
  // MessageInput 相关属性
  inputMessage: string;
  onInputChange: (message: string) => void;
  onSendMessage: () => void;
  onStopGeneration: () => void;
  isStreaming: boolean;
  currentConversation: Conversation | null;
  selectedModel: string;
  
  // ToolSettings 相关属性
  enableTools: boolean;
  selectedTools: string[];
  onToolsToggle: (enabled: boolean) => void;
  onSelectedToolsChange: (tools: string[]) => void;
  onInsertText: (text: string) => void;
  onClearChat?: () => void;
  conversationId?: string | null;
  selectedAgentId?: number | null;
}

export function UserInputArea({
  // MessageInput props
  inputMessage,
  onInputChange,
  onSendMessage,
  onStopGeneration,
  isStreaming,
  currentConversation,
  selectedModel,
  
  // ToolSettings props
  enableTools,
  selectedTools,
  onToolsToggle,
  onSelectedToolsChange,
  onInsertText,
  onClearChat,
  conversationId,
  selectedAgentId,
}: UserInputAreaProps) {
  // 统一管理面板状态
  const panelManager = usePanelManager();
  const { togglePanel, isPanelOpen } = panelManager;
  
  // 处理提示词优化面板切换
  const handlePromptOptimizeToggle = () => {
    togglePanel('prompt-optimize');
  };

  return (
    <div className="w-full">
      {/* 现代化容器 */}
      <div className="relative bg-[var(--color-card)] rounded-2xl p-4 transition-colors duration-200">
        {/* 工具设置区域 - 放在输入框上方 */}
        <ToolSettings
          selectedModel={selectedModel}
          enableTools={enableTools}
          selectedTools={selectedTools}
          onToolsToggle={onToolsToggle}
          onSelectedToolsChange={onSelectedToolsChange}
          onInsertText={onInsertText}
          onClearChat={onClearChat}
          conversationId={conversationId}
          selectedAgentId={selectedAgentId}
          panelManager={panelManager}
          promptOptimizeEnabled={isPanelOpen('prompt-optimize')}
          onPromptOptimizeToggle={handlePromptOptimizeToggle}
        />
        
        {/* 集成输入区域 */}
        <MessageInput
          inputMessage={inputMessage}
          onInputChange={onInputChange}
          onSendMessage={onSendMessage}
          onStopGeneration={onStopGeneration}
          isStreaming={isStreaming}
          currentConversation={currentConversation}
          selectedModel={selectedModel}
          onInsertText={onInsertText}
          promptOptimizeEnabled={isPanelOpen('prompt-optimize')}
          onPromptOptimizeToggle={handlePromptOptimizeToggle}
        />
      </div>
    </div>
  );
} 