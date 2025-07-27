'use client';

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// 增强的代码块组件
const CodeBlock = ({ 
  language, 
  children,
  isDark = false
}: { 
  language?: string;
  children: string;
  isDark?: boolean;
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    if (typeof window === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const displayLanguage = language || 'text';

  return (
    <div className="markdown-code-block">
      {/* 代码块标题栏 */}
      <div className="markdown-code-header">
        <span className="markdown-code-language">
          {displayLanguage}
        </span>
        <button
          onClick={handleCopy}
          className={`markdown-code-copy-btn ${copied ? 'copied' : ''}`}
          title={copied ? '已复制!' : '复制代码'}
        >
          {copied ? (
            <Check className="w-4 h-4" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>
      
      {/* 代码块内容 */}
      <div className="markdown-code-content">
        <SyntaxHighlighter
          language={displayLanguage}
          style={isDark ? oneDark : oneLight}
          showLineNumbers={true}
          wrapLines={true}
          wrapLongLines={true}
          customStyle={{
            background: 'var(--color-card)',
          }}
        >
          {children}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

// 内联代码组件
const InlineCode = ({ children }: { children: React.ReactNode }) => (
  <code className="markdown-inline-code">
    {children}
  </code>
);

// 检查是否为深色主题的Hook
const useIsDarkTheme = () => {
  const [isDark, setIsDark] = React.useState(() => {
    // 初始化时立即检查主题
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkTheme = () => {
      const htmlElement = document.documentElement;
      const isDarkMode = htmlElement.classList.contains('dark');
      setIsDark(prev => {
        // 只有在主题真的改变时才更新状态
        if (prev !== isDarkMode) {
          return isDarkMode;
        }
        return prev;
      });
    };

    // 监听主题变化
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
};

// 表格组件
const Table = ({ children }: { children: React.ReactNode }) => (
  <div className="markdown-table-wrapper">
    <table>
      {children}
    </table>
  </div>
);

const TableHead = ({ children }: { children: React.ReactNode }) => (
  <thead>
    {children}
  </thead>
);

const TableRow = ({ children }: { children: React.ReactNode }) => (
  <tr>
    {children}
  </tr>
);

const TableCell = ({ children, isHeader = false }: { children: React.ReactNode; isHeader?: boolean }) => {
  const Component = isHeader ? 'th' : 'td';
  return (
    <Component>
      {children}
    </Component>
  );
};

const MarkdownRendererComponent: React.FC<MarkdownRendererProps> = ({
  content,
  isStreaming = false,
  className = '',
  style,
}) => {
  const isDark = useIsDarkTheme();

  // 针对流式渲染优化的markdown组件配置
  const components = useMemo(() => ({
    // 代码块处理
    code({ node, inline, className: codeClassName, children, ...props }: any) {
      const match = /language-(\w+)/.exec(codeClassName || '');
      const language = match ? match[1] : '';
      
      if (!inline && language) {
        return (
          <CodeBlock 
            language={language}
            isDark={isDark}
          >
            {String(children).replace(/\n$/, '')}
          </CodeBlock>
        );
      }
      
      return <InlineCode>{children}</InlineCode>;
    },
    
    // 段落处理
    p: ({ children }: any) => <p>{children}</p>,
    
    // 标题处理 - 让CSS处理所有样式
    h1: ({ children }: any) => <h1>{children}</h1>,
    h2: ({ children }: any) => <h2>{children}</h2>,
    h3: ({ children }: any) => <h3>{children}</h3>,
    h4: ({ children }: any) => <h4>{children}</h4>,
    h5: ({ children }: any) => <h5>{children}</h5>,
    h6: ({ children }: any) => <h6>{children}</h6>,
    
    // 列表处理 - 确保有序列表使用我们的自定义样式
    ul: ({ children }: any) => <ul>{children}</ul>,
    ol: ({ children, start, ...props }: any) => (
      <ol style={{ listStyle: 'none' }} {...props}>
        {children}
      </ol>
    ),
    li: ({ children }: any) => <li>{children}</li>,
    
    // 引用块处理
    blockquote: ({ children }: any) => <blockquote>{children}</blockquote>,
    
    // 链接处理
    a: ({ href, children }: any) => (
      <a 
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    
    // 分割线
    hr: () => <hr />,
    
    // 强调文本
    strong: ({ children }: any) => <strong>{children}</strong>,
    em: ({ children }: any) => <em>{children}</em>,
    del: ({ children }: any) => <del>{children}</del>,
    
    // 表格处理
    table: ({ children }: any) => <Table>{children}</Table>,
    thead: ({ children }: any) => <TableHead>{children}</TableHead>,
    tbody: ({ children }: any) => <tbody>{children}</tbody>,
    tr: ({ children }: any) => <TableRow>{children}</TableRow>,
    th: ({ children }: any) => <TableCell isHeader>{children}</TableCell>,
    td: ({ children }: any) => <TableCell>{children}</TableCell>,
    
  }), [isDark]);

  // 流式渲染时，我们需要确保即使内容不完整也能正确渲染
  const processedContent = useMemo(() => {
    if (!content) return '';
    
    // 首先移除思考标签内容，避免在markdown中渲染
    let processedText = content.replace(/<think>[\s\S]*?(?:<\/think>|$)/g, '').trim();
    
    // 如果正在流式渲染，处理可能不完整的markdown
    if (isStreaming) {
      // 检查是否有未闭合的代码块
      const codeBlockMatches = processedText.match(/```/g);
      if (codeBlockMatches && codeBlockMatches.length % 2 === 1) {
        // 有未闭合的代码块，暂时闭合它以避免渲染错误
        return processedText + '\n```';
      }
      
      // 检查是否有未闭合的内联代码
      const inlineCodeMatches = processedText.match(/`/g);
      if (inlineCodeMatches && inlineCodeMatches.length % 2 === 1) {
        // 有未闭合的内联代码，暂时闭合它
        return processedText + '`';
      }
    }
    
    return processedText;
  }, [content, isStreaming]);

  return (
    <div 
      className={`markdown-renderer ${className}`}
      style={{
        ...style,
        maxWidth: '100%',
        overflowWrap: 'break-word',
        wordBreak: 'break-word'
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={components}
        skipHtml={false}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

MarkdownRendererComponent.displayName = 'MarkdownRenderer';

export const MarkdownRenderer = React.memo(MarkdownRendererComponent);