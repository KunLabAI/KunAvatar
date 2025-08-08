import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface StreamedContentProps {
  content: string;
  isStreaming: boolean;
  className?: string;
  style?: React.CSSProperties;
  enableMarkdown?: boolean; // 新增参数：是否启用markdown渲染
  onImagePreview?: (imageUrl: string, index: number, images: string[]) => void;
}

// 缓存处理过的内容
const contentProcessCache = new Map<string, string>();
const PROCESS_CACHE_SIZE = 50;

// 优化的移除思考标签内容的函数
const removeThinkingContent = (content: string): string => {
  if (!content) return '';
  
  // 检查缓存
  if (contentProcessCache.has(content)) {
    return contentProcessCache.get(content)!;
  }
  
  const result = content
    .replace(/<think>[\s\S]*?(?:<\/think>|$)/g, '')
    .replace(/Thinking\.\.\.\s*[\s\S]*?(?:\s*\.\.\.done thinking|$)/gi, '')
    .trim();
  
  // 缓存结果
  if (contentProcessCache.size >= PROCESS_CACHE_SIZE) {
    const firstKey = contentProcessCache.keys().next().value;
    if (firstKey !== undefined) {
      contentProcessCache.delete(firstKey);
    }
  }
  contentProcessCache.set(content, result);
  
  return result;
};

const StreamedContentComponent: React.FC<StreamedContentProps> = ({
  content,
  isStreaming,
  className,
  style,
  enableMarkdown = false,
  onImagePreview,
}) => {
  const prevContentRef = useRef('');
  const lastProcessedContentRef = useRef('');

  // 使用 useMemo 优化内容处理
  const processedContent = useMemo(() => {
    // 如果内容没有变化，直接返回缓存的结果
    if (content === lastProcessedContentRef.current) {
      return removeThinkingContent(content);
    }
    
    lastProcessedContentRef.current = content;
    return removeThinkingContent(content);
  }, [content]);

  useEffect(() => {
    if (isStreaming) {
      prevContentRef.current = processedContent;
    } else {
      prevContentRef.current = '';
    }
  }, [processedContent, isStreaming]);

  // 使用 useCallback 优化回调函数
  const handleImagePreview = useCallback((imageUrl: string, index: number, images: string[]) => {
    onImagePreview?.(imageUrl, index, images);
  }, [onImagePreview]);

  // 如果启用了markdown渲染
  if (enableMarkdown) {
    return (
      <MarkdownRenderer
        content={processedContent}
        isStreaming={isStreaming}
        className={className}
        style={style}
        onImagePreview={handleImagePreview}
      />
    );
  }

  // 原有的纯文本渲染逻辑
  if (!isStreaming) {
    return (
      <div className={className} style={style}>
        {processedContent}
      </div>
    );
  }

  const prevContent = prevContentRef.current;
  const newContent = processedContent.substring(prevContent.length);
  
  // 优化：如果没有新内容，直接返回之前的内容
  if (!newContent) {
    return (
      <div className={className} style={style}>
        <span>{prevContent}</span>
      </div>
    );
  }

  // 优化：限制一次渲染的字符数量，避免过多DOM元素
  const maxCharsPerRender = 50;
  const characters = newContent.slice(0, maxCharsPerRender).split('');

  return (
    <div className={className} style={style}>
      <span>{prevContent}</span>
      {characters.map((char, index) => (
        <span
          key={prevContent.length + index}
          className="fade-in-char"
          style={{ animationDelay: `${index * 0.02}s` }}
        >
          {char}
        </span>
      ))}
      {newContent.length > maxCharsPerRender && (
        <span>{newContent.slice(maxCharsPerRender)}</span>
      )}
    </div>
  );
};

StreamedContentComponent.displayName = 'StreamedContent';

const StreamedContent = React.memo(StreamedContentComponent);

export default StreamedContent;