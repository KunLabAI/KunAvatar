import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
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
  const [displayContent, setDisplayContent] = useState('');
  const lastUpdateTsRef = useRef(0);
  const throttleTimerRef = useRef<number | null>(null);

  // 使用 useMemo 优化内容处理
  const processedContent = useMemo(() => {
    // 如果内容没有变化，直接返回缓存的结果
    if (content === lastProcessedContentRef.current) {
      return removeThinkingContent(content);
    }
    
    lastProcessedContentRef.current = content;
    return removeThinkingContent(content);
  }, [content]);

  // 流式 Markdown 渲染节流，减少 ReactMarkdown 重排压力
  useEffect(() => {
    const STREAM_THROTTLE_MS = 120;
    const STREAM_MAX_WAIT_MS = 600;

    // 非 markdown 或非流式，立即同步
    if (!enableMarkdown || !isStreaming) {
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
      setDisplayContent(processedContent);
      lastUpdateTsRef.current = Date.now();
      return;
    }

    const now = Date.now();
    const prev = displayContent;
    const next = processedContent;
    if (next === prev) return;

    const diff = next.slice(prev.length);
    const hasBreakpoint = /[\n。！？.!?]|```/.test(diff);
    const minDelta = prev.length < 1000 ? 16 : 64;
    const shouldUpdateNow = hasBreakpoint || diff.length >= minDelta || (now - lastUpdateTsRef.current) >= STREAM_MAX_WAIT_MS;

    if (shouldUpdateNow) {
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
      setDisplayContent(next);
      lastUpdateTsRef.current = now;
    } else if (!throttleTimerRef.current) {
      throttleTimerRef.current = window.setTimeout(() => {
        setDisplayContent(prev2 => {
          // 再次比较，避免竞态
          if (processedContent !== prev2) {
            lastUpdateTsRef.current = Date.now();
            return processedContent;
          }
          return prev2;
        });
        throttleTimerRef.current = null;
      }, STREAM_THROTTLE_MS);
    }

    return () => {
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processedContent, isStreaming, enableMarkdown]);

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
        content={displayContent || processedContent}
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

// 使用精确的memo比较函数，避免不必要的重渲染
const StreamedContent = React.memo(StreamedContentComponent, (prevProps, nextProps) => {
  // 精确比较关键属性
  return (
    prevProps.content === nextProps.content &&
    prevProps.isStreaming === nextProps.isStreaming &&
    prevProps.className === nextProps.className &&
    prevProps.enableMarkdown === nextProps.enableMarkdown &&
    JSON.stringify(prevProps.style) === JSON.stringify(nextProps.style) &&
    prevProps.onImagePreview === nextProps.onImagePreview
  );
});

export default StreamedContent;