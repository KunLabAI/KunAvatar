'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface DownloadProgress {
  digest: string;
  total: number;
  completed: number;
}

export interface DownloadState {
  modelName: string;
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
}

interface DownloadManagerContextType {
  downloadState: DownloadState;
  startDownload: (modelName: string, abortController: AbortController) => void;
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
};

export function DownloadManagerProvider({ children }: { children: ReactNode }) {
  const [downloadState, setDownloadState] = useState<DownloadState>(initialDownloadState);

  const startDownload = useCallback((modelName: string, abortController: AbortController) => {
    setDownloadState(prev => ({
      ...prev,
      modelName,
      isActive: true,
      isCompleted: false,
      hasError: false,
      progress: [],
      currentStatus: '开始下载...',
      startTime: Date.now(),
      downloadSpeed: '',
      elapsedTime: '0:00',
      isMinimized: false,
      abortController,
    }));
  }, []);

  const updateProgress = useCallback((progress: DownloadProgress[] | ((prev: DownloadProgress[]) => DownloadProgress[])) => {
    setDownloadState(prev => ({
      ...prev,
      progress: typeof progress === 'function' ? progress(prev.progress) : progress,
    }));
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