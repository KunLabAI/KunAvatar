'use client';

import React from 'react';
import { Server } from 'lucide-react';
import { BaseControlButton } from './BaseControlButton';

interface ToolControlProps {
  enableTools: boolean;
  isCheckingModel: boolean;
  modelSupportsTools: boolean | null;
  showToolSettings?: boolean; // 保持兼容性
  selectedToolsCount: number;
  onToolsToggle: () => void;
  onShowToolSettings?: (show: boolean) => void; // 保持兼容性
  
  // 新的面板管理属性
  isOpen?: boolean;
  onToggle?: () => void;
}

export function ToolControl({
  enableTools,
  isCheckingModel,
  modelSupportsTools,
  showToolSettings,
  selectedToolsCount,
  onToolsToggle,
  onShowToolSettings,
  isOpen,
  onToggle,
}: ToolControlProps) {
  
  const handleClick = () => {
    // 如果模型不支持工具调用，则不执行任何操作
    if (modelSupportsTools === false) {
      return;
    }
    
    if (enableTools) {
      // 如果工具已启用，点击切换设置面板
      if (onToggle) {
        // 使用新的面板管理器
        onToggle();
      } else if (onShowToolSettings) {
        // 兼容旧的方式
        onShowToolSettings(!showToolSettings);
      }
    } else {
      // 如果工具未启用，点击启用工具
      onToolsToggle();
    }
  };

  // 判断按钮是否应该被禁用
  const isDisabled = isCheckingModel || modelSupportsTools === false;

  // 确定工具提示文本
  const getTooltip = () => {
    if (isCheckingModel) {
      return '正在检测模型工具支持...';
    }
    if (modelSupportsTools === false) {
      return '当前模型不支持工具调用，请选择其他模型';
    }
    if (enableTools) {
      const panelOpen = isOpen !== undefined ? isOpen : showToolSettings;
      return panelOpen ? '关闭工具设置面板' : '打开工具设置面板';
    }
    return '启用MCP工具调用功能';
  };

  // 确定状态指示器
  const getStatusIndicator = () => {
    if (modelSupportsTools === null) return undefined;
    
    return {
      status: modelSupportsTools ? 'success' as const : 'error' as const,
      position: 'top-right' as const,
      tooltip: modelSupportsTools ? '模型支持工具调用' : '模型不支持工具调用',
    };
  };

  // 确定徽章
  const getBadge = () => {
    if (!enableTools || selectedToolsCount === 0) return undefined;
    
    return {
      count: selectedToolsCount,
      position: 'top-left' as const,
      color: 'blue' as const,
    };
  };

  return (
    <BaseControlButton
      onClick={handleClick}
      disabled={isDisabled}
      active={enableTools && (modelSupportsTools === true || modelSupportsTools === null)}
      loading={isCheckingModel}
      tooltip={getTooltip()}
      badge={getBadge()}
      statusIndicator={getStatusIndicator()}
      variant="default"
    >
      <Server className="w-5 h-5" />
    </BaseControlButton>
  );
}