'use client';

import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Maximize2, Minimize2, PanelsTopLeft, PanelLeftDashed } from 'lucide-react';
import { useCleanMode } from '@/contexts/CleanModeContext';

interface CustomTitleBarProps {
  title?: string;
  showTitle?: boolean;
  className?: string;
}

interface WindowState {
  isMaximized: boolean;
  isMinimized: boolean;
  isFullScreen: boolean;
}

const CustomTitleBar: React.FC<CustomTitleBarProps> = ({ 
  title = '', 
  showTitle = false, 
  className = '' 
}) => {
  const { isCleanMode, toggleCleanMode } = useCleanMode();
  const [windowState, setWindowState] = useState<WindowState>({
    isMaximized: false,
    isMinimized: false,
    isFullScreen: false
  });

  // 使用状态来跟踪是否已挂载和平台信息，避免水合错误
  const [isMounted, setIsMounted] = useState(false);
  const [isElectron, setIsElectron] = useState(false);
  const [isMacOS, setIsMacOS] = useState(false);

  useEffect(() => {
    // 组件挂载后检查环境
    setIsMounted(true);
    setIsElectron(typeof window !== 'undefined' && !!window.electronAPI);
    setIsMacOS(typeof window !== 'undefined' && window.navigator.platform.includes('Mac'));
  }, []);

  // 获取窗口状态
  const updateWindowState = async () => {
    if (isMounted && isElectron && window.electronAPI?.getWindowState) {
      try {
        const state = await window.electronAPI.getWindowState();
        setWindowState({
          isMaximized: state.isMaximized,
          isMinimized: state.isMinimized,
          isFullScreen: state.isFullScreen
        });
      } catch (error) {
        console.error('获取窗口状态失败:', error);
      }
    }
  };

  // 窗口控制函数
  const handleMinimize = async () => {
    if (isMounted && isElectron && window.electronAPI?.minimize) {
      try {
        await window.electronAPI.minimize();
        updateWindowState();
      } catch (error) {
        console.error('最小化窗口失败:', error);
      }
    }
  };

  const handleMaximize = async () => {
    if (isMounted && isElectron && window.electronAPI?.maximize) {
      try {
        const result = await window.electronAPI.maximize();
        if (typeof result.isMaximized === 'boolean') {
          setWindowState(prev => ({
            ...prev,
            isMaximized: result.isMaximized as boolean
          }));
        }
        // 无论如何都更新一次状态
        updateWindowState();
      } catch (error) {
        console.error('最大化/还原窗口失败:', error);
      }
    }
  };

  const handleClose = async () => {
    if (isMounted && isElectron && window.electronAPI?.close) {
      try {
        await window.electronAPI.close();
      } catch (error) {
        console.error('关闭窗口失败:', error);
      }
    }
  };

  // 初始化窗口状态
  useEffect(() => {
    if (isMounted && isElectron) {
      updateWindowState();
    }
  }, [isMounted, isElectron]);

  // 如果未挂载或不在 Electron 环境中，不显示标题栏
  if (!isMounted || !isElectron) {
    return null;
  }

  return (
    <div 
      className={`custom-titlebar flex items-center justify-between h-8 bg-theme-card select-none ${className}`}
      style={{ 
        WebkitAppRegion: 'drag',
        zIndex: 100
      } as React.CSSProperties}
    >
      {/* 左侧区域 - macOS 红绿灯按钮占位 */}
      <div className="flex items-center h-full">
        {isMacOS && (
          <div className="w-20 h-full" /> // macOS 红绿灯按钮占位
        )}
        {showTitle && title && (
          <span className="text-sm text-theme-foreground-muted px-4">
            {title}
          </span>
        )}
      </div>

      {/* 中间区域 - 可拖拽 */}
      <div className="flex-1 h-full" />

      {/* 右侧控制按钮区域 */}
      <div className="flex items-center h-full">
        {/* 无边框模式切换按钮 */}
        <button
          onClick={toggleCleanMode}
          className="titlebar-button flex items-center justify-center w-12 h-8 hover:bg-theme-card-hover transition-colors duration-200"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          title={isCleanMode ? "退出无边框模式" : "进入无边框模式"}
        >
          {isCleanMode ? (
            <PanelsTopLeft className="w-4 h-4 text-theme-foreground-muted" />
          ) : (
            <PanelLeftDashed className="w-4 h-4 text-theme-foreground-muted" />
          )}
        </button>

        {/* 窗口控制按钮 - 仅在非 macOS 平台显示 */}
        {!isMacOS && (
          <>
            <button
              onClick={handleMinimize}
              className="titlebar-button flex items-center justify-center w-12 h-8 hover:bg-theme-card-hover transition-colors duration-200"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              title="最小化"
            >
              <Minus className="w-4 h-4 text-theme-foreground-muted" />
            </button>
            
            <button
              onClick={handleMaximize}
              className="titlebar-button flex items-center justify-center w-12 h-8 hover:bg-theme-card-hover transition-colors duration-200"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              title={windowState.isMaximized ? "还原" : "最大化"}
            >
              {windowState.isMaximized ? (
                <Minimize2 className="w-4 h-4 text-theme-foreground-muted" />
              ) : (
                <Maximize2 className="w-4 h-4 text-theme-foreground-muted" />
              )}
            </button>
            
            <button
              onClick={handleClose}
              className="titlebar-button flex items-center justify-center w-12 h-8 hover:bg-red-500 hover:text-white transition-colors duration-200"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              title="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CustomTitleBar;

// 导出类型定义
export type { CustomTitleBarProps, WindowState };