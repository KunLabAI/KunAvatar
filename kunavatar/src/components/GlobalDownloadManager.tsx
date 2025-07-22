'use client';

import React, { useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useDownloadManager } from '@/contexts/DownloadManagerContext';
import MinimizedPullModal from '@/app/model-manager/components/MinimizedPullModal';

export function GlobalDownloadManager() {
  const {
    downloadState,
    updateStats,
    cancelDownload,
    restoreDownload,
    resetDownload,
  } = useDownloadManager();

  const lastDownloadedBytesRef = useRef(0);
  const lastUpdateTimeRef = useRef<number | null>(null);

  // 计算总进度
  const calculateTotalProgress = () => {
    if (downloadState.progress.length === 0) return 0;
    
    return downloadState.progress.reduce((sum, p) => {
      if (p.total && p.completed) {
        return sum + (p.completed / p.total);
      }
      return sum;
    }, 0) / downloadState.progress.length * 100;
  };

  // 格式化时间
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 格式化字节
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // 更新统计信息
  useEffect(() => {
    if (!downloadState.isActive || !downloadState.startTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - downloadState.startTime!) / 1000);
      const elapsedTime = formatTime(elapsed);

      // 计算总下载量
      const totalDownloaded = downloadState.progress.reduce((sum, p) => sum + (p.completed || 0), 0);
      
      // 计算实时下载速度
      let downloadSpeed = '';
      if (lastUpdateTimeRef.current && totalDownloaded > lastDownloadedBytesRef.current) {
        const timeDiff = (now - lastUpdateTimeRef.current) / 1000;
        const bytesDiff = totalDownloaded - lastDownloadedBytesRef.current;
        if (timeDiff > 0) {
          const speed = bytesDiff / timeDiff;
          downloadSpeed = formatBytes(speed) + '/s';
        }
      } else if (elapsed > 0 && totalDownloaded > 0) {
        const avgSpeed = totalDownloaded / elapsed;
        downloadSpeed = formatBytes(avgSpeed) + '/s';
      }

      updateStats(downloadSpeed, elapsedTime);
      
      // 更新记录
      lastDownloadedBytesRef.current = totalDownloaded;
      lastUpdateTimeRef.current = now;
    }, 1000);

    return () => clearInterval(interval);
  }, [downloadState.isActive, downloadState.startTime, downloadState.progress, updateStats]);

  // 处理取消下载
  const handleCancel = () => {
    if (downloadState.isActive && !downloadState.isCompleted && !downloadState.hasError) {
      if (confirm('模型正在下载中，确定要取消下载吗？')) {
        cancelDownload();
        resetDownload();
      }
    } else {
      resetDownload();
    }
  };

  // 只在最小化且有活动下载时显示
  const shouldShow = downloadState.isMinimized && 
    (downloadState.isActive || downloadState.isCompleted || downloadState.hasError) &&
    downloadState.modelName;

  return (
    <AnimatePresence>
      {shouldShow && (
        <MinimizedPullModal
          modelName={downloadState.modelName}
          totalProgress={calculateTotalProgress()}
          downloadSpeed={downloadState.downloadSpeed}
          elapsedTime={downloadState.elapsedTime}
          onRestore={restoreDownload}
          onCancel={handleCancel}
          isCompleted={downloadState.isCompleted}
          hasError={downloadState.hasError}
        />
      )}
    </AnimatePresence>
  );
}