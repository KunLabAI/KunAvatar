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
  
  // 验证错误提示
  onValidationError?: (title: string, message: string) => void;
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
  onValidationError,
}: ToolControlProps) {
  
  const handleClick = () => {
    // 如果模型不支持工具调用，显示错误提示
    if (modelSupportsTools === false) {
      onValidationError?.(
        'MCP工具不可用', 
        '当前模型不支持工具调用功能，请选择支持工具调用的模型。'
      );
      return;
    }
    
    if (enableTools) {
      // 如果工具已启用，点击切换设置面板
      if (onToggle) {
        // 使用新的面板管理器 - 直接切换面板状态
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
      return panelOpen ? '关闭MCP工具面板' : '打开MCP工具面板';
    }
    return '启用MCP工具调用功能';
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
      variant="default"
      enableEscClose={false} // 禁用BaseControlButton的ESC处理，由ToolSettings统一处理
      onEscClose={onToggle}
    >
      <Server className="w-5 h-5" />
    </BaseControlButton>
  );
}