import React from 'react';
import { Brain } from 'lucide-react';
import { BaseControlButton } from './BaseControlButton';

interface MemoryControlProps {
  isMemoryVisible?: boolean; // 保持兼容性
  onMemoryToggle?: () => void; // 保持兼容性
  conversationId: string | null;
  
  // 新的面板管理属性
  isOpen?: boolean;
  onToggle?: () => void;
}

export function MemoryControl({ 
  isMemoryVisible, 
  onMemoryToggle, 
  conversationId,
  isOpen,
  onToggle,
}: MemoryControlProps) {
  const isDisabled = !conversationId;
  const memoryVisible = isOpen !== undefined ? isOpen : isMemoryVisible;
  const handleClick = onToggle || onMemoryToggle || (() => {});
  
  return (
    <BaseControlButton
      active={memoryVisible}
      disabled={isDisabled}
      onClick={handleClick}
      tooltip={
        isDisabled 
          ? "请选择智能体查看记忆" 
          : memoryVisible 
            ? "关闭对话记忆面板" 
            : "打开对话记忆面板"
      }
      enableEscClose={false} // 禁用BaseControlButton的ESC处理，由ToolSettings统一处理
      onEscClose={onToggle}
    >
      <Brain className="w-5 h-5" />
    </BaseControlButton>
  );
}