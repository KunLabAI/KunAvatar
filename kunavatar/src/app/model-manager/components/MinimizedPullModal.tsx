'use client';

import { motion } from 'framer-motion';
import { Maximize2, X } from 'lucide-react';

interface MinimizedPullModalProps {
  modelName: string;
  totalProgress: number;
  downloadSpeed: string;
  elapsedTime: string;
  onRestore: () => void;
  onCancel: () => void;
  isCompleted: boolean;
  hasError: boolean;
}

export default function MinimizedPullModal({
  modelName,
  totalProgress,
  downloadSpeed,
  elapsedTime,
  onRestore,
  onCancel,
  isCompleted,
  hasError
}: MinimizedPullModalProps) {
  const getStatusStyle = () => {
    if (hasError) {
      return {
        backgroundColor: 'var(--color-error)',
        color: 'var(--color-error)'
      };
    }
    if (isCompleted) {
      return {
        backgroundColor: 'var(--color-success)',
        color: 'var(--color-success)'
      };
    }
    return {
      backgroundColor: 'var(--color-primary)',
      color: 'var(--color-primary)'
    };
  };

  const getStatusText = () => {
    if (hasError) return '下载失败';
    if (isCompleted) return '下载完成';
    return '下载中';
  };

  const statusStyle = getStatusStyle();

  return (
    <motion.div
      className="fixed bottom-4 right-4 z-50"
      initial={{ opacity: 0, y: 100, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 100, scale: 0.8 }}
    >
      <div 
        className="border rounded-lg p-3 min-w-[280px]"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        {/* 状态和操作按钮 */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: statusStyle.backgroundColor }}
            />
            <span 
              className="text-sm font-medium"
              style={{ color: 'var(--color-foreground)' }}
            >
              {getStatusText()}
            </span>
            <span 
              className="text-sm"
              style={{ color: 'var(--color-foreground-muted)' }}
            >
              {totalProgress.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onRestore}
              className="w-7 h-7 rounded-md flex items-center justify-center transition-all duration-200"
              style={{
                backgroundColor: 'var(--color-background-secondary)',
                color: 'var(--color-foreground-muted)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-card-hover)';
                e.currentTarget.style.color = 'var(--color-foreground)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-background-secondary)';
                e.currentTarget.style.color = 'var(--color-foreground-muted)';
              }}
              title="恢复窗口"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onCancel}
              className="w-7 h-7 rounded-md flex items-center justify-center transition-all duration-200"
              style={{
                backgroundColor: 'var(--color-background-secondary)',
                color: 'var(--color-foreground-muted)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-card-hover)';
                e.currentTarget.style.color = 'var(--color-foreground)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-background-secondary)';
                e.currentTarget.style.color = 'var(--color-foreground-muted)';
              }}
              title="取消下载"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 模型名称 */}
        <div className="mb-3">
          <span 
            className="text-xs truncate block"
            style={{ color: 'var(--color-foreground-muted)' }}
            title={modelName}
          >
            {modelName}
          </span>
        </div>

        {/* 进度条 */}
        <div 
          className="w-full rounded-full h-1.5"
          style={{ backgroundColor: 'var(--color-background-secondary)' }}
        >
          <motion.div
            className="h-1.5 rounded-full"
            style={{ backgroundColor: statusStyle.backgroundColor }}
            initial={{ width: 0 }}
            animate={{ width: `${totalProgress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </motion.div>
  );
}