'use client';

import React, { useEffect, useCallback } from 'react';
import { PromptOptimizePanel } from './PromptOptimizePanel';
import { ToolPanel } from './ToolPanel';
import { MemoryPanel } from './MemoryPanel';
import { Tool } from '@/lib/ollama';

interface ToolSettingsProps {
  // 工具相关
  enableTools: boolean;
  selectedTools: string[];
  allTools: Tool[];
  onToolSelection: (toolName: string) => void;
  
  // 面板状态
  showToolPanel?: boolean;
  showMemoryPanel?: boolean;
  showPromptOptimizePanel?: boolean;
  onToggleToolPanel?: () => void;
  onToggleMemoryPanel?: () => void;
  onTogglePromptOptimizePanel?: () => void;
  
  // 其他功能
  onInsertText: (text: string) => void;
  conversationId?: string | null;
  selectedAgentId?: number | null;
}

export function ToolSettings({
  enableTools,
  selectedTools,
  allTools,
  onToolSelection,
  showToolPanel = false,
  showMemoryPanel = false,
  showPromptOptimizePanel = false,
  onToggleToolPanel,
  onToggleMemoryPanel,
  onTogglePromptOptimizePanel,
  onInsertText,
  conversationId,
  selectedAgentId,
}: ToolSettingsProps) {

  // 全局ESC键监听，关闭所有打开的面板
  const handleEscClose = useCallback(() => {
    if (showToolPanel && onToggleToolPanel) {
      onToggleToolPanel();
    }
    if (showMemoryPanel && onToggleMemoryPanel) {
      onToggleMemoryPanel();
    }
    if (showPromptOptimizePanel && onTogglePromptOptimizePanel) {
      onTogglePromptOptimizePanel();
    }
  }, [showToolPanel, showMemoryPanel, showPromptOptimizePanel, onToggleToolPanel, onToggleMemoryPanel, onTogglePromptOptimizePanel]);

  useEffect(() => {
    const hasOpenPanel = showToolPanel || showMemoryPanel || showPromptOptimizePanel;
    if (!hasOpenPanel) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        handleEscClose();
      }
    };
    
    // 添加全局键盘监听
    document.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [showToolPanel, showMemoryPanel, showPromptOptimizePanel, handleEscClose]);

  // 检查是否有面板打开
  const hasOpenPanel = showToolPanel || showMemoryPanel || showPromptOptimizePanel;

  if (!hasOpenPanel) {
    return null;
  }

  return (
    <div className="absolute bottom-full left-0 right-0 z-50">
      <div className="max-w-4xl mx-auto px-4 pb-4">
        {/* 面板容器 - 统一布局在输入组件上方，适配输入组件宽度 */}
        <div className="space-y-4">
          {/* 提示词优化面板 */}
          {showPromptOptimizePanel && (
            <div className="w-full">
              <PromptOptimizePanel
                onInsertText={onInsertText}
                onToggle={onTogglePromptOptimizePanel || (() => {})}
              />
            </div>
          )}
          
          {/* 工具设置面板 */}
          {showToolPanel && enableTools && (
            <div className="w-full">
              <ToolPanel
                allTools={allTools}
                selectedTools={selectedTools}
                onToolSelection={onToolSelection}
                onToggle={onToggleToolPanel || (() => {})}
              />
            </div>
          )}
          
          {/* 记忆面板 */}
          {showMemoryPanel && (
            <div className="w-full">
              <MemoryPanel 
                conversationId={conversationId || null}
                agentId={selectedAgentId}
                isVisible={true}
                onToggle={onToggleMemoryPanel || (() => {})}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}