import React from 'react';
import { Brain } from 'lucide-react';
import { BaseControlButton } from './BaseControlButton';
import { useI18n } from '@/contexts/I18nContext';

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
  const { t } = useI18n();
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
          ? t('chat.messageInput.controls.memory.selectAgentFirst') 
          : memoryVisible 
            ? t('chat.messageInput.controls.memory.closePanel') 
            : t('chat.messageInput.controls.memory.openPanel')
      }
      enableEscClose={false} // 禁用BaseControlButton的ESC处理，由ToolSettings统一处理
      onEscClose={onToggle}
    >
      <Brain className="w-5 h-5" />
    </BaseControlButton>
  );
}