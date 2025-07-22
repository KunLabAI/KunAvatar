'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';

export interface DownloadProgress {
  digest: string;
  total: number;
  completed: number;
}

export interface DownloadState {
  modelName: string;
  originalInput: string; // 新增：保存用户原始输入
  isActive: boolean;
  isCompleted: boolean;
  hasError: boolean;
  progress: DownloadProgress[];
  currentStatus: string;
  startTime: number | null;
  downloadSpeed: string;
  elapsedTime: string;
  isMinimized: boolean;
  abortController: AbortController | null;
  totalBytesDownloaded: number; // 新增：总下载字节数
  lastUpdateTime: number | null; // 新增：上次更新时间
  lastBytesDownloaded: number; // 新增：上次下载的字节数
  speedHistory: number[]; // 新增：速度历史记录，用于平滑计算
}

interface DownloadManagerContextType {
  downloadState: DownloadState;
  startDownload: (modelName: string, originalInput: string, abortController: AbortController) => void;
  updateProgress: (progress: DownloadProgress[] | ((prev: DownloadProgress[]) => DownloadProgress[])) => void;
  updateStatus: (status: string) => void;
  updateStats: (speed: string, elapsed: string) => void;
  completeDownload: () => void;
  completeDownloadWithStatus: (status: string) => void;
  errorDownload: () => void;
  cancelDownload: () => void;
  minimizeDownload: () => void;
  restoreDownload: () => void;
  resetDownload: () => void;
}

const DownloadManagerContext = createContext<DownloadManagerContextType | undefined>(undefined);

const initialDownloadState: DownloadState = {
  modelName: '',
  originalInput: '',
  isActive: false,
  isCompleted: false,
  hasError: false,
  progress: [],
  currentStatus: '',
  startTime: null,
  downloadSpeed: '',
  elapsedTime: '',
  isMinimized: false,
  abortController: null,
  totalBytesDownloaded: 0,
  lastUpdateTime: null,
  lastBytesDownloaded: 0,
  speedHistory: [],
};

