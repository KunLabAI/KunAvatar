'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, Check, Download } from 'lucide-react';
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

interface SelectionArea {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  isDragging: boolean;
}

export function ScreenshotControl({
  onScreenshotTaken,
  disabled = false,
  tooltip = '截图',
  isCheckingModel = false,
  modelSupportsVision = null,
  onValidationError
}: ScreenshotControlProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [currentScreenshot, setCurrentScreenshot] = useState<string | null>(null);
  const [selection, setSelection] = useState<SelectionArea | null>({
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    isDragging: false
  });
  const overlayRef = useRef<HTMLDivElement>(null);
  const onScreenshotTakenRef = useRef(onScreenshotTaken);
  
  // 保持回调函数的最新引用
  useEffect(() => {
    onScreenshotTakenRef.current = onScreenshotTaken;
  }, [onScreenshotTaken]);

  // Electron 覆盖窗口事件监听
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
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
      };
      
      // 监听截图选择事件（现在只需要设置capturing状态）
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
    }
  }, []); // 移除onScreenshotTaken依赖，使用ref保持最新引用

  const handleClick = async () => {
    // 如果模型不支持多模态，显示错误提示
    if (modelSupportsVision === false) {
      onValidationError?.(
        '截图功能不可用', 
        '当前模型不支持多模态功能，请选择支持图片识别的模型（如 llava、bakllava 等）。'
      );
      return;
    }
    
    if (disabled) return;
    
    // 检查是否在 Electron 环境中
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      try {
        // 在 Electron 中创建全屏覆盖窗口
        const result = await (window as any).electronAPI.createScreenshotOverlay();
        if (!result.success) {
          throw new Error(result.error || '创建截图覆盖窗口失败');
        }
      } catch (error) {
        console.error('创建截图覆盖窗口失败:', error);
        // 降级到浏览器模式
        setShowOverlay(true);
      }
    } else {
      // 浏览器环境，使用 DOM 覆盖层
      setShowOverlay(true);
    }
  };

  // 鼠标按下事件
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setSelection({
      startX: x,
      startY: y,
      endX: x,
      endY: y,
      isDragging: true
    });
  }, []);

  // 鼠标移动事件
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!selection?.isDragging) return;
    
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setSelection(prev => ({
      ...(prev || { startX: 0, startY: 0, endX: 0, endY: 0, isDragging: false }),
      endX: x,
      endY: y
    }));
  }, [selection?.isDragging]);

  // 鼠标释放事件
  const handleMouseUp = useCallback(() => {
    setSelection(prev => ({
      ...(prev || { startX: 0, startY: 0, endX: 0, endY: 0, isDragging: false }),
      isDragging: false
    }));
  }, []);

  // 确认截图
  const handleConfirmCapture = async () => {
    setIsCapturing(true);
    
    try {
      // 检查是否在 Electron 环境中
       if (typeof window !== 'undefined' && (window as any).electronAPI) {
         const electronAPI = (window as any).electronAPI;
        
         // 创建截图覆盖窗口
         await electronAPI.createScreenshotOverlay();
        
         // 重置状态，等待用户在覆盖窗口中选择区域
         setIsCapturing(false);
         setShowOverlay(false);
         setSelection(null);
         return;
       } else {
        // 浏览器环境，使用原有的 getDisplayMedia API
        // 计算选择区域的实际坐标和尺寸
        if (!selection) return;
        const left = Math.min(selection.startX, selection.endX);
        const top = Math.min(selection.startY, selection.endY);
        const width = Math.abs(selection.endX - selection.startX);
        const height = Math.abs(selection.endY - selection.startY);
        
        // 检查浏览器是否支持屏幕捕获API
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          throw new Error('您的浏览器不支持屏幕捕获功能');
        }

        // 请求屏幕捕获权限
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        } as any);

        // 创建video元素来捕获画面
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();

        // 等待视频加载
        await new Promise((resolve) => {
          video.onloadedmetadata = resolve;
        });

        // 创建canvas来绘制截图
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('无法创建画布上下文');
        }

        // 如果选择区域有效，截取选择区域；否则截取整个屏幕
        if (width > 10 && height > 10) {
          canvas.width = width;
          canvas.height = height;
          
          // 计算缩放比例
          const scaleX = video.videoWidth / window.screen.width;
          const scaleY = video.videoHeight / window.screen.height;
          
          // 绘制选定区域到canvas
          ctx.drawImage(
            video,
            left * scaleX, top * scaleY, width * scaleX, height * scaleY,
            0, 0, width, height
          );
        } else {
          // 截取整个屏幕
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
        }

        // 停止视频流
        stream.getTracks().forEach(track => track.stop());

        // 转换为图片数据URL
        const imageDataUrl = canvas.toDataURL('image/png', 0.9);
        
        // 保存截图数据用于下载
        setCurrentScreenshot(imageDataUrl);
        
        // 调用回调函数，将截图传递给父组件
        onScreenshotTaken(imageDataUrl);
        
        // 关闭覆盖层
        setShowOverlay(false);
      }
      
    } catch (error) {
      console.error('截图失败:', error);
      onValidationError?.(
        '截图失败',
        error instanceof Error ? error.message : '未知错误，请重试'
      );
    } finally {
      setIsCapturing(false);
    }
  };

  // 取消截图
  const handleCancelCapture = () => {
    setShowOverlay(false);
    setCurrentScreenshot(null);
    setSelection({
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
      isDragging: false
    });
  };

  // 下载截图 - 直接进行截图和下载
  const handleDownloadScreenshot = async () => {
    if (!selection || isCapturing) return;
    
    try {
      setIsCapturing(true);
      
      const left = Math.min(selection.startX, selection.endX);
      const top = Math.min(selection.startY, selection.endY);
      const width = Math.abs(selection.endX - selection.startX);
      const height = Math.abs(selection.endY - selection.startY);
      
      // 检查浏览器是否支持屏幕捕获API
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('您的浏览器不支持屏幕捕获功能');
      }

      // 请求屏幕捕获权限
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      } as any);

      // 创建video元素来捕获画面
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      // 等待视频加载
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      // 创建canvas来绘制截图
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('无法创建画布上下文');
      }

      // 如果选择区域有效，截取选择区域；否则截取整个屏幕
      if (width > 10 && height > 10) {
        canvas.width = width;
        canvas.height = height;
        
        // 计算缩放比例
        const scaleX = video.videoWidth / window.screen.width;
        const scaleY = video.videoHeight / window.screen.height;
        
        // 绘制选定区域到canvas
        ctx.drawImage(
          video,
          left * scaleX, top * scaleY, width * scaleX, height * scaleY,
          0, 0, width, height
        );
      } else {
        // 截取整个屏幕
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
      }

      // 停止视频流
      stream.getTracks().forEach(track => track.stop());

      // 转换为图片数据URL
      const imageDataUrl = canvas.toDataURL('image/png', 0.9);
      
      // 尝试使用File System Access API（如果支持）来弹出保存对话框
      if ('showSaveFilePicker' in window) {
        try {
          // 使用现代的文件保存API
          const fileHandle = await (window as any).showSaveFilePicker({
            suggestedName: `screenshot-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`,
            types: [{
              description: 'PNG图片',
              accept: { 'image/png': ['.png'] }
            }]
          });
          
          // 将base64转换为blob
          const response = await fetch(imageDataUrl);
          const blob = await response.blob();
          
          // 写入文件
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          
          console.log('截图已保存');
        } catch (err) {
          // 用户取消了保存或发生错误，回退到传统下载方式
          if ((err as Error).name !== 'AbortError') {
            console.warn('使用File System Access API失败，回退到传统下载:', err);
            // 回退到传统下载方式
            const link = document.createElement('a');
            link.href = imageDataUrl;
            link.download = `screenshot-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }
      } else {
        // 浏览器不支持File System Access API，使用传统下载方式
        const link = document.createElement('a');
        link.href = imageDataUrl;
        link.download = `screenshot-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      // 关闭覆盖层
      setShowOverlay(false);
      
    } catch (error) {
      console.error('下载截图失败:', error);
      onValidationError?.(
        '下载截图失败',
        error instanceof Error ? error.message : '未知错误，请重试'
      );
    } finally {
      setIsCapturing(false);
    }
  };

  // 计算选择框的样式
  const getSelectionStyle = () => {
    if (!selection) return { left: '0px', top: '0px', width: '0px', height: '0px' };
    const left = Math.min(selection.startX, selection.endX);
    const top = Math.min(selection.startY, selection.endY);
    const width = Math.abs(selection.endX - selection.startX);
    const height = Math.abs(selection.endY - selection.startY);
    
    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`
    };
  };

  // 计算操作按钮的位置（带边界检测）
  const getActionButtonsStyle = () => {
    if (!selection) return { top: '16px', right: '16px' };
    
    const selectionLeft = Math.min(selection.startX, selection.endX);
    const selectionTop = Math.min(selection.startY, selection.endY);
    const selectionWidth = Math.abs(selection.endX - selection.startX);
    const selectionHeight = Math.abs(selection.endY - selection.startY);
    
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // 按钮区域的预估尺寸
    const buttonWidth = 200; // 预估按钮宽度（取消+确认按钮）
    const buttonHeight = 50; // 预估按钮高度
    
    let buttonLeft = selectionLeft + selectionWidth + 16; // 默认在选择区域右侧
    let buttonTop = selectionTop;
    
    // 检查右边界
    if (buttonLeft + buttonWidth > screenWidth - 20) {
      // 如果右侧空间不足，放在选择区域左侧
      buttonLeft = selectionLeft - buttonWidth - 16;
      // 如果左侧也不够，则贴着右边界
      if (buttonLeft < 20) {
        buttonLeft = screenWidth - buttonWidth - 20;
      }
    }
    
    // 检查下边界
    if (buttonTop + buttonHeight > screenHeight - 20) {
      // 如果下方空间不足，向上调整
      buttonTop = screenHeight - buttonHeight - 20;
    }
    
    // 确保不超出上边界和左边界
    buttonTop = Math.max(20, buttonTop);
    buttonLeft = Math.max(20, buttonLeft);
    
    return {
      left: `${buttonLeft}px`,
      top: `${buttonTop}px`
    };
  };

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showOverlay) {
        if (e.key === 'Escape') {
          handleCancelCapture();
        } else if (e.key === 'Enter') {
          // 在 Electron 环境下，Enter 键确认操作应该在覆盖窗口中处理
          // 在浏览器环境下，Enter 键可以触发确认
          if (typeof window === 'undefined' || !(window as any).electronAPI) {
            handleConfirmCapture();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showOverlay, handleConfirmCapture, handleCancelCapture]);

  // 判断按钮是否应该被禁用
  const isDisabled = disabled || isCheckingModel || modelSupportsVision === false || isCapturing;

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

  return (
    <>
      <BaseControlButton
        onClick={handleClick}
        disabled={isDisabled}
        loading={isCapturing}
        tooltip={getTooltip()}
      >
        <Camera className="w-5 h-5" />
      </BaseControlButton>

      {/* 截图选择覆盖层 - 仅在浏览器环境中显示 */}
      {showOverlay && !(typeof window !== 'undefined' && (window as any).electronAPI) && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-50 bg-black bg-opacity-50 cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* 选择框 */}
          {selection && (selection.startX !== selection.endX || selection.startY !== selection.endY) && (
            <div
              className="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-20"
              style={getSelectionStyle()}
            >
              {/* 选择框尺寸显示 */}
              <div className="absolute -top-8 left-0 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                {Math.abs(selection.endX - selection.startX)} × {Math.abs(selection.endY - selection.startY)}
              </div>
            </div>
          )}
          
          {/* 操作按钮 */}
          <div 
            className="absolute flex gap-2"
            style={getActionButtonsStyle()}
          >
            <button
              onClick={handleCancelCapture}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
              取消 (Esc)
            </button>
            
            {/* 下载按钮 - 在有选择区域时显示 */}
            {selection && (selection.startX !== selection.endX || selection.startY !== selection.endY) && (
              <button
                onClick={handleDownloadScreenshot}
                disabled={isCapturing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {isCapturing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {isCapturing ? '下载中...' : '下载'}
              </button>
            )}
            
            {/* 在浏览器环境下显示确认按钮，在 Electron 环境下确认操作在覆盖窗口中进行 */}
            {(typeof window === 'undefined' || !(window as any).electronAPI) && (
              <button
                onClick={handleConfirmCapture}
                disabled={isCapturing}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {isCapturing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {isCapturing ? '截图中...' : '确认 (Enter)'}
              </button>
            )}
          </div>
          
          {/* 使用说明 */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white text-sm px-4 py-2 rounded-lg max-w-md text-center">
            {typeof window !== 'undefined' && (window as any).electronAPI ? (
              <div>
                <div>拖拽鼠标选择截图区域，然后在覆盖窗口中确认</div>
                <div className="text-xs text-gray-300 mt-1">
                  💡 按 Esc 取消截图
                </div>
              </div>
            ) : (
              <div>
                <div>拖拽鼠标选择截图区域，按 Enter 确认或 Esc 取消</div>
                <div className="text-xs text-gray-300 mt-1">
                  💡 点击确认后，请在浏览器弹窗中选择&quot;整个屏幕&quot;而非&quot;Chrome标签页&quot;
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}