import React, { useRef, useEffect } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface StreamedContentProps {
  content: string;
  isStreaming: boolean;
  className?: string;
  style?: React.CSSProperties;
  enableMarkdown?: boolean; // 新增参数：是否启用markdown渲染
}

const StreamedContentComponent: React.FC<StreamedContentProps> = ({
  content,
  isStreaming,
  className,
  style,
  enableMarkdown = false,
}) => {
  const prevContentRef = useRef('');

  useEffect(() => {
    if (isStreaming) {
      prevContentRef.current = content;
    } else {
      prevContentRef.current = '';
    }
  }, [content, isStreaming]);

  // 如果启用了markdown渲染
  if (enableMarkdown) {
    return (
      <MarkdownRenderer
        content={content}
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
        {content}
      </div>
    );
  }

  const prevContent = prevContentRef.current;
  const newContent = content.substring(prevContent.length);
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