'use client';

import React, { useState } from 'react';
import { X, Terminal, Loader2, Check, AlertCircle } from 'lucide-react';

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

export function ToolCallPanel({ isOpen, onClose, message }: ToolCallPanelProps) {
  const [selectedTool, setSelectedTool] = useState<number>(0);

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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-theme-card border border-theme-border rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden animate-scale-up">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-theme-border">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-theme-primary" />
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
            <Terminal className="w-12 h-12 text-theme-foreground-muted mx-auto mb-3" />
            <p className="text-theme-foreground-muted">没有工具调用</p>
          </div>
        ) : (
          <div className="flex h-96">
            {/* 左侧工具列表 */}
            <div className="w-64 border-r border-theme-border bg-theme-background-secondary">
              <div className="p-3 border-b border-theme-border">
                <h4 className="text-sm font-medium text-theme-foreground">工具列表</h4>
              </div>
              <div className="overflow-y-auto max-h-80">
                {toolCalls.map((tool, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedTool(index)}
                    className={`p-3 cursor-pointer border-b border-theme-border transition-colors ${
                      selectedTool === index 
                        ? 'bg-theme-primary/10 border-l-2 border-l-theme-primary' 
                        : 'hover:bg-theme-card-hover'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {renderStatusIcon(tool.status)}
                        <span className="text-sm font-medium text-theme-foreground truncate">
                          {tool.toolName || tool.function?.name || '未知工具'}
                        </span>
                      </div>
                      <span className="text-xs text-theme-foreground-muted">#{index + 1}</span>
                    </div>
                    {tool.executionTime && (
                      <div className="text-xs text-theme-foreground-muted mt-1">
                        {formatTime(tool.executionTime)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 右侧详情 */}
            <div className="flex-1 overflow-y-auto">
              {toolCalls[selectedTool] && (
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    {renderStatusIcon(toolCalls[selectedTool].status)}
                    <h4 className="font-medium text-theme-foreground">
                      {toolCalls[selectedTool].toolName || toolCalls[selectedTool].function?.name || '未知工具'}
                    </h4>
                  </div>

                  {/* 参数 */}
                  <div>
                    <h5 className="text-sm font-medium text-theme-foreground mb-2">参数</h5>
                    <div className="bg-theme-background-secondary rounded-lg p-3 border border-theme-border">
                      <pre className="text-xs text-theme-foreground-secondary font-mono overflow-x-auto">
                        {JSON.stringify(
                          toolCalls[selectedTool].args || toolCalls[selectedTool].function?.arguments || {},
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  </div>

                  {/* 结果或错误 */}
                  {toolCalls[selectedTool].error ? (
                    <div>
                      <h5 className="text-sm font-medium text-red-500 mb-2">错误</h5>
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                        <div className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap">
                          {toolCalls[selectedTool].error}
                        </div>
                      </div>
                    </div>
                  ) : toolCalls[selectedTool].result ? (
                    <div>
                      <h5 className="text-sm font-medium text-theme-foreground mb-2">结果</h5>
                      <div className="bg-theme-background-secondary rounded-lg p-3 border border-theme-border max-h-48 overflow-y-auto">
                        <pre className="text-xs text-theme-foreground-secondary font-mono whitespace-pre-wrap">
                          {typeof toolCalls[selectedTool].result === 'string' 
                            ? toolCalls[selectedTool].result 
                            : JSON.stringify(toolCalls[selectedTool].result, null, 2)}
                        </pre>
                      </div>
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