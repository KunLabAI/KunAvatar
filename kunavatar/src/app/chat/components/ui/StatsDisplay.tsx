'use client';

import React from 'react';
import { Clock, Zap, Hash, FileText } from 'lucide-react';
import { MessageStats } from '../../../api/chat/services/messageStorageService';

interface StatsDisplayProps {
  stats: MessageStats;
  className?: string;
}

// 格式化时间（纳秒转换为可读格式）
const formatDuration = (nanoseconds?: number): string => {
  if (!nanoseconds) return '-';
  
  const milliseconds = nanoseconds / 1_000_000;
  
  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)}ms`;
  } else {
    return `${(milliseconds / 1000).toFixed(1)}s`;
  }
};

// 格式化token数量
const formatTokenCount = (count?: number): string => {
  if (!count) return '-';
  return count.toString();
};

// 计算tokens/秒
const calculateTokensPerSecond = (tokenCount?: number, duration?: number): string => {
  if (!tokenCount || !duration) return '-';
  
  const seconds = duration / 1_000_000_000; // 纳秒转秒
  const tokensPerSecond = tokenCount / seconds;
  
  return `${Math.round(tokensPerSecond)} t/s`;
};

export function StatsDisplay({ stats, className = '' }: StatsDisplayProps) {
  // 如果没有统计信息，不显示组件
  if (!stats || (!stats.total_duration && !stats.eval_count && !stats.prompt_eval_count)) {
    return null;
  }

  return (
    <div className={`flex items-center gap-4 text-xs text-theme-foreground-muted ${className}`}>
      {/* 总时间 */}
      {stats.total_duration && (
        <div className="flex items-center gap-1.5" title={`总耗时: ${formatDuration(stats.total_duration)}`}>
          <Clock className="w-3 h-3" />
          <span>{formatDuration(stats.total_duration)}</span>
        </div>
      )}

      {/* 生成tokens */}
      {stats.eval_count && (
        <div className="flex items-center gap-1.5" title={`生成tokens: ${formatTokenCount(stats.eval_count)}`}>
          <Hash className="w-3 h-3" />
          <span>{formatTokenCount(stats.eval_count)}</span>
        </div>
      )}

      {/* 生成速度 */}
      {stats.eval_count && stats.eval_duration && (
        <div className="flex items-center gap-1.5" title={`生成速度: ${calculateTokensPerSecond(stats.eval_count, stats.eval_duration)}`}>
          <Zap className="w-3 h-3" />
          <span>{calculateTokensPerSecond(stats.eval_count, stats.eval_duration)}</span>
        </div>
      )}

      {/* 当前对话上下文tokens */}
      {stats.prompt_eval_count && (
        <div className="flex items-center gap-1.5 opacity-70" title={`当前上下文tokens: ${formatTokenCount(stats.prompt_eval_count)}`}>
          <FileText className="w-3 h-3" />
          <span>{formatTokenCount(stats.prompt_eval_count)}</span>
        </div>
      )}
    </div>
  );
}