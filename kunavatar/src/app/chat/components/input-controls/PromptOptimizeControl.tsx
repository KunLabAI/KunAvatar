'use client';

import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { BaseControlButton } from './BaseControlButton';
import { usePromptOptimizeSettings } from '../../../settings/hooks/usePromptOptimizeSettings';

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

  // 直接优化当前输入框的内容
  const handleOptimize = async () => {
    const textToOptimize = currentText.trim();
    if (!textToOptimize || isOptimizing || disabled) return;
    
    // 检查设置是否启用
    if (!settings.promptEnabled || !settings.promptModel) {
      console.warn('提示词优化功能未启用或未配置模型');
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
        const errorMessage = errorData.error || '优化失败';
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || '优化失败');
      }
      
      // 直接替换输入框内容
      onTextChange(data.optimizedText);
    } catch (error) {
      console.error('优化提示词失败:', error);
      
      // 显示具体的错误信息
      const errorMessage = error instanceof Error ? error.message : '优化失败';
      
      // 这里可以添加toast通知或其他用户友好的错误提示
      // 暂时使用alert，后续可以替换为更好的UI组件
      alert(`提示词优化失败：${errorMessage}`);
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
          ? "正在优化..." 
          : !currentText.trim() 
          ? "请先输入内容" 
          : !settings.promptEnabled || !settings.promptModel
          ? "请先在设置中配置提示词优化"
          : "优化当前输入的提示词"
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