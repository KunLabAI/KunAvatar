'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { BaseControlButton } from './BaseControlButton';

interface PromptOptimizeControlProps {
  onInsertText: (text: string) => void;
  isOpen?: boolean;
  onToggle?: () => void;
}

export function PromptOptimizeControl({ isOpen, onToggle }: PromptOptimizeControlProps) {

  // 切换面板显示
  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    }
  };

  return (
    <BaseControlButton
      onClick={handleToggle}
      active={isOpen}
      tooltip="提示词优化"
    >
      <Sparkles className="w-4 h-4" />
    </BaseControlButton>
  );
}