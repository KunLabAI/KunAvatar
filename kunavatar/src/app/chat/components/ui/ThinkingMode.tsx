'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Brain, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

interface ThinkingModeProps {
  content: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  defaultHidden?: boolean;
}

// 检测内容是否为JSON格式或包含过多换行符
const isJsonLikeContent = (content: string): boolean => {
  if (!content) return false;
  
  // 检测是否包含JSON特征
  const hasJsonStructure = /[{}\[\]"]/.test(content);
  
  // 计算换行符密度（换行符数量 / 总字符数）
  const newlineCount = (content.match(/\n/g) || []).length;
  const totalChars = content.length;
  const newlineDensity = totalChars > 0 ? newlineCount / totalChars : 0;
  
  // 如果换行符密度超过15%，或者有JSON结构且换行符密度超过10%，认为是JSON格式
  return newlineDensity > 0.15 || (hasJsonStructure && newlineDensity > 0.1);
};

// 智能处理思考内容
const processThinkingContent = (content: string): string => {
  if (!content) return '';
  
  // 先去除首尾空白
  const trimmedContent = content.replace(/^\s+|\s+$/g, '');
  if (!trimmedContent) return '';
  
  // 检测是否为JSON格式内容
  if (isJsonLikeContent(trimmedContent)) {
    // 对JSON格式内容进行特殊处理，但确保不会清空内容
    const processed = trimmedContent
      .replace(/\n+/g, ' ') // 将所有换行符替换为空格
      .replace(/\s{2,}/g, ' ') // 将多个连续空格替换为单个空格
      .replace(/([{,])\s+/g, '$1 ') // 清理JSON结构中的多余空格
      .replace(/\s+([}])/g, ' $1'); // 清理JSON结构中的多余空格
    
    // 确保处理后的内容不为空，如果为空则返回原始内容（去除首尾空白）
    return processed.trim() || trimmedContent;
  } else {
    // 对普通文本内容进行标准处理
    return trimmedContent
      .replace(/\n{3,}/g, '\n\n') // 将三个或更多连续换行替换为两个
      .replace(/[ \t]{2,}/g, ' '); // 将多个空格/制表符替换为单个空格，但保留单个换行
  }
};

// 提取思考内容的函数
const extractThinkingContent = (text: string): string => {
  const results: string[] = [];
  
  // 处理 <think></think> 标签格式
  const thinkRegex = /<think>([\s\S]*?)(?:<\/think>|$)/g;
  const thinkMatches = text.match(thinkRegex);
  if (thinkMatches) {
    thinkMatches.forEach((match, index) => {
      let content = match.replace(/<\/?think>/g, '');
      content = processThinkingContent(content);
      
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
        content = processThinkingContent(content);
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
  
  // 检测思考内容是否为JSON格式，用于决定渲染样式
  const isJsonContent = useMemo(() => {
    return thinkingContent ? isJsonLikeContent(thinkingContent) : false;
  }, [thinkingContent]);
  
  const isCurrentlyThinking = useMemo(() => 
    (/<think>/.test(content) && !/<\/think>/.test(content)) ||
    (/Thinking\.\.\./.test(content) && !/\.\.\.done thinking/i.test(content)), [content]
  );

  // 判断是否应该显示面板
  const shouldShowPanel = useMemo(() => {
    // 优先检查是否存在思考标签（无论是否完成）
    const hasThinkTags = /<think>/.test(content);
    const hasThinkingFormat = /Thinking\.\.\./.test(content);
    
    // 如果检测到任何思考标签，就显示面板
    if (hasThinkTags || hasThinkingFormat) return true;
    
    // 如果有提取到的思考内容，也显示面板
    if (thinkingContent && thinkingContent.trim()) return true;
    
    return false;
  }, [thinkingContent, content]);

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
            <div className={`text-sm text-theme-foreground-muted break-words min-w-0 leading-relaxed ${
              isJsonContent ? 'whitespace-normal' : 'whitespace-pre-wrap'
            }`}>
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