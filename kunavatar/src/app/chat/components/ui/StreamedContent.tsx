import React, { useRef, useEffect } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface StreamedContentProps {
  content: string;
  isStreaming: boolean;
  className?: string;
  style?: React.CSSProperties;
  enableMarkdown?: boolean; // 新增参数：是否启用markdown渲染
}

// 移除思考标签内容的函数
const removeThinkingContent = (content: string): string => {
  return content.replace(/<think>[\s\S]*?(?:<\/think>|$)/g, '').trim();
};

const StreamedContentComponent: React.FC<StreamedContentProps> = ({
  content,
  isStreaming,
  className,
  style,
  enableMarkdown = false,
}) => {
  const prevContentRef = useRef('');

  // 处理内容，移除思考标签
  const processedContent = removeThinkingContent(content);

  useEffect(() => {
    if (isStreaming) {
      prevContentRef.current = processedContent;
    } else {
      prevContentRef.current = '';
    }
  }, [processedContent, isStreaming]);

  // 如果启用了markdown渲染
  if (enableMarkdown) {
    return (
      <MarkdownRenderer
        content={processedContent}
        isStreaming={isStreaming}
        className={className}
        style={style}
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
  const characters = newContent.split('');

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
    </div>
  );
};

StreamedContentComponent.displayName = 'StreamedContent';

const StreamedContent = React.memo(StreamedContentComponent);

export default StreamedContent;