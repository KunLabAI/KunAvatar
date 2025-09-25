'use client';

import React, { useState } from 'react';
import { Eraser, AlertTriangle } from 'lucide-react';
import { BaseControlButton } from './BaseControlButton';
import Modal from '@/components/Modal';
import { useI18n } from '@/contexts/I18nContext';

interface ChatActionsControlProps {
  onClearChat: () => void;
}

export function ChatActionsControl({ onClearChat }: ChatActionsControlProps) {
  const { t } = useI18n();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // 处理清除对话点击
  const handleClearClick = () => {
    setShowConfirmModal(true);
  };

  // 确认清除对话
  const handleConfirmClear = () => {
    setShowConfirmModal(false);
    onClearChat();
  };

  // 取消清除
  const handleCancelClear = () => {
    setShowConfirmModal(false);
  };

  return (
    <>
      <BaseControlButton
        onClick={handleClearClick}
        tooltip={t('chat.messageInput.controls.chatActions.clearChat')}
        variant="danger"
      >
        <Eraser className="w-5 h-5" />
      </BaseControlButton>

      {/* 确认清除对话的Modal */}
      <Modal
        open={showConfirmModal}
        onClose={handleCancelClear}
        title={t('chat.messageInput.controls.chatActions.confirmClearTitle')}
        icon={<AlertTriangle className="text-yellow-500" />}
        actions={[
          {
            label: t('chat.messageInput.controls.chatActions.cancel'),
            onClick: handleCancelClear,
            variant: 'secondary',
          },
          {
            label: t('chat.messageInput.controls.chatActions.confirmClear'),
            onClick: handleConfirmClear,
            variant: 'danger',
            autoFocus: true,
          },
        ]}
      >
        {t('chat.messageInput.controls.chatActions.confirmClearMessage')}
      </Modal>
    </>
  );
}