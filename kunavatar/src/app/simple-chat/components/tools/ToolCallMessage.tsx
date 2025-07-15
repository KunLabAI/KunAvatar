import React, { useState, useEffect } from 'react';
import { Wrench, ChevronDown, ChevronRight, Loader2, Check, AlertCircle } from 'lucide-react';
import Image from 'next/image';

interface ToolCallMessageProps {
  toolCall: {
    id: string;
    toolName: string;
    args: any;
    status: 'executing' | 'completed' | 'error';
    result?: string;
    error?: string;
    startTime: number;
    executionTime?: number;
  };
}

export function ToolCallMessage({ toolCall }: ToolCallMessageProps) {
  // 当状态为错误时，默认展开显示错误信息
  const [isExpanded, setIsExpanded] = useState(toolCall.status === 'error');
  
  // 当工具调用状态变为错误时，自动展开面板
  useEffect(() => {
    if (toolCall.status === 'error') {
      setIsExpanded(true);
    }
  }, [toolCall.status]);

  // 检测并渲染图片URL
  const renderImageIfUrl = (text: string | any) => {
    // 确保text是字符串类型
    const textStr = typeof text === 'string' ? text : JSON.stringify(text, null, 2);
    const imageUrlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg))/gi;
    const parts = textStr.split(imageUrlRegex);
    
    if (parts.length === 1) {
      return <span>{textStr}</span>;
    }
    
    return (
      <div className="space-y-2">
        {parts
          .map((part, index) => {
            if (imageUrlRegex.test(part)) {
              return (
                <div key={`image-${index}`} className="my-2">
                  <Image 
                    src={part} 
                    alt="Generated image" 
                    width={800}
                    height={600}
                    className="max-w-full h-auto rounded-lg border border-gray-200 dark:border-gray-700"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="text-xs text-gray-500 mt-1">{part}</div>
                </div>
              );
            }
            return part ? <span key={`text-${index}`}>{part}</span> : null;
          })
          .filter(Boolean)}
      </div>
    );
  };

  const renderResult = () => {
    if (toolCall.status === 'executing') {
      return null;
    }

    if (toolCall.status === 'error') {
      return (
        <div>
          <div className="text-sm font-medium text-[var(--color-foreground)] mb-1">错误信息：</div>
          <div className="text-sm text-[var(--color-foreground-secondary)] whitespace-pre-wrap break-words min-w-0 word-wrap streaming-content">
            {toolCall.error || '未知错误'}
          </div>
        </div>
      );
    }

    if (toolCall.status === 'completed' && toolCall.result) {
      // 尝试解析JSON格式的结果
      let formattedResult = toolCall.result;
      let isJsonResult = false;
      
      try {
        const parsed = JSON.parse(toolCall.result);
        formattedResult = JSON.stringify(parsed, null, 2);
        isJsonResult = true;
      } catch (e) {
        // 不是JSON格式，保持原样
      }
      
      return (
        <div>
          <div className="text-sm font-medium text-[var(--color-foreground)] mb-1">执行结果：</div>
          <div className="text-sm text-[var(--color-foreground-secondary)] max-h-96 overflow-y-auto scrollbar-thin">
            {isJsonResult ? (
              <pre className="whitespace-pre-wrap font-mono text-xs bg-[var(--color-background-secondary)] p-2 rounded-[var(--radius)] overflow-x-auto scrollbar-thin">
                {formattedResult}
              </pre>
            ) : (
              <div className="whitespace-pre-wrap break-words min-w-0 word-wrap streaming-content">
                {renderImageIfUrl(formattedResult)}
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex gap-3 min-w-0" style={{paddingLeft: '52px'}}>
      <div className="flex flex-col flex-1 max-w-[75%] min-w-0">
        <div className="rounded-[var(--radius-lg)]">
          {/* 标题栏 */}
          <div
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-between p-1 cursor-pointer hover:bg-[var(--color-card-hover)] rounded-[var(--radius-lg)] transition-colors"
          >
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-[var(--color-foreground-muted)]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[var(--color-foreground-muted)]" />
              )}
              
              <Wrench className="w-4 h-4 text-[var(--color-primary)]" />
              <span className="text-sm font-medium text-[var(--color-foreground)]">
                工具调用 - {toolCall.toolName}
              </span>
              
              {/* 状态图标显示 - 移到工具名称旁边 */}
              <div className="flex items-center ml-2">
                {toolCall.status === 'executing' ? (
                  <Loader2 className="w-4 h-4 text-[var(--color-primary)] animate-spin" />
                ) : toolCall.status === 'completed' ? (
                  <Check className="w-4 h-4 text-[var(--color-success)]" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-[var(--color-error)]" />
                )}
              </div>
            </div>
          </div>

          {/* 工具调用内容 */}
          {isExpanded && (
            <div className="p-2">
              {/* 参数显示 */}
              <div className="mb-3">
                <div className="text-sm font-medium text-[var(--color-foreground)] mb-1">参数：</div>
                <pre className="text-xs text-[var(--color-foreground-secondary)] whitespace-pre-wrap break-words min-w-0 word-wrap streaming-content bg-[var(--color-background-secondary)] p-2 rounded-[var(--radius)] overflow-x-auto scrollbar-thin">
                  {JSON.stringify(toolCall.args, null, 2)}
                </pre>
              </div>
              
              {/* 执行结果 */}
              {renderResult()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}