'use client';

import React from 'react';
import Modal, { ModalAction } from './Modal';

interface OllamaNotificationProps {
  open: boolean;
  onClose: () => void;
  onRetry?: () => void;
}

export default function OllamaNotification({ 
  open, 
  onClose, 
  onRetry 
}: OllamaNotificationProps) {
  const handleDownload = () => {
    window.open('https://ollama.com/download', '_blank');
  };

  const actions: ModalAction[] = [
    {
      label: '下次登录提醒',
      onClick: onClose,
      variant: 'secondary'
    },
    {
      label: '重新检测',
      onClick: () => {
        if (onRetry) onRetry();
      },
      variant: 'secondary'
    },
    {
      label: '前往下载',
      onClick: handleDownload,
      variant: 'primary',
      autoFocus: true
    }
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ollama 客户端未运行"
      icon="🤖"
      actions={actions}
      width={480}
      closeOnEsc={true}
      closeOnBackdrop={false}
    >
      <div className="space-y-4">
        <div className="text-theme-foreground-secondary">
          <p className="mb-3">
            检测到 Ollama 客户端未运行或未安装。Kun Avatar 需要 Ollama 来提供 AI 模型服务。
          </p>
          
          <div className="bg-theme-background-secondary rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-theme-foreground text-sm">📋 安装步骤：</h4>
            <ol className="text-sm space-y-2 text-theme-foreground-secondary">
              <li className="flex items-start gap-2">
                <span className="bg-theme-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">1</span>
                <span>访问 <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer" className="text-theme-primary hover:underline">ollama.com/download</a> 下载客户端</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-theme-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">2</span>
                <span>安装并启动 Ollama 客户端</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-theme-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">3</span>
                <span>下载模型：<code className="bg-theme-background px-2 py-1 rounded text-xs">ollama pull llama3.2</code></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-theme-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">4</span>
                <span>点击&ldquo;重新检测&rdquo;按钮</span>
              </li>
            </ol>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-3">
            <div className="flex items-start gap-2">
              <span className="text-amber-600 dark:text-amber-400 text-sm">⚠️</span>
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-1">注意事项：</p>
                <ul className="space-y-1 text-xs">
                  <li>• 确保 Ollama 服务正在运行（默认端口：11434）</li>
                  <li>• 首次使用需要下载模型，可能需要较长时间</li>
                  <li>• 建议至少有 8GB 可用内存</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}