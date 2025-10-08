import React, { useRef, useMemo } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface StreamedContentProps {
  content: string;
  isStreaming: boolean;
  className?: string;
  style?: React.CSSProperties;
  enableMarkdown?: boolean;
  enableFadeEffect?: boolean;
  fadeDelay?: number;
  onImagePreview?: (imageUrl: string, index: number, images: string[]) => void;
}

// 缓存处理过的内容
const contentProcessCache = new Map<string, string>();
const PROCESS_CACHE_SIZE = 50;

// 简单的字符淡入效果组件
const FadeInText: React.FC<{ 
  text: string; 
  delay?: number; 
  isStreaming: boolean;
}> = ({ text, delay = 50, isStreaming }) => {
  if (!text) return null;
  
  return (
    <span className="fade-in-text">
      {text.split('').map((char, index) => (
        <span
          key={index}
          className="fade-char"
          style={{
            animationDelay: `${index * delay}ms`,
            opacity: isStreaming ? 0 : 1
          }}
        >
          {char}
        </span>
      ))}
    </span>
  );
};

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
  className = '',
  style,
  enableMarkdown = true,
  enableFadeEffect = false,
  fadeDelay = 50,
  onImagePreview
}) => {
  // 🔧 修复：将所有Hooks调用移到条件判断之前，确保调用顺序一致
  
  // 处理内容，移除thinking标签
  const processedContent = useMemo(() => {
    return removeThinkingContent(content);
  }, [content]);

  // 必须在条件判断之前调用所有Hooks
  const contentRef = useRef<HTMLDivElement>(null);

  // 渲染逻辑
  const containerClasses = [
    className,
    'streamed-content',
    isStreaming ? 'streaming' : 'completed'
  ].filter(Boolean).join(' ');

  // 条件判断移到所有Hooks调用之后
  if (!processedContent) {
    return null;
  }

  // 根据enableMarkdown决定渲染方式
  if (enableMarkdown) {
    return (
      <div 
        ref={contentRef}
        className={containerClasses} 
        style={style}
      >
        <MarkdownRenderer 
          content={processedContent} 
          isStreaming={isStreaming}
          onImagePreview={onImagePreview}
        />
        {isStreaming && (
          <span className="streaming-cursor" />
        )}
      </div>
    );
  }

  // 非Markdown模式：显示纯文本内容
  return (
    <div 
      ref={contentRef}
      className={containerClasses} 
      style={style}
    >
      {enableFadeEffect ? (
        <FadeInText 
          text={processedContent} 
          delay={fadeDelay}
          isStreaming={isStreaming}
        />
      ) : (
        <span>{processedContent}</span>
      )}
      {isStreaming && (
        <span className="streaming-cursor" />
      )}
    </div>
  );
};

StreamedContentComponent.displayName = 'StreamedContent';

// 使用精确的memo比较函数
const StreamedContent = React.memo(StreamedContentComponent, (prevProps, nextProps) => {
  return (
    prevProps.content === nextProps.content &&
    prevProps.isStreaming === nextProps.isStreaming &&
    prevProps.className === nextProps.className &&
    prevProps.enableMarkdown === nextProps.enableMarkdown &&
    prevProps.enableFadeEffect === nextProps.enableFadeEffect &&
    prevProps.fadeDelay === nextProps.fadeDelay &&
    JSON.stringify(prevProps.style) === JSON.stringify(nextProps.style) &&
    prevProps.onImagePreview === nextProps.onImagePreview
  );
});

export default StreamedContent;