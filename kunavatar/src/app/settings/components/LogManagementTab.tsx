'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Download, FolderOpen, RefreshCw, AlertCircle } from 'lucide-react';
import { useNotification } from '@/components/notification';
import type { ElectronAPI } from '@/types/electron';

export function LogManagementTab() {
  const notification = useNotification();
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [logPath, setLogPath] = useState<string>('');
  const [isElectron, setIsElectron] = useState(false);

  // 检查是否在Electron环境中
  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && !!window.electronAPI);
  }, []);

  // 获取日志路径
  const fetchLogPath = useCallback(async () => {
    if (!isElectron) return;
    
    try {
      const path = await window.electronAPI!.getLogPath();
      setLogPath(path);
    } catch (error) {
      console.error('获取日志路径失败:', error);
    }
  }, [isElectron]);

  // 获取日志内容
  const fetchLogs = useCallback(async () => {
    if (!isElectron) {
      notification.warning('功能限制', '日志查看功能仅在桌面应用中可用');
      return;
    }

    setLoading(true);
    try {
      const logContent = await window.electronAPI!.getLogs();
      setLogs(logContent);
    } catch (error) {
      console.error('获取日志失败:', error);
      notification.error('获取失败', '无法获取日志内容');
    } finally {
      setLoading(false);
    }
  }, [isElectron, notification]);

  // 导出日志
  const exportLogs = async () => {
    if (!isElectron) {
      notification.warning('功能限制', '日志导出功能仅在桌面应用中可用');
      return;
    }

    try {
      const result = await window.electronAPI!.exportLogs();
      if (result.success) {
        notification.success('导出成功', `日志已导出到: ${result.path}`);
      } else {
        notification.error('导出失败', result.error || '导出日志时发生错误');
      }
    } catch (error) {
      console.error('导出日志失败:', error);
      notification.error('导出失败', '导出日志时发生错误');
    }
  };

  // 打开日志文件夹
  const openLogFolder = async () => {
    if (!isElectron) {
      notification.warning('功能限制', '打开文件夹功能仅在桌面应用中可用');
      return;
    }

    try {
      const result = await window.electronAPI!.openLogFolder();
      if (result.success) {
        notification.success('打开成功', '日志文件夹已在文件管理器中打开');
      } else {
        notification.error('打开失败', result.error || '无法打开日志文件夹');
      }
    } catch (error) {
      console.error('打开日志文件夹失败:', error);
      notification.error('打开失败', '无法打开日志文件夹');
    }
  };

  // 初始化时获取日志路径和内容
  useEffect(() => {
    if (isElectron) {
      fetchLogPath();
      fetchLogs();
    }
  }, [isElectron, fetchLogPath, fetchLogs]);

  if (!isElectron) {
    return (
      <section className="bg-theme-background">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-theme-foreground flex items-center gap-2">
              <FileText className="w-5 h-5" />
              日志管理
            </h2>
          </div>
          
          <div className="bg-theme-card rounded-lg p-6 border border-theme-border">
            <div className="flex items-center gap-3 text-theme-foreground-muted">
              <AlertCircle className="w-5 h-5" />
              <div>
                <p className="font-medium">功能不可用</p>
                <p className="text-sm">日志管理功能仅在桌面应用中可用。</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-theme-background">
      <div className="space-y-6">
        {/* 标题 */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-theme-foreground flex items-center gap-2">
            <FileText className="w-5 h-5" />
            日志管理
          </h2>
        </div>

        {/* 日志信息卡片 */}
        <div className="bg-theme-card rounded-lg p-4 border border-theme-border">
          <h3 className="text-lg font-medium text-theme-foreground mb-4">日志信息</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-theme-foreground-muted">日志文件路径</span>
              <span className="text-theme-foreground text-sm font-mono bg-theme-background px-2 py-1 rounded">
                {logPath || '获取中...'}
              </span>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="bg-theme-card rounded-lg p-4 border border-theme-border">
          <h3 className="text-lg font-medium text-theme-foreground mb-4">日志操作</h3>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="btn-base bg-theme-primary hover:bg-theme-primary-hover text-white px-4 py-2 flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? '刷新中...' : '刷新日志'}
            </button>
            
            <button
              onClick={exportLogs}
              className="btn-base bg-green-500 hover:bg-green-600 text-white px-4 py-2 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              导出日志
            </button>
            
            <button
              onClick={openLogFolder}
              className="btn-base bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 flex items-center gap-2"
            >
              <FolderOpen className="w-4 h-4" />
              打开文件夹
            </button>
          </div>
        </div>

        {/* 日志内容 */}
        <div className="bg-theme-card rounded-lg p-4 border border-theme-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-theme-foreground">日志内容</h3>
            <span className="text-sm text-theme-foreground-muted">
              {logs ? `${logs.split('\n').length} 行` : '暂无内容'}
            </span>
          </div>
          
          <div className="bg-theme-background rounded-lg p-4 max-h-96 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-5 h-5 animate-spin text-theme-foreground-muted" />
                <span className="ml-2 text-theme-foreground-muted">加载中...</span>
              </div>
            ) : logs ? (
              <pre className="text-sm text-theme-foreground font-mono whitespace-pre-wrap break-words">
                {logs}
              </pre>
            ) : (
              <div className="text-center py-8 text-theme-foreground-muted">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>暂无日志内容</p>
                <p className="text-sm">点击&ldquo;刷新日志&rdquo;按钮获取最新日志</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}