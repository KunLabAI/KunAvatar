'use client';

import React, { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { BaseControlButton } from './BaseControlButton';
import Modal from '@/components/Modal';

interface ChatActionsControlProps {
  onClearChat: () => void;
}

export function ChatActionsControl({ onClearChat }: ChatActionsControlProps) {
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
        tooltip="清空当前对话"
        variant="danger"
      >
        <Trash2 className="w-5 h-5" />
      </BaseControlButton>

      {/* 确认清除对话的Modal */}
      <Modal
        open={showConfirmModal}
        onClose={handleCancelClear}
        title="确认清空对话"
        icon={<AlertTriangle className="text-yellow-500" />}
        actions={[
          {
            label: '取消',
            onClick: handleCancelClear,
            variant: 'secondary',
          },
          {
            label: '确认清空',
            onClick: handleConfirmClear,
            variant: 'danger',
            autoFocus: true,
          },
        ]}
      >
        确定要清空当前对话吗？此操作将删除所有聊天记录，且无法撤销。
      </Modal>
    </>
  );
}