export function DownloadManagerProvider({ children }: { children: ReactNode }) {
  const [downloadState, setDownloadState] = useState<DownloadState>(initialDownloadState);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 格式化时间显示
  const formatElapsedTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // 格式化下载速度
  const formatDownloadSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 计算总下载字节数
  const calculateTotalBytes = (progress: DownloadProgress[]): number => {
    return progress.reduce((total, item) => total + (item.completed || 0), 0);
  };

  // 计算平滑的下载速度（使用移动平均）
  const calculateSmoothSpeed = (speedHistory: number[], newSpeed: number): { smoothSpeed: number; newHistory: number[] } => {
    const maxHistoryLength = 5; // 保留最近5次的速度记录
    const newHistory = [...speedHistory, newSpeed];
    
    // 保持历史记录长度不超过最大值
    if (newHistory.length > maxHistoryLength) {
      newHistory.shift();
    }
    
    // 计算加权平均，最新的速度权重更高
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (let i = 0; i < newHistory.length; i++) {
      const weight = i + 1; // 权重从1开始递增，最新的权重最高
      weightedSum += newHistory[i] * weight;
      totalWeight += weight;
    }
    
    const smoothSpeed = totalWeight > 0 ? weightedSum / totalWeight : 0;
    return { smoothSpeed, newHistory };
  };

  // 实时更新下载统计
  useEffect(() => {
    if (downloadState.isActive && downloadState.startTime) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsedMs = now - downloadState.startTime!;
        const elapsedTime = formatElapsedTime(elapsedMs);

        // 计算当前总下载字节数
        const currentTotalBytes = calculateTotalBytes(downloadState.progress);
        
        // 计算下载速度
        let downloadSpeed = '计算中...';
        let newSpeedHistory = downloadState.speedHistory;
        
        if (downloadState.lastUpdateTime && now - downloadState.lastUpdateTime > 0) {
          const timeDiff = (now - downloadState.lastUpdateTime) / 1000; // 转换为秒
          const bytesDiff = currentTotalBytes - downloadState.lastBytesDownloaded;
          const instantSpeed = bytesDiff / timeDiff;
          
          // 使用平滑算法计算速度
          const { smoothSpeed, newHistory } = calculateSmoothSpeed(downloadState.speedHistory, instantSpeed);
          newSpeedHistory = newHistory;
          downloadSpeed = formatDownloadSpeed(smoothSpeed);
        }

        setDownloadState(prev => ({
          ...prev,
          elapsedTime,
          downloadSpeed,
          totalBytesDownloaded: currentTotalBytes,
          lastUpdateTime: now,
          lastBytesDownloaded: currentTotalBytes,
          speedHistory: newSpeedHistory,
        }));
      }, 1000); // 每秒更新一次

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [downloadState.isActive, downloadState.startTime, downloadState.progress]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const startDownload = useCallback((modelName: string, originalInput: string, abortController: AbortController) => {
    const now = Date.now();
    setDownloadState(prev => ({
      ...prev,
      modelName,
      originalInput,
      isActive: true,
      isCompleted: false,
      hasError: false,
      progress: [],
      currentStatus: '开始下载...',
      startTime: now,
      downloadSpeed: '计算中...',
      elapsedTime: '0:00',
      isMinimized: false,
      abortController,
      totalBytesDownloaded: 0,
      lastUpdateTime: now,
      lastBytesDownloaded: 0,
      speedHistory: [],
    }));
  }, []);

  const updateProgress = useCallback((progress: DownloadProgress[] | ((prev: DownloadProgress[]) => DownloadProgress[])) => {
    // 格式化下载速度的内部函数
    const formatDownloadSpeed = (bytesPerSecond: number): string => {
      if (bytesPerSecond === 0) return '0 B/s';
      const k = 1024;
      const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
      const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
      return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // 计算总下载字节数的内部函数
    const calculateTotalBytes = (progress: DownloadProgress[]): number => {
      return progress.reduce((total, item) => total + (item.completed || 0), 0);
    };

    // 计算平滑速度的内部函数
    const calculateSmoothSpeed = (speedHistory: number[], newSpeed: number): { smoothSpeed: number; newHistory: number[] } => {
      const maxHistoryLength = 5;
      const newHistory = [...speedHistory, newSpeed];
      
      if (newHistory.length > maxHistoryLength) {
        newHistory.shift();
      }
      
      let weightedSum = 0;
      let totalWeight = 0;
      
      for (let i = 0; i < newHistory.length; i++) {
        const weight = i + 1;
        weightedSum += newHistory[i] * weight;
        totalWeight += weight;
      }
      
      const smoothSpeed = totalWeight > 0 ? weightedSum / totalWeight : 0;
      return { smoothSpeed, newHistory };
    };

    setDownloadState(prev => {
      const newProgress = typeof progress === 'function' ? progress(prev.progress) : progress;
      const now = Date.now();
      const currentTotalBytes = calculateTotalBytes(newProgress);
      
      // 计算下载速度（如果有上次更新时间）
      let downloadSpeed = prev.downloadSpeed;
      let newSpeedHistory = prev.speedHistory;
      
      if (prev.lastUpdateTime && now - prev.lastUpdateTime > 0) {
        const timeDiff = (now - prev.lastUpdateTime) / 1000;
        const bytesDiff = currentTotalBytes - prev.lastBytesDownloaded;
        const instantSpeed = bytesDiff / timeDiff;
        
        // 使用平滑算法计算速度
        const { smoothSpeed, newHistory } = calculateSmoothSpeed(prev.speedHistory, instantSpeed);
        newSpeedHistory = newHistory;
        downloadSpeed = formatDownloadSpeed(smoothSpeed);
      }

      return {
        ...prev,
        progress: newProgress,
        totalBytesDownloaded: currentTotalBytes,
        lastUpdateTime: now,
        lastBytesDownloaded: currentTotalBytes,
        downloadSpeed,
        speedHistory: newSpeedHistory,
      };
    });
  }, []);

  const updateStatus = useCallback((status: string) => {
    setDownloadState(prev => ({
      ...prev,
      currentStatus: status,
    }));
  }, []);

  const updateStats = useCallback((speed: string, elapsed: string) => {
    setDownloadState(prev => ({
      ...prev,
      downloadSpeed: speed,
      elapsedTime: elapsed,
    }));
  }, []);

  const completeDownload = useCallback(() => {
    setDownloadState(prev => ({
      ...prev,
      isActive: false,
      isCompleted: true,
      hasError: false,
      currentStatus: '下载完成',
    }));
  }, []);

  const completeDownloadWithStatus = useCallback((status: string) => {
    setDownloadState(prev => ({
      ...prev,
      isActive: false,
      isCompleted: true,
      hasError: false,
      currentStatus: status,
    }));
  }, []);

  const errorDownload = useCallback(() => {
    setDownloadState(prev => ({
      ...prev,
      isActive: false,
      isCompleted: false,
      hasError: true,
      currentStatus: '下载失败',
    }));
  }, []);

  const cancelDownload = useCallback(() => {
    setDownloadState(prev => {
      if (prev.abortController) {
        prev.abortController.abort();
      }
      return {
        ...prev,
        isActive: false,
        isCompleted: false,
        hasError: false,
        currentStatus: '已取消',
      };
    });
  }, []);

  const minimizeDownload = useCallback(() => {
    setDownloadState(prev => ({
      ...prev,
      isMinimized: true,
    }));
  }, []);

  const restoreDownload = useCallback(() => {
    setDownloadState(prev => ({
      ...prev,
      isMinimized: false,
    }));
  }, []);

  const resetDownload = useCallback(() => {
    setDownloadState(initialDownloadState);
  }, []);

  const value: DownloadManagerContextType = {
    downloadState,
    startDownload,
    updateProgress,
    updateStatus,
    updateStats,
    completeDownload,
    completeDownloadWithStatus,
    errorDownload,
    cancelDownload,
    minimizeDownload,
    restoreDownload,
    resetDownload,
  };

  return (
    <DownloadManagerContext.Provider value={value}>
      {children}
    </DownloadManagerContext.Provider>
  );
}

export function useDownloadManager() {
  const context = useContext(DownloadManagerContext);
  if (context === undefined) {
    throw new Error('useDownloadManager must be used within a DownloadManagerProvider');
  }
  return context;
}