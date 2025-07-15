'use client';

import { useState, useEffect, useCallback } from 'react';

// 面板类型定义
export type PanelType = 'tool-settings' | 'memory' | 'prompt-optimize' | null;

// 面板管理器接口
interface PanelManagerState {
  activePanel: PanelType;
  openPanel: (panel: PanelType) => void;
  closePanel: () => void;
  togglePanel: (panel: PanelType) => void;
  isPanelOpen: (panel: PanelType) => boolean;
}

/**
 * 统一的面板管理Hook
 * 实现以下功能：
 * 1. 统一操作点击后打开面板，再次点击关闭面板
 * 2. ESC键关闭面板
 * 3. 每次只能打开一个面板
 */
export function usePanelManager(): PanelManagerState {
  const [activePanel, setActivePanel] = useState<PanelType>(null);

  // 打开指定面板
  const openPanel = useCallback((panel: PanelType) => {
    setActivePanel(panel);
  }, []);

  // 关闭当前面板
  const closePanel = useCallback(() => {
    setActivePanel(null);
  }, []);

  // 切换面板状态
  const togglePanel = useCallback((panel: PanelType) => {
    if (activePanel === panel) {
      // 如果当前面板已打开，则关闭
      setActivePanel(null);
    } else {
      // 否则打开指定面板（会自动关闭其他面板）
      setActivePanel(panel);
    }
  }, [activePanel]);

  // 检查指定面板是否打开
  const isPanelOpen = useCallback((panel: PanelType) => {
    return activePanel === panel;
  }, [activePanel]);

  // ESC键关闭面板
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && activePanel) {
        event.preventDefault();
        setActivePanel(null);
      }
    };

    if (activePanel) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activePanel]);

  return {
    activePanel,
    openPanel,
    closePanel,
    togglePanel,
    isPanelOpen,
  };
}