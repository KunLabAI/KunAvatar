'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';
import { BaseControlButton } from './BaseControlButton';

interface ChatActionsControlProps {
  onClearChat: () => void;
}

export function ChatActionsControl({ onClearChat }: ChatActionsControlProps) {
  return (
    <BaseControlButton
      onClick={onClearChat}
      tooltip="清空当前对话"
      variant="danger"
    >
      <Trash2 className="w-5 h-5" />
    </BaseControlButton>
  );
} 