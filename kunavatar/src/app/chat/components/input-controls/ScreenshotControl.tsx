'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SquareDashedMousePointer } from 'lucide-react';
import { BaseControlButton } from './BaseControlButton';

interface ScreenshotControlProps {
  onScreenshotTaken: (imageDataUrl: string) => void;
  disabled?: boolean;
  tooltip?: string;
  
  // 模型验证相关
  isCheckingModel?: boolean;
  modelSupportsVision?: boolean | null;
  onValidationError?: (title: string, message: string) => void;
}

export function ScreenshotControl({
  onScreenshotTaken,
  disabled = false,
  tooltip = '截图 (Alt+Z)',
  isCheckingModel = false,
  modelSupportsVision = null,
  onValidationError
}: ScreenshotControlProps) {
  // 所有 Hooks 必须在组件顶部调用
  const [isCapturing, setIsCapturing] = useState(false);
  const onScreenshotTakenRef = useRef(onScreenshotTaken);
  
  // 检查是否在 Electron 环境中
  const isElectronEnvironment = typeof window !== 'undefined' && (window as any).electronAPI;
  
  // 保持回调函数的最新引用
  useEffect(() => {
    onScreenshotTakenRef.current = onScreenshotTaken;
  }, [onScreenshotTaken]);

  // Electron 覆盖窗口事件监听
  useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    
    // 监听截图完成事件
    const handleScreenshotTaken = (imageDataUrl: string) => {
      console.log('收到截图完成事件，数据长度:', imageDataUrl.length);
      setIsCapturing(false);
      console.log('调用onScreenshotTaken回调');
      onScreenshotTakenRef.current(imageDataUrl);
      console.log('截图处理完成');
    };
    
    // 监听截图错误事件
    const handleScreenshotError = (error: string) => {
      setIsCapturing(false);
      console.error('截图失败:', error);
      onValidationError?.('截图失败', error);
    };
    
    // 监听截图选择事件
    const handleScreenshotSelection = (selection: { x: number; y: number; width: number; height: number }) => {
      setIsCapturing(true);
      console.log('收到截图选择事件:', selection);
    };
    
    // 监听取消事件
    const handleScreenshotCancel = () => {
      setIsCapturing(false);
      console.log('截图已取消');
    };
    
    // 注册事件监听器
    electronAPI.onScreenshotSelection?.(handleScreenshotSelection);
    electronAPI.onScreenshotCancel?.(handleScreenshotCancel);
    electronAPI.onScreenshotTaken?.(handleScreenshotTaken);
    electronAPI.onScreenshotError?.(handleScreenshotError);
    
    // 清理函数 - 移除所有截图相关的事件监听器
    return () => {
      console.log('清理截图事件监听器');
      if (electronAPI.removeAllListeners) {
        electronAPI.removeAllListeners('screenshot-selection');
        electronAPI.removeAllListeners('screenshot-cancel');
        electronAPI.removeAllListeners('screenshot-taken');
        electronAPI.removeAllListeners('screenshot-error');
      }
    };
  }, [onValidationError]);

  const handleClick = useCallback(async () => {
    // 如果模型不支持多模态，显示错误提示
    if (modelSupportsVision === false) {
      onValidationError?.(
        '截图功能不可用', 
        '当前模型不支持多模态功能，请选择支持图片识别的模型（如 llava、bakllava 等）。'
      );
      return;
    }
    
    if (disabled) return;
    
    try {
      // 在 Electron 中创建全屏覆盖窗口
      const result = await (window as any).electronAPI.createScreenshotOverlay();
      if (!result.success) {
        throw new Error(result.error || '创建截图覆盖窗口失败');
      }
    } catch (error) {
      console.error('创建截图覆盖窗口失败:', error);
      onValidationError?.('截图失败', error instanceof Error ? error.message : '创建截图覆盖窗口失败');
    }
  }, [modelSupportsVision, disabled, onValidationError]);

  // 判断按钮是否应该被禁用
  const isDisabled = disabled || isCheckingModel || modelSupportsVision === false || isCapturing;

  // 全局键盘快捷键监听 (Alt+Z)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 检查是否按下了 Alt+Z
      if (event.altKey && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        event.stopPropagation();
        
        // 检查是否可以执行截图
        if (!isDisabled && !isCapturing) {
          handleClick();
        }
      }
    };

    // 添加全局键盘事件监听
    document.addEventListener('keydown', handleKeyDown);
    
    // 清理函数
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDisabled, isCapturing, handleClick]); // 依赖于按钮状态和handleClick函数

  // 确定工具提示文本
  const getTooltip = () => {
    if (isCheckingModel) {
      return '正在检测模型多模态支持...';
    }
    if (modelSupportsVision === false) {
      return '当前模型不支持图片识别';
    }
    if (isCapturing) {
      return '正在截图...';
    }
    return tooltip;
  };

  // 在非 Electron 环境下不显示截图按钮
  if (!isElectronEnvironment) {
    return null;
  }

  return (
    <BaseControlButton
      onClick={handleClick}
      disabled={isDisabled}
      loading={isCapturing}
      tooltip={getTooltip()}
    >
      <SquareDashedMousePointer className="w-5 h-5" />
    </BaseControlButton>
  );
}