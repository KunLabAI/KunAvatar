'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Download, AlertCircle, CheckCircle, X, Loader, Minus, ExternalLink } from 'lucide-react';
import ModalWrapper from './ModalWrapper';
import MinimizedPullModal from './MinimizedPullModal';
import { useNotification } from '@/components/notification';
import { useDownloadManager, DownloadProgress } from '@/contexts/DownloadManagerContext';
import { useThemeToggle } from '@/theme/contexts/ThemeContext';
import { useI18n } from '@/contexts/I18nContext';
import Image from 'next/image';

interface PullModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (modelName: string) => void;
}

interface PullProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
  error?: string;
}

export default function PullModelModal({ isOpen, onClose, onSuccess }: PullModelModalProps) {
  const { t } = useI18n();
  const [modelName, setModelName] = useState('');
  const [originalInput, setOriginalInput] = useState(''); // 新增：保存用户原始输入
  const [isPulling, setIsPulling] = useState(false);
  
  // 使用主题检测
  const { isDark } = useThemeToggle();
  
  // 使用全局下载管理器
  const {
    downloadState,
    startDownload,
    updateProgress,
    updateStatus,
    completeDownload,
    completeDownloadWithStatus,
    errorDownload,
    cancelDownload,
    minimizeDownload,
    restoreDownload,
    resetDownload,
    updateStats,
  } = useDownloadManager();

  // 使用通知系统
  const notification = useNotification();
  const abortControllerRef = useRef<AbortController | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 格式化文件大小
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 防抖的状态更新函数
  const debouncedUpdateStatus = useMemo(() => {
    return (status: string) => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      updateTimeoutRef.current = setTimeout(() => {
        updateStatus(status);
      }, 50); // 50ms 防抖
    };
  }, [updateStatus]);

  // 处理输入变化，自动屏蔽 "ollama run" 前缀
  const handleModelNameChange = (value: string) => {
    setOriginalInput(value); // 保存原始输入
    // 移除 "ollama run" 前缀（不区分大小写）
    const cleanedValue = value.replace(/^ollama\s+run\s+/i, '').trim();
    setModelName(cleanedValue);
  };

  // 获取显示的模型名称（优先显示完整命令，否则显示模型名称）
  const getDisplayModelName = () => {
    if (originalInput.toLowerCase().startsWith('ollama run')) {
      return originalInput;
    }
    return modelName || originalInput;
  };

  // 开始拉取模型
  const handlePullModel = async () => {
    if (!modelName.trim()) {
      notification.error(t('errors.generic'), t('settings.models.pullModelModal.messages.enterModelName'));
      return;
    }

    setIsPulling(true);
    
    // 创建新的 AbortController
    abortControllerRef.current = new AbortController();
    
    // 启动全局下载管理器，传入原始输入
    startDownload(modelName.trim(), originalInput || modelName.trim(), abortControllerRef.current);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/models/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          model: modelName.trim(),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('settings.models.pullModelModal.messages.pullFailed'));
      }

      if (!response.body) {
        throw new Error(t('settings.models.pullModelModal.messages.responseEmpty'));
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          
          // 保留最后一行（可能不完整）
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine) {
              try {
                const data: PullProgress = JSON.parse(trimmedLine);
                
                if (data.error) {
                  errorDownload();
                  updateStatus(t('settings.models.pullModelModal.status.error').replace('{message}', data.error));
                  notification.error(t('settings.models.pullModelModal.messages.pullFailedDesc'), data.error);
                  break;
                }

                // 使用防抖更新状态，减少频繁渲染
                if (data.status !== 'success') {
                  debouncedUpdateStatus(data.status);
                }

                // 更新进度
                if (data.digest && data.total && data.completed !== undefined) {
                  const downloadProgress = {
                    digest: data.digest,
                    total: data.total,
                    completed: data.completed,
                  };
                  
                  updateProgress((prev: DownloadProgress[]) => {
                    const existing = prev.find((p: DownloadProgress) => p.digest === downloadProgress.digest);
                    if (existing) {
                      return prev.map((p: DownloadProgress) => p.digest === downloadProgress.digest ? downloadProgress : p);
                    } else {
                      return [...prev, downloadProgress];
                    }
                  });
                }

                // 检查是否完成
                if (data.status === 'success') {
                  // 一次性更新完成状态，避免多次重新渲染
                  completeDownloadWithStatus(t('settings.models.pullModelModal.status.pullCompleted'));
                  
                  // 延迟执行通知和回调，避免状态更新冲突
                  setTimeout(() => {
                    notification.success(t('settings.models.pullModelModal.messages.pullSuccess'), t('settings.models.pullModelModal.messages.pullSuccessDesc').replace('{modelName}', modelName));
                    onSuccess(modelName);
                  }, 100);
                  break;
                }
              } catch (parseError) {
                console.warn('解析JSON失败:', parseError, '原始数据:', trimmedLine);
              }
            }
          }
        }

        // 处理缓冲区中剩余的数据
        if (buffer.trim()) {
          try {
            const data: PullProgress = JSON.parse(buffer.trim());
            if (data.status === 'success') {
              // 一次性更新完成状态，避免多次重新渲染
              completeDownloadWithStatus(t('settings.models.pullModelModal.status.pullCompleted'));
              
              // 延迟执行通知和回调，避免状态更新冲突
              setTimeout(() => {
                notification.success(t('settings.models.pullModelModal.messages.pullSuccess'), t('settings.models.pullModelModal.messages.pullSuccessDesc').replace('{modelName}', modelName));
                onSuccess(modelName);
              }, 100);
            }
          } catch (parseError) {
            console.warn('解析最后的JSON失败:', parseError);
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        updateStatus(t('settings.models.pullModelModal.status.pullCancelled'));
        notification.info(t('settings.models.pullModelModal.messages.cancelled'), t('settings.models.pullModelModal.messages.pullCancelledDesc'));
      } else {
        console.error('拉取模型失败:', error);
        errorDownload();
        updateStatus(t('settings.models.pullModelModal.status.error').replace('{message}', error.message));
        notification.error(t('settings.models.pullModelModal.messages.pullFailedDesc'), error.message);
      }
    } finally {
      setIsPulling(false);
    }
  };

  // 取消拉取
  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    cancelDownload();
    setIsPulling(false);
  };

  // 最小化弹窗
  const handleMinimize = () => {
    minimizeDownload();
  };

  // 恢复弹窗
  const handleRestore = () => {
    restoreDownload();
  };

  // 关闭弹窗
  const handleClose = () => {
    if (downloadState.isActive && !downloadState.isCompleted && !downloadState.hasError) {
      // 如果正在下载且未完成，最小化而不是关闭
      minimizeDownload();
    } else {
      resetDownload();
      setModelName('');
      setOriginalInput(''); // 重置原始输入
      setIsPulling(false);
      onClose();
    }
  };

  // 使用 useMemo 缓存总进度计算，避免不必要的重新渲染
  const totalProgress = useMemo(() => {
    return downloadState.progress.length > 0 
      ? downloadState.progress.reduce((sum, p) => {
          if (p.total && p.completed) {
            return sum + (p.completed / p.total);
          }
          return sum;
        }, 0) / downloadState.progress.length * 100
      : 0;
  }, [downloadState.progress]);

  // 当下载状态恢复时，同步本地状态 - 优化依赖项减少重新渲染
  useEffect(() => {
    if (downloadState.modelName && !downloadState.isMinimized && !isPulling) {
      setModelName(downloadState.modelName);
      setOriginalInput(downloadState.originalInput || downloadState.modelName); // 同步原始输入
      setIsPulling(downloadState.isActive);
    }
  }, [downloadState.modelName, downloadState.originalInput, downloadState.isMinimized, downloadState.isActive, isPulling]);

  // 统一的图标样式，与其他弹窗保持一致
  const modalIcon = (
    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-theme-primary to-theme-accent flex items-center justify-center">
      <Download className="w-7 h-7 text-white" />
    </div>
  );

  // 外部链接处理函数
  const handleExternalLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* 最小化状态 */}
      {downloadState.isMinimized && (
        <MinimizedPullModal
          modelName={downloadState.originalInput || downloadState.modelName}
          totalProgress={totalProgress}
          downloadSpeed={downloadState.downloadSpeed}
          elapsedTime={downloadState.elapsedTime}
          onRestore={handleRestore}
          onCancel={handleClose}
          isCompleted={downloadState.isCompleted}
          hasError={downloadState.hasError}
        />
      )}

      {/* 完整弹窗 */}
      <ModalWrapper
        isOpen={isOpen && !downloadState.isMinimized}
        onClose={handleClose}
        title={t('settings.models.pullModelModal.title')}
        subtitle={t('settings.models.pullModelModal.subtitle')}
        maxWidth="2xl"
        showMinimizeButton={downloadState.isActive && !downloadState.isCompleted && !downloadState.hasError}
        onMinimize={handleMinimize}
        icon={modalIcon}
      >
        <div className="space-y-6">
          {/* 模型名称输入 */}
          <div className="p-8 space-y-6">
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-foreground)' }}
              >
                {t('settings.models.pullModelModal.fields.modelName')}
              </label>
              <input
                type="text"
                value={originalInput || modelName}
                onChange={(e) => handleModelNameChange(e.target.value)}
                placeholder={t('settings.models.pullModelModal.fields.modelNamePlaceholder')}
                className="w-full px-4 py-3 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--color-input)',
                  borderColor: 'var(--color-input-border)',
                  color: 'var(--color-foreground)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-input-focus)';
                  e.target.style.boxShadow = '0 0 0 2px rgba(var(--color-primary-rgb), 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--color-input-border)';
                  e.target.style.boxShadow = 'none';
                }}
                disabled={isPulling}
              />
            </div>

            {/* 当前状态 */}
            {downloadState.currentStatus && (
              <div 
                className="flex items-center gap-3 p-4 rounded-lg border"
                style={{
                  backgroundColor: 'var(--color-card)',
                  borderColor: 'var(--color-border)'
                }}
              >
                {downloadState.isActive && !downloadState.hasError && !downloadState.isCompleted && (
                  <Loader className="w-5 h-5 animate-spin flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
                )}
                {downloadState.hasError && (
                  <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-error)' }} />
                )}
                {downloadState.isCompleted && (
                  <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-success)' }} />
                )}
                <span 
                  className="text-sm"
                  style={{ color: 'var(--color-foreground)' }}
                >
                  {downloadState.currentStatus}
                </span>
              </div>
            )}

            {/* 进度显示 */}
            {downloadState.progress.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span 
                      className="text-sm font-medium"
                      style={{ color: 'var(--color-foreground)' }}
                    >
                      {t('settings.models.pullModelModal.progress.downloadProgress')}
                    </span>
                    {downloadState.isActive && (
                      <span 
                        className="text-xs"
                        style={{ color: 'var(--color-foreground-muted)' }}
                      >
                        {downloadState.downloadSpeed || t('settings.models.pullModelModal.progress.calculating')}
                      </span>
                    )}
                  </div>
                  <span 
                    className="text-sm"
                    style={{ color: 'var(--color-foreground-muted)' }}
                  >
                    {totalProgress.toFixed(1)}%
                  </span>
                </div>

                {/* 总体进度条 */}
                <div className="space-y-2">
                  <div 
                    className="w-full rounded-full h-3 border"
                    style={{
                      backgroundColor: 'var(--color-background-secondary)',
                      borderColor: 'var(--color-border)'
                    }}
                  >
                    <div
                      className="h-3 rounded-full transition-all duration-300 ease-out"
                      style={{ 
                        width: `${totalProgress}%`,
                        backgroundColor: 'var(--color-primary)'
                      }}
                    />
                  </div>
                </div>

                {/* 详细进度 */}
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {downloadState.progress.map((item, index) => (
                    <div key={item.digest || index} className="text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span 
                          className="truncate"
                          style={{ color: 'var(--color-foreground-muted)' }}
                        >
                          {item.digest ? `${item.digest.substring(0, 12)}...` : `${t('settings.models.pullModelModal.progress.layer')} ${index + 1}`}
                        </span>
                        <span 
                          style={{ color: 'var(--color-foreground-muted)' }}
                        >
                          {item.total && item.completed 
                            ? `${formatBytes(item.completed)} / ${formatBytes(item.total)}`
                            : t('settings.models.pullModelModal.progress.processing')
                          }
                        </span>
                      </div>
                      {item.total && item.completed && (
                        <div 
                          className="w-full rounded-full h-1.5 border"
                          style={{
                            backgroundColor: 'var(--color-background-secondary)',
                            borderColor: 'var(--color-border)'
                          }}
                        >
                          <div
                            className="h-1.5 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${(item.completed / item.total) * 100}%`,
                              backgroundColor: 'var(--color-primary)',
                              opacity: 0.8
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div 
            className="p-8 border-t"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-card-secondary)'
            }}
          >
            <div className="flex justify-between items-center">
              {/* 左侧：外部链接图标 */}
              <div className="flex items-center gap-3"> 
                {/* Ollama 图标按钮 */}
                <button
                  onClick={() => handleExternalLink('https://ollama.com/library/')}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 hover:scale-105"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-foreground)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-background-hover)';
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-background)';
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                  }}
                  title={t('settings.models.pullModelModal.external.ollamaLibrary')}
                >
                  <Image
                    src="/assets/modelslogo/Ollama_icon.svg"
                    alt="Ollama"
                    width={20}
                    height={20}
                    className="flex-shrink-0"
                    style={{
                      filter: isDark ? 'invert(1) brightness(0.9)' : 'none'
                    }}
                  />
                  <span className="text-sm">Ollama</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </button>

                {/* 魔搭社区图标按钮 */}
                <button
                  onClick={() => handleExternalLink('https://modelscope.cn/models')}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 hover:scale-105"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-foreground)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-background-hover)';
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-background)';
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                  }}
                  title={t('settings.models.pullModelModal.external.modelscopeLibrary')}
                >
                  <Image
                    src="/assets/modelslogo/Modelscope_icon.svg"
                    alt="魔搭社区"
                    width={20}
                    height={20}
                    className="flex-shrink-0"
                  />
                  <span className="text-sm">ModelScope</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </button>
              </div>

              {/* 右侧：主要操作按钮 */}
              <div className="flex gap-3">
                {downloadState.isActive ? (
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 rounded-lg border transition-colors"
                    style={{
                      backgroundColor: 'var(--color-error)',
                      borderColor: 'var(--color-error)',
                      color: 'white'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-error-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-error)';
                    }}
                  >
                    {t('settings.models.pullModelModal.actions.cancelDownload')}
                  </button>
                ) : downloadState.hasError ? (
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 rounded-lg border transition-colors"
                    style={{
                      backgroundColor: 'var(--color-background)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-foreground)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-background-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-background)';
                    }}
                  >
                    {t('settings.models.pullModelModal.actions.close')}
                  </button>
                ) : downloadState.isCompleted ? (
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 rounded-lg border transition-colors"
                    style={{
                      backgroundColor: 'var(--color-success)',
                      borderColor: 'var(--color-success)',
                      color: 'white'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-success-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-success)';
                    }}
                  >
                    {t('settings.models.pullModelModal.actions.complete')}
                  </button>
                ) : (
                  <button
                    onClick={handlePullModel}
                    disabled={!modelName.trim()}
                    className="px-4 py-2 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    style={{
                      backgroundColor: modelName.trim() ? 'var(--color-primary)' : 'var(--color-background)',
                      borderColor: modelName.trim() ? 'var(--color-primary)' : 'var(--color-border)',
                      color: modelName.trim() ? 'white' : 'var(--color-foreground-muted)'
                    }}
                    onMouseEnter={(e) => {
                      if (modelName.trim()) {
                        e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (modelName.trim()) {
                        e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                      }
                    }}
                  >
                    <Download className="w-4 h-4" />
                    {t('settings.models.pullModelModal.actions.startPull')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </ModalWrapper>
    </>
  );
}