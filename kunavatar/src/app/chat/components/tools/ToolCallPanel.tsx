'use client';

import React, { useState } from 'react';
import { X, Axe, Loader2, Check, AlertCircle, Copy } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  model?: string;
  toolCalls?: any[];
  thinking?: string;
  // 工具调用相关字段
  tool_name?: string;
  tool_args?: string;
  tool_result?: string;
  tool_status?: 'executing' | 'completed' | 'error';
  tool_execution_time?: number;
  tool_error?: string;
}

interface ToolCallPanelProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message;
}

// 代码块组件，复用MarkdownRenderer的样式
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

  const displayLanguage = language || 'json';

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
      setIsDark(prev => {
        if (prev !== isDarkMode) {
          return isDarkMode;
        }
        return prev;
      });
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

export function ToolCallPanel({ isOpen, onClose, message }: ToolCallPanelProps) {
  const [selectedTool, setSelectedTool] = useState<number>(0);
  const isDark = useIsDarkTheme();

  // 添加键盘ESC退出功能
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toolCalls = message.toolCalls || [];

  // 渲染状态图标
  const renderStatusIcon = (status?: string) => {
    switch (status) {
      case 'executing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Check className="w-4 h-4 text-green-500" />;
    }
  };

  // 格式化执行时间
  const formatTime = (time?: number) => {
    if (!time) return '';
    return time < 1000 ? `${time}ms` : `${(time / 1000).toFixed(2)}s`;
  };

  // 如果有多个工具调用，显示导航
  const showNavigation = toolCalls.length > 1;
  const currentTool = toolCalls[selectedTool];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-theme-card border border-theme-border rounded-xl shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden animate-scale-up">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-theme-border">
          <div className="flex items-center gap-3">
            <Axe className="w-5 h-5 text-theme-primary" />
            <div>
              <h3 className="font-semibold text-theme-foreground">工具调用</h3>
              <p className="text-sm text-theme-foreground-muted">
                {message.model} • {toolCalls.length} 个调用
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-theme-card-hover rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-theme-foreground-muted" />
          </button>
        </div>

        {toolCalls.length === 0 ? (
          <div className="p-8 text-center">
            <Axe className="w-12 h-12 text-theme-foreground-muted mx-auto mb-3" />
            <p className="text-theme-foreground-muted">没有工具调用</p>
          </div>
        ) : (
          <div className="flex flex-col" style={{ height: 'calc(85vh - 120px)' }}>
            {/* 工具导航（如果有多个工具） */}
            {showNavigation && (
              <div className="border-b border-theme-border bg-theme-background-secondary">
                <div className="flex items-center gap-2 p-3 overflow-x-auto scrollbar-thin scrollbar-thumb-theme-border scrollbar-track-transparent">
                  {toolCalls.map((tool, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedTool(index)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap flex-shrink-0 ${
                        selectedTool === index 
                          ? 'bg-theme-primary text-white' 
                          : 'bg-theme-card hover:bg-theme-card-hover text-theme-foreground'
                      }`}
                    >
                      {renderStatusIcon(tool.status)}
                      <span className="truncate max-w-32">
                        {tool.toolName || tool.function?.name || '未知工具'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 工具详情 */}
            <div className="flex-1 overflow-y-auto p-4">
              {currentTool && (
                <div className="space-y-4">
                  {/* 工具名称和状态 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {renderStatusIcon(currentTool.status)}
                      <h4 className="text-lg font-semibold text-theme-foreground">
                        {currentTool.toolName || currentTool.function?.name || '未知工具'}
                      </h4>
                    </div>
                    {currentTool.executionTime && (
                      <span className="text-sm text-theme-foreground-muted bg-theme-background-secondary px-2 py-1 rounded">
                        {formatTime(currentTool.executionTime)}
                      </span>
                    )}
                  </div>

                  {/* 工具参数 - 使用代码块样式 */}
                  <div>
                    <h5 className="text-sm font-medium text-theme-foreground mb-3">参数</h5>
                    <CodeBlock 
                      language="json"
                      isDark={isDark}
                    >
                      {JSON.stringify(
                        currentTool.args || currentTool.function?.arguments || {},
                        null,
                        2
                      )}
                    </CodeBlock>
                  </div>

                  {/* 工具结果或错误 */}
                  {currentTool.error ? (
                    <div>
                      <h5 className="text-sm font-medium text-red-500 mb-3">错误</h5>
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <div className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap">
                          {currentTool.error}
                        </div>
                      </div>
                    </div>
                  ) : currentTool.result ? (
                    <div>
                      <h5 className="text-sm font-medium text-theme-foreground mb-3">结果</h5>
                      <CodeBlock 
                        language="text"
                        isDark={isDark}
                      >
                        {typeof currentTool.result === 'string' 
                          ? currentTool.result 
                          : JSON.stringify(currentTool.result, null, 2)}
                      </CodeBlock>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}