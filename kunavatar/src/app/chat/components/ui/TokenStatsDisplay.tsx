'use client';

import React from 'react';
import { Zap } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

interface ConversationTokenStats {
  message_count: number;
  total_characters: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
}

interface TokenStatsDisplayProps {
  stats: ConversationTokenStats | null;
  loading?: boolean;
  className?: string;
}



export function TokenStatsDisplay({ stats, loading = false, className = '' }: TokenStatsDisplayProps) {
  const { t } = useI18n();

  // 判断是否有有效的token数据
  const hasTokenData = stats && stats.message_count > 0 && stats.total_tokens > 0;

  // 构建详细的tooltip内容
  const tooltipData = hasTokenData ? {
    messageCount: stats.message_count,
    totalCharacters: stats.total_characters,
    totalTokens: stats.total_tokens,
    promptTokens: stats.total_prompt_tokens,
    completionTokens: stats.total_completion_tokens
  } : null;

  return (
    <div className="relative group">
      <button
        className={`
          relative w-10 h-10 rounded-xl transition-all duration-200 
          flex items-center justify-center
          ${hasTokenData 
            ? 'text-[var(--color-foreground-secondary)] hover:bg-[var(--color-background)]' 
            : 'text-[var(--color-foreground-muted)] opacity-50 cursor-default'
          } ${className}
        `}
        disabled={!hasTokenData}
      >
        {/* 图标内容 */}
        <div className={`relative z-10 ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}>
          <Zap className="w-4 h-4" />
        </div>
        
        {/* Loading动画 */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-50" />
          </div>
        )}
      </button>
      
      {/* 工具提示 */}
      {(tooltipData || !hasTokenData) && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[var(--color-card)] text-[var(--color-foreground)] text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-[9999] shadow-lg border border-[var(--color-border)] min-w-max">
          {tooltipData ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span>💬</span>
                <span className="text-[var(--color-foreground-secondary)]">{t('chat.tokenStats.messageCount')}:</span>
                <span className="font-medium">{tooltipData.messageCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>📝</span>
                <span className="text-[var(--color-foreground-secondary)]">{t('chat.tokenStats.totalCharacters')}:</span>
                <span className="font-medium">{tooltipData.totalCharacters.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>⚡</span>
                <span className="text-[var(--color-foreground-secondary)]">{t('chat.tokenStats.totalTokens')}:</span>
                <span className="font-medium">{tooltipData.totalTokens.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 pl-6 text-xs">
                <span className="text-[var(--color-foreground-muted)]">{t('chat.tokenStats.inputTokens')}:</span>
                <span className="font-medium">{tooltipData.promptTokens.toLocaleString()}</span>
                <span className="text-[var(--color-foreground-muted)]">|</span>
                <span className="text-[var(--color-foreground-muted)]">{t('chat.tokenStats.outputTokens')}:</span>
                <span className="font-medium">{tooltipData.completionTokens.toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <div className="text-[var(--color-foreground-muted)]">{t('chat.tokenStats.noData')}</div>
          )}
          {/* 工具提示箭头 */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-transparent border-t-[var(--color-card)]"></div>
        </div>
      )}
    </div>
  );
}