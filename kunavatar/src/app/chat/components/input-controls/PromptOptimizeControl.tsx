'use client';

import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { BaseControlButton } from './BaseControlButton';
import { usePromptOptimizeSettings } from '../../../settings/hooks/usePromptOptimizeSettings';
import { useI18n } from '@/contexts/I18nContext';

interface PromptOptimizeControlProps {
  currentText: string;
  onTextChange: (text: string) => void;
  disabled?: boolean;
}

export function PromptOptimizeControl({ 
  currentText, 
  onTextChange, 
  disabled = false 
}: PromptOptimizeControlProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const { settings } = usePromptOptimizeSettings();
  const { t } = useI18n();

  // 直接优化当前输入框的内容
  const handleOptimize = async () => {
    const textToOptimize = currentText.trim();
    if (!textToOptimize || isOptimizing || disabled) return;
    
    // 检查设置是否启用
    if (!settings.promptEnabled || !settings.promptModel) {
      console.warn(t('chat.messageInput.controls.promptOptimize.notConfigured'));
      return;
    }
    
    setIsOptimizing(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/prompt-optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          text: textToOptimize,
          model: settings.promptModel,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || t('chat.messageInput.controls.promptOptimize.optimizeFailed');
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || t('chat.messageInput.controls.promptOptimize.optimizeFailed'));
      }
      
      // 直接替换输入框内容
      onTextChange(data.optimizedText);
    } catch (error) {
      console.error(t('chat.messageInput.controls.promptOptimize.optimizeFailedLog'), error);
      
      // 显示具体的错误信息
      const errorMessage = error instanceof Error ? error.message : t('chat.messageInput.controls.promptOptimize.optimizeFailed');
      
      // 这里可以添加toast通知或其他用户友好的错误提示
      // 暂时使用alert，后续可以替换为更好的UI组件
      alert(`${t('chat.messageInput.controls.promptOptimize.optimizeFailedAlert')}：${errorMessage}`);
    } finally {
      setIsOptimizing(false);
    }
  };

  // 检查是否可以优化
  const canOptimize = currentText.trim().length > 0 && 
                     settings.promptEnabled && 
                     settings.promptModel && 
                     !disabled && 
                     !isOptimizing;

  return (
    <BaseControlButton
      onClick={handleOptimize}
      active={isOptimizing}
      disabled={!canOptimize}
      tooltip={
        isOptimizing 
          ? t('chat.messageInput.controls.promptOptimize.optimizing')
          : !currentText.trim() 
          ? t('chat.messageInput.controls.promptOptimize.enterContentFirst')
          : !settings.promptEnabled || !settings.promptModel
          ? t('chat.messageInput.controls.promptOptimize.configureFirst')
          : t('chat.messageInput.controls.promptOptimize.optimizePrompt')
      }
      className="!bg-transparent hover:!bg-[var(--color-background-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isOptimizing ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <Sparkles className="w-4 h-4" />
      )}
    </BaseControlButton>
  );
}