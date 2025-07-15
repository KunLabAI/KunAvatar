'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Brain, ChevronDown, ChevronRight, Loader2, Check } from 'lucide-react';

interface ThinkingModeProps {
  content: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  defaultHidden?: boolean;
}

// 🔧 修复：将提取函数移到组件外部，避免useCallback依赖问题
const extractThinkingContent = (text: string): string => {
  const thinkRegex = /<think>([\s\S]*?)(?:<\/think>|$)/g;
  const matches = text.match(thinkRegex);
  if (!matches) return '';

  return matches
    .map(match => {
      return match.replace(/<\/?think>/g, '');
    })
    .join('\n\n');
};

export function ThinkingMode({
  content,
  isExpanded,
  onToggleExpand,
  defaultHidden = false
}: ThinkingModeProps) {
  const [initiallyHidden, setInitiallyHidden] = useState(defaultHidden);

  // 🔧 修复：使用useMemo来避免不必要的重新计算
  const thinkingContent = useMemo(() => extractThinkingContent(content), [content]);
  const hasThinkStart = useMemo(() => /<think>/.test(content), [content]);
  const isCurrentlyThinking = useMemo(() => 
    /<think>/.test(content) && !/<\/think>/.test(content), [content]
  );

  // 🔧 修复：简化useEffect逻辑，避免循环更新
  useEffect(() => {
    // 只有在初始隐藏状态下，检测到思考内容时才显示
    if (initiallyHidden && (thinkingContent || hasThinkStart)) {
      console.log('🔍 检测到思考内容，显示思考面板');
      setInitiallyHidden(false);
    }
  }, [thinkingContent, hasThinkStart, initiallyHidden]); // 明确指定依赖项

  // 🔧 修复：如果初始隐藏，且没有思考标签（包括开始标签），则不渲染
  if (initiallyHidden && !thinkingContent && !hasThinkStart) {
    return null;
  }

  return (
    <div className="rounded-[var(--radius-lg)] ">
      {/* 标题栏 */}
      <div
        onClick={onToggleExpand}
        className="flex items-center justify-between p-1 cursor-pointer hover:bg-[var(--color-card-hover)]  rounded-[var(--radius-lg)] transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-[var(--color-foreground-muted)]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[var(--color-foreground-muted)]" />
          )}
          
          <Brain className="w-4 h-4 text-[var(--color-primary)]" />
          <span className="text-sm font-medium text-[var(--color-foreground)]">
            思考模式
          </span>
        </div>
        
        {/* 状态图标显示 */}
        <div className="flex items-center">
          {isCurrentlyThinking ? (
            <Loader2 className="w-4 h-4 text-[var(--color-primary)] animate-spin" />
          ) : (
            <Check className="w-4 h-4 text-[var(--color-success)]" />
          )}
        </div>
      </div>

      {/* 思考内容 */}
      {isExpanded && (
        <div className="p-2">
          {/* 思考中的动画 */}
          {isCurrentlyThinking && !thinkingContent && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 text-[var(--color-primary)] animate-spin" />
            </div>
          )}

          {/* 思考内容 */}
          {thinkingContent && (
            <div className="text-sm text-[var(--color-foreground-secondary)] whitespace-pre-wrap break-words min-w-0 word-wrap streaming-content">
              {thinkingContent}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 导出辅助函数供其他组件使用
export const hasThinkingContent = (content: string): boolean => {
  return /<think>/.test(content);
};

export const removeThinkingContent = (content: string): string => {
  return content.replace(/<think>[\s\S]*?(?:<\/think>|$)/g, '').trim();
};