'use client';

import React, { useEffect, useState } from 'react';
import CustomTitleBar from './CustomTitleBar';
import type { ElectronAPI } from '@/types/electron';

interface ElectronLayoutProps {
  children: React.ReactNode;
  className?: string;
  showTitleBar?: boolean;
  titleBarTitle?: string;
  showTitleBarTitle?: boolean;
}

export function ElectronLayout({ 
  children, 
  className = '',
  showTitleBar = true,
  titleBarTitle = '',
  showTitleBarTitle = false
}: ElectronLayoutProps) {
  // 使用状态来跟踪是否已挂载，避免水合错误
  const [isMounted, setIsMounted] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // 组件挂载后检查是否在 Electron 环境中
    setIsMounted(true);
    setIsElectron(typeof window !== 'undefined' && !!window.electronAPI);
  }, []);

  useEffect(() => {
    // 只在 Electron 环境中设置拖拽区域
    if (isMounted && isElectron && window.electronAPI?.setupSmartDragRegion) {
      // 设置智能拖拽区域
      window.electronAPI.setupSmartDragRegion({
        headerSelectors: [
          'header',
          '.header',
          '.title-bar',
          '.app-header',
          '.page-header'
        ],
        excludeSelectors: [
          'button',
          'input',
          'select',
          'textarea',
          'a',
          '.interactive',
          '.no-drag',
          '.sidebar-button',
          '.titlebar-button'
        ],
        dragClass: 'drag-region'
      });
    }
  }, [isMounted, isElectron]);

  // 在挂载前或非 Electron 环境中，使用统一的布局结构
  if (!isMounted || !isElectron) {
    return (
      <div className={`min-h-screen ${className}`}>
        {children}
      </div>
    );
  }

  // Electron 环境中的完整布局
  return (
    <div className={`electron-layout flex flex-col h-screen min-h-screen ${className}`}>
      {/* 自定义标题栏 */}
      {showTitleBar && (
        <CustomTitleBar 
          title={titleBarTitle}
          showTitle={showTitleBarTitle}
          className="flex-shrink-0"
        />
      )}
      
      {/* 主内容区域 */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// 导出类型定义
export type { ElectronLayoutProps };