'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Brain, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

interface ThinkingModeProps {
  content: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  defaultHidden?: boolean;
}

// 提取思考内容的函数
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

  // 使用useMemo来避免不必要的重新计算
  const thinkingContent = useMemo(() => extractThinkingContent(content), [content]);
  const hasThinkStart = useMemo(() => /<think>/.test(content), [content]);
  const isCurrentlyThinking = useMemo(() => 
    /<think>/.test(content) && !/<\/think>/.test(content), [content]
  );

  // 简化useEffect逻辑，避免循环更新
  useEffect(() => {
    // 只有在初始隐藏状态下，检测到思考内容时才显示
    if (initiallyHidden && (thinkingContent || hasThinkStart)) {
      console.log('🔍 检测到思考内容，显示思考面板');
      setInitiallyHidden(false);
    }
  }, [thinkingContent, hasThinkStart, initiallyHidden]);

  // 如果初始隐藏，且没有思考标签（包括开始标签），则不渲染
  if (initiallyHidden && !thinkingContent && !hasThinkStart) {
    return null;
  }

  return (
    <div className="rounded-lg">
      {/* 标题栏 */}
      <div
        onClick={onToggleExpand}
        className="flex items-center justify-between p-2 cursor-pointer hover:bg-theme-card-hover rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-theme-foreground-muted" />
          ) : (
            <ChevronRight className="w-4 h-4 text-theme-foreground-muted" />
          )}
          
          <Brain className="w-4 h-4 text-theme-primary" />
          <span className="text-sm font-medium text-theme-foreground">
            思考模式
          </span>
        </div>
        
        {/* 状态图标显示 */}
        <div className="flex items-center">
          {isCurrentlyThinking && (
            <Loader2 className="w-4 h-4 text-theme-primary animate-spin" />
          )}
        </div>
      </div>

      {/* 思考内容 */}
      {isExpanded && (
        <div className="p-2 bg-theme-background/50 rounded-lg">
          {/* 思考中的动画 */}
          {isCurrentlyThinking && !thinkingContent && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 text-theme-primary animate-spin" />
            </div>
          )}

          {/* 思考内容 */}
          {thinkingContent && (
            <div className="text-sm text-theme-foreground-muted whitespace-pre-wrap break-words min-w-0 word-wrap">
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