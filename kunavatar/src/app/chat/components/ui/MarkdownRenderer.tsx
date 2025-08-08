'use client';

import React, { useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import { Copy, Check } from 'lucide-react';

// 导入 KaTeX CSS
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onImagePreview?: (imageUrl: string, index: number, images: string[]) => void;
}

// 缓存处理过的内容，避免重复计算
const contentCache = new Map<string, string>();
const CACHE_SIZE_LIMIT = 100;

// 轻量级内容处理函数
const processContentLightweight = (content: string, isStreaming: boolean): string => {
  if (!content) return '';
  
  // 检查缓存
  const cacheKey = `${content}_${isStreaming}`;
  if (contentCache.has(cacheKey)) {
    return contentCache.get(cacheKey)!;
  }
  
  // 基础清理
  let processedText = content.replace(/<think>[\s\S]*?(?:<\/think>|$)/g, '').trim();
  
  // 只有在内容包含数学符号时才进行数学处理
  const hasMathContent = /[\$\\]/.test(processedText);
  
  if (hasMathContent) {
    // 简化的数学处理
    processedText = processedText.replace(/[\u00A0\u202F\u2000-\u200B]/g, ' ');
    processedText = processedText.replace(/\\left\$/g, '\\left(');
    processedText = processedText.replace(/\\right\$/g, '\\right)');
    
    // 简化的 TeX 分隔符处理
    processedText = processedText.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (_, inner) => `\n$$\n${inner.trim()}\n$$\n`);
    processedText = processedText.replace(/\\\(\s*(.*?)\s*\\\)/g, (_, inner) => `$${inner.trim()}$`);
    
    // 修复块级公式格式
    processedText = processedText.replace(/\$\$\s*([^$]+?)\s*\$\$/g, (_, formula) => `\n$$\n${formula.trim()}\n$$\n`);
  }
  
  // 清理多余的换行
  processedText = processedText.replace(/\n{3,}/g, '\n\n');
  
  // 流式渲染时的基本处理
  if (isStreaming) {
    const codeBlockCount = (processedText.match(/```/g) || []).length;
    if (codeBlockCount % 2 === 1) {
      processedText += '\n```';
    }
    
    const mathBlockCount = (processedText.match(/\$\$/g) || []).length;
    if (mathBlockCount % 2 === 1) {
      processedText += '\n$$';
    }
  }
  
  // 缓存结果
  if (contentCache.size >= CACHE_SIZE_LIMIT) {
    const firstKey = contentCache.keys().next().value;
    if (firstKey !== undefined) {
      contentCache.delete(firstKey);
    }
  }
  contentCache.set(cacheKey, processedText);
  
  return processedText;
};

