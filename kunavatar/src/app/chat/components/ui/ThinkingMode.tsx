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
  const results: string[] = [];
  
  // 处理 <think></think> 标签格式
  const thinkRegex = /<think>([\s\S]*?)(?:<\/think>|$)/g;
  const thinkMatches = text.match(thinkRegex);
  if (thinkMatches) {
    thinkMatches.forEach((match, index) => {
      let content = match.replace(/<\/?think>/g, '');
      
      // 保留markdown格式，只清理多余的空白
      content = content
        .replace(/^\s+|\s+$/g, '') // 去除首尾空白
        .replace(/\n{3,}/g, '\n\n') // 将三个或更多连续换行替换为两个
        .replace(/[ \t]+/g, ' '); // 将多个空格/制表符替换为单个空格
      
      if (content) {
        results.push(content);
      }
    });
  }
  
  // 处理 Thinking... ...done thinking 格式
  const thinkingRegex = /Thinking\.\.\.\s*([\s\S]*?)(?:\s*\.\.\.done thinking|$)/gi;
  const thinkingMatches = [...text.matchAll(thinkingRegex)];
  if (thinkingMatches.length > 0) {
    thinkingMatches.forEach((match, index) => {
      let content = match[1]; // 获取捕获组的内容
      
      if (content && content.trim()) {
        // 保留markdown格式，只清理多余的空白
        content = content
          .replace(/^\s+|\s+$/g, '') // 去除首尾空白
          .replace(/\n{3,}/g, '\n\n') // 将三个或更多连续换行替换为两个
          .replace(/[ \t]+/g, ' '); // 将多个空格/制表符替换为单个空格
        
        results.push(content);
      }
    });
  }
  
  const finalResult = results.join('\n\n'); // 用双换行连接多个思考片段
  return finalResult;
};

export function ThinkingMode({
  content,
  isExpanded,
  onToggleExpand,
  defaultHidden = false
}: ThinkingModeProps) {
  const [initiallyHidden, setInitiallyHidden] = useState(defaultHidden);



  // 使用useMemo来避免不必要的重新计算
  const thinkingContent = useMemo(() => {
    return extractThinkingContent(content);
  }, [content]);
  
  const hasThinkStart = useMemo(() => 
    /<think>/.test(content) || /Thinking\.\.\./.test(content), [content]
  );
  const isCurrentlyThinking = useMemo(() => 
    (/<think>/.test(content) && !/<\/think>/.test(content)) ||
    (/Thinking\.\.\./.test(content) && !/\.\.\.done thinking/i.test(content)), [content]
  );

  // 判断是否应该显示面板
  const shouldShowPanel = useMemo(() => {
    // 如果有思考内容，就显示面板（无论思考是否完成）
    if (thinkingContent) return true;
    
    // 如果检测到思考开始，也显示面板
    if (hasThinkStart) return true;
    
    // 如果检测到完整的思考过程（包括已完成的），也显示面板
    if (/<think>[\s\S]*?<\/think>/.test(content)) return true;
    if (/Thinking\.\.\.[\s\S]*?\.\.\.done thinking/i.test(content)) return true;
    
    return false;
  }, [thinkingContent, hasThinkStart, content]);

  // 简化useEffect逻辑，避免循环更新
  useEffect(() => {
    // 只有在初始隐藏状态下，检测到思考内容时才显示
    if (initiallyHidden && shouldShowPanel) {
      setInitiallyHidden(false);
    }
  }, [shouldShowPanel, initiallyHidden]);

  // 如果不应该显示面板，则不渲染
  if (!shouldShowPanel) {
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
          {/* 状态图标显示 */}
          <div className="flex items-center">
            {isCurrentlyThinking && (
              <Loader2 className="w-4 h-4 text-theme-primary animate-spin" />
            )}
          </div>

          <span className="text-sm font-medium text-theme-foreground">
            思考模式
          </span>
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
            <div className="text-sm text-theme-foreground-muted break-words min-w-0 leading-relaxed">
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