// 完整内容处理函数（仅在必要时使用）
const processContentFull = (content: string, isStreaming: boolean): string => {
  if (!content) return '';
  
  let processedText = content.replace(/<think>[\s\S]*?(?:<\/think>|$)/g, '').trim();
  processedText = processedText.replace(/[\u00A0\u202F\u2000-\u200B]/g, ' ');
  processedText = processedText.replace(/\\left\$/g, '\\left(');
  processedText = processedText.replace(/\\right\$/g, '\\right)');
  
  // 完整的 TeX 分隔符处理
  const cleanInner = (inner: string) => {
    const trimmed = String(inner).trim();
    if (trimmed.startsWith('$$') && trimmed.endsWith('$$')) {
      return trimmed.substring(2, trimmed.length - 2).trim();
    }
    if (trimmed.startsWith('$') && trimmed.endsWith('$')) {
      return trimmed.substring(1, trimmed.length - 1).trim();
    }
    return trimmed;
  };

  const lines = processedText.split('\n');
  const out: string[] = [];
  let inCodeBlock = false;
  let inTexBlock = false;
  let texBuffer: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trimStart();
    
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      out.push(line);
      continue;
    }
    
    if (inCodeBlock) {
      out.push(line);
      continue;
    }
    
    if (inTexBlock) {
      if (line.includes('\\]')) {
        const idx = line.indexOf('\\]');
        const before = line.slice(0, idx);
        const after = line.slice(idx + 2);
        texBuffer.push(before);
        out.push('$$');
        out.push(cleanInner(texBuffer.join('\n')));
        out.push('$$');
        if (after) out.push(after);
        texBuffer = [];
        inTexBlock = false;
      } else {
        texBuffer.push(line);
      }
      continue;
    }
    
    if (line.includes('\\[')) {
      const idx = line.indexOf('\\[');
      const before = line.slice(0, idx);
      const rest = line.slice(idx + 2);
      if (before) out.push(before);
      
      if (rest.includes('\\]')) {
        const endIdx = rest.indexOf('\\]');
        const inside = rest.slice(0, endIdx);
        const after = rest.slice(endIdx + 2);
        out.push('$$');
        out.push(cleanInner(inside));
        out.push('$$');
        if (after) out.push(after);
      } else {
        inTexBlock = true;
        if (rest) texBuffer.push(rest);
      }
      continue;
    }
    
    line = line.replace(/\\\(\s*(.*?)\s*\\\)/g, (_, inner) => `$${cleanInner(inner)}$`);
    out.push(line);
  }
  
  if (!inTexBlock) {
    processedText = out.join('\n');
  }

  // 修复上下标
  const processedLines = processedText.split('\n');
  let inCodeBlockFinal = false;
  
  for (let i = 0; i < processedLines.length; i++) {
    const line = processedLines[i];
    const trimmed = line.trimStart();
    
    if (trimmed.startsWith('```')) {
      inCodeBlockFinal = !inCodeBlockFinal;
      continue;
    }
    
    if (!inCodeBlockFinal) {
      processedLines[i] = line.replace(/\$([^$]+)\$\s*(\^|_)\s*(\{[^}]+\}|[A-Za-z0-9]+)/g, (_, expr, op, supOrSub) => {
        return `$(${String(expr).trim()})${op}${String(supOrSub).trim()}$`;
      });
    }
  }
  
  processedText = processedLines.join('\n');
  
  // 自动包裹数学表达式
  const macroRegex = /\\(sum|frac|int|lim|binom|prod|sqrt|log|ln|exp|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|cdots|ldots|leq|geq|neq|times|to|infty|partial|nabla|cup|cap|subset|supset|in|notin|forall|exists)\b/;
  const finalLines = processedText.split('\n');
  let inCodeBlockMacro = false;
  
  for (let i = 0; i < finalLines.length; i++) {
    let line = finalLines[i];
    const trimmed = line.trimStart();
    
    if (trimmed.startsWith('```')) {
      inCodeBlockMacro = !inCodeBlockMacro;
      continue;
    }
    
    if (!inCodeBlockMacro && !line.includes('`') && !line.includes('$') && 
        !line.includes('\\[') && !line.includes('\\]') && 
        !line.includes('\\(') && !line.includes('\\)') && 
        macroRegex.test(line)) {
      
      const prefixMatch = line.match(/^(\s*(?:[-*+]\s+|\d+\.|\d+\)\s+|>\s+|#{1,6}\s+)?)/);
      const prefix = prefixMatch ? prefixMatch[1] : '';
      let body = line.slice(prefix.length);
      body = body.replace(/\s+$/g, '');
      
      if (/[^\\]\\$/.test(body)) {
        body = body.replace(/\\$/, '\\\\');
      }
      
      if (body.trim().length > 0) {
        finalLines[i] = `${prefix}$${body}$`;
      }
    }
  }
  
  processedText = finalLines.join('\n');
  processedText = processedText.replace(/\$\$\s*([^$]+?)\s*\$\$/g, (_, formula) => `\n$$\n${formula.trim()}\n$$\n`);
  processedText = processedText.replace(/\n{3,}/g, '\n\n');
  
  if (isStreaming) {
    const codeBlockMatches = processedText.match(/```/g);
    if (codeBlockMatches && codeBlockMatches.length % 2 === 1) {
      return processedText + '\n```';
    }
    
    const inlineCodeMatches = processedText.match(/`/g);
    if (inlineCodeMatches && inlineCodeMatches.length % 2 === 1) {
      return processedText + '`';
    }
    
    const mathBlockMatches = processedText.match(/\$\$/g);
    if (mathBlockMatches && mathBlockMatches.length % 2 === 1) {
      return processedText + '\n$$';
    }
    
    const mathInlineMatches = processedText.match(/(?<!\$)\$(?!\$)/g);
    if (mathInlineMatches && mathInlineMatches.length % 2 === 1) {
      return processedText + '$';
    }
  }
  
  return processedText;
};

// 增强的代码块组件
const CodeBlock = React.memo(({ 
  language, 
  children,
  isDark = false
}: { 
  language?: string;
  children: string;
  isDark?: boolean;
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  }, [children]);

  const displayLanguage = language || 'text';

  return (
    <div className="markdown-code-block">
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
});

CodeBlock.displayName = 'CodeBlock';

// 内联代码组件
const InlineCode = React.memo(({ children }: { children: React.ReactNode }) => (
  <code className="markdown-inline-code">
    {children}
  </code>
));

InlineCode.displayName = 'InlineCode';

// 检查是否为深色主题的Hook
const useIsDarkTheme = () => {
  const [isDark, setIsDark] = React.useState(() => {
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
      setIsDark(prev => prev !== isDarkMode ? isDarkMode : prev);
    };

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
const Table = React.memo(({ children }: { children: React.ReactNode }) => (
  <div className="markdown-table-wrapper">
    <table>
      {children}
    </table>
  </div>
));

Table.displayName = 'Table';

const TableHead = React.memo(({ children }: { children: React.ReactNode }) => (
  <thead>
    {children}
  </thead>
));

TableHead.displayName = 'TableHead';

const TableRow = React.memo(({ children }: { children: React.ReactNode }) => (
  <tr>
    {children}
  </tr>
));

TableRow.displayName = 'TableRow';

const TableCell = React.memo(({ children, isHeader = false }: { children: React.ReactNode; isHeader?: boolean }) => {
  const Component = isHeader ? 'th' : 'td';
  return (
    <Component>
      {children}
    </Component>
  );
});

TableCell.displayName = 'TableCell';

const MarkdownRendererComponent: React.FC<MarkdownRendererProps> = ({
  content,
  isStreaming = false,
  className = '',
  style,
  onImagePreview,
}) => {
  const isDark = useIsDarkTheme();

  // 针对流式渲染优化的markdown组件配置
  const components = useMemo(() => ({
    code({ node, inline, className: codeClassName, children, ...props }: any) {
      const match = /language-(\w+)/.exec(codeClassName || '');
      const language = match ? match[1] : '';
      
      if (codeClassName === 'language-math math-inline' || codeClassName === 'language-math math-display') {
        return <code className={codeClassName} {...props}>{children}</code>;
      }
      
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
    
    p: ({ children }: any) => <p>{children}</p>,
    h1: ({ children }: any) => <h1>{children}</h1>,
    h2: ({ children }: any) => <h2>{children}</h2>,
    h3: ({ children }: any) => <h3>{children}</h3>,
    h4: ({ children }: any) => <h4>{children}</h4>,
    h5: ({ children }: any) => <h5>{children}</h5>,
    h6: ({ children }: any) => <h6>{children}</h6>,
    
    ul: ({ children }: any) => <ul>{children}</ul>,
    ol: ({ children, start, ...props }: any) => (
      <ol style={{ listStyle: 'none' }} {...props}>
        {children}
      </ol>
    ),
    li: ({ children }: any) => <li>{children}</li>,
    
    blockquote: ({ children }: any) => <blockquote>{children}</blockquote>,
    
    a: ({ href, children }: any) => (
      <a 
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    
    hr: () => <hr />,
    strong: ({ children }: any) => <strong>{children}</strong>,
    em: ({ children }: any) => <em>{children}</em>,
    del: ({ children }: any) => <del>{children}</del>,
    
    img: ({ src, alt, ...props }: any) => (
      <img
        src={src}
        alt={alt || '图片'}
        className="max-w-full h-auto max-h-48 object-cover rounded-lg cursor-pointer"
        onClick={() => {
          if (src && onImagePreview) {
            onImagePreview(src, 0, [src]);
          } else if (src) {
            window.open(src, '_blank');
          }
        }}
        {...props}
      />
    ),
    
    table: ({ children }: any) => <Table>{children}</Table>,
    thead: ({ children }: any) => <TableHead>{children}</TableHead>,
    tbody: ({ children }: any) => <tbody>{children}</tbody>,
    tr: ({ children }: any) => <TableRow>{children}</TableRow>,
    th: ({ children }: any) => <TableCell isHeader>{children}</TableCell>,
    td: ({ children }: any) => <TableCell>{children}</TableCell>,
    
  }), [isDark, onImagePreview]);

  // 优化的内容处理逻辑
  const processedContent = useMemo(() => {
    if (!content) return '';
    
    // 根据内容复杂度和是否流式渲染选择处理策略
    const isComplexMath = /\\(frac|sum|int|lim|binom|prod|sqrt|begin|end|align|matrix)\b/.test(content);
    const hasMultipleMathBlocks = (content.match(/\$\$/g) || []).length > 2;
    
    // 对于简单内容或流式渲染，使用轻量级处理
    if (isStreaming || (!isComplexMath && !hasMultipleMathBlocks)) {
      return processContentLightweight(content, isStreaming);
    }
    
    // 对于复杂数学内容，使用完整处理
    return processContentFull(content, isStreaming);
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
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          rehypeRaw,
          [rehypeKatex, {
            throwOnError: false,
            errorColor: '#cc0000',
            strict: false,
            trust: false,
            macros: {
              "\\f": "#1f(#2)"
            }
          }]
        ]}
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