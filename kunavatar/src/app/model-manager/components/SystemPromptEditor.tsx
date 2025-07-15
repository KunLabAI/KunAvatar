'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Copy, RotateCcw, ArrowDown, Maximize2, Minimize2, Trash2 } from 'lucide-react';
import { usePromptOptimizeSettings } from '../../settings/hooks/usePromptOptimizeSettings';

interface SystemPromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export interface OptimizeResult {
  originalText: string;
  optimizedText: string;
  timestamp: number;
}

export function SystemPromptEditor({ value, onChange, placeholder, className }: SystemPromptEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<OptimizeResult | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  
  const { settings } = usePromptOptimizeSettings();
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const expandedInputRef = useRef<HTMLTextAreaElement>(null);

  // 点击外部关闭扩展面板
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    }

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      // 面板打开时聚焦到输入框
      setTimeout(() => expandedInputRef.current?.focus(), 100);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  // ESC键关闭扩展面板
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded]);

  // 重置优化状态
  const resetOptimizeState = () => {
    setInputText('');
    setOptimizeResult(null);
    setCopySuccess(false);
  };

  // 处理提示词优化
  const handleOptimize = async () => {
    const textToOptimize = inputText.trim() || value.trim();
    if (!textToOptimize || !settings.promptEnabled || !settings.promptModel) {
      return;
    }

    setIsOptimizing(true);
    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch('/api/prompt-optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
        body: JSON.stringify({
          text: textToOptimize,
          model: settings.promptModel,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setOptimizeResult({
          originalText: textToOptimize,
          optimizedText: data.optimizedText,
          timestamp: Date.now(),
        });
      } else {
        console.error('提示词优化失败:', data.error);
        // TODO: 显示错误提示
      }
    } catch (error) {
      console.error('提示词优化请求失败:', error);
      // TODO: 显示错误提示
    } finally {
      setIsOptimizing(false);
    }
  };

  // 复制到剪贴板
  const handleCopy = async (text?: string) => {
    const textToCopy = text || value;
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  // 应用优化结果
  const handleApplyOptimized = () => {
    if (!optimizeResult) return;
    onChange(optimizeResult.optimizedText);
    setIsExpanded(false);
    resetOptimizeState();
  };

  // 清除内容
  const handleClear = () => {
    onChange('');
    resetOptimizeState();
  };

  // 按钮禁用状态
  const isOptimizeDisabled = !settings.promptEnabled || !settings.promptModel;

  return (
    <div className="relative">
      {/* 基础输入框 */}
      <div className="relative">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`form-input-base h-32 resize-none pr-24 ${className || ''}`}
          placeholder={placeholder || "定义模型的角色和行为..."}
        />
        
        {/* 操作按钮组 */}
        <div className="absolute top-2 right-2 flex gap-1">
          {/* 清除按钮 */}
          {value && (
            <button
              onClick={handleClear}
              className="p-1.5 text-theme-foreground-muted hover:text-theme-error hover:bg-theme-error/10 rounded transition-colors"
              title="清除内容"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          
          {/* 复制按钮 */}
          {value && (
            <button
              onClick={() => handleCopy()}
              className="p-1.5 text-theme-foreground-muted hover:text-theme-foreground hover:bg-theme-background rounded transition-colors"
              title="复制内容"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}
          
          {/* 提示词优化按钮 */}
          <button
            onClick={() => {
              if (isOptimizeDisabled) return;
              if (value) {
                setInputText(value);
              }
              setIsExpanded(true);
              resetOptimizeState();
            }}
            disabled={isOptimizeDisabled}
            className={`p-1.5 rounded transition-colors ${
              isOptimizeDisabled 
                ? 'text-theme-foreground-muted opacity-50 cursor-not-allowed'
                : 'text-theme-primary hover:bg-theme-primary/10'
            }`}
            title={isOptimizeDisabled ? "请先在设置中启用提示词优化功能" : "提示词优化"}
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
          
          {/* 扩展按钮 */}
          <button
            onClick={() => {
              setIsExpanded(!isExpanded);
              if (!isExpanded) {
                resetOptimizeState();
              }
            }}
            className="p-1.5 text-theme-foreground-muted hover:text-theme-foreground hover:bg-theme-background rounded transition-colors"
            title={isExpanded ? "收起编辑器" : "展开编辑器"}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 扩展编辑面板 */}
      {isExpanded && (
        <div 
          ref={panelRef}
          className="absolute bottom-full left-0 mb-2 w-full min-w-[600px] bg-theme-card border border-theme-border rounded-lg shadow-lg z-50"
        >
          {/* 面板头部 */}
          <div className="p-4 border-b border-theme-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-theme-primary" />
                <span className="text-sm font-medium text-theme-foreground">系统提示词编辑器</span>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 text-theme-foreground-muted hover:text-theme-foreground hover:bg-theme-background rounded transition-colors"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 编辑区域 */}
          <div className="p-4 space-y-4">
            {/* 主编辑框 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-theme-foreground">系统提示词内容</label>
              <textarea
                ref={expandedInputRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-3 py-3 text-sm border border-theme-border rounded-lg bg-theme-background text-theme-foreground placeholder-theme-foreground-muted focus:ring-2 focus:ring-theme-primary/30 focus:border-theme-primary resize-none"
                rows={8}
                placeholder="定义模型的角色和行为..."
              />
            </div>

            {/* 优化功能区域 */}
            {!isOptimizeDisabled && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-theme-primary" />
                  <span className="text-sm font-medium text-theme-foreground">提示词优化</span>
                </div>
                
                {/* 优化结果显示 */}
                {optimizeResult && (
                  <div className="border border-theme-border rounded-lg">
                    <div className="flex items-center justify-between p-3 border-b border-theme-border bg-theme-background/50">
                      <span className="text-xs font-medium text-theme-foreground-muted">优化结果</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleCopy(optimizeResult.optimizedText)}
                          className="p-1 text-theme-foreground-muted hover:text-theme-foreground hover:bg-theme-background rounded transition-colors"
                          title="复制优化结果"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={handleApplyOptimized}
                          className="p-1 text-theme-primary hover:bg-theme-primary/10 rounded transition-colors"
                          title="应用优化结果"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          onClick={resetOptimizeState}
                          className="p-1 text-theme-foreground-muted hover:text-theme-foreground hover:bg-theme-background rounded transition-colors"
                          title="清除优化结果"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="p-3 max-h-48 overflow-y-auto scrollbar-thin">
                      <p className="text-sm text-theme-foreground whitespace-pre-wrap leading-relaxed">
                        {optimizeResult.optimizedText}
                      </p>
                      {copySuccess && (
                        <div className="text-xs text-green-600 dark:text-green-400 mt-2">
                          已复制到剪贴板
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 优化输入区域 */}
                <div className="flex gap-2">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="输入需要优化的提示词，留空则优化当前内容..."
                    className="flex-1 px-3 py-2 text-sm border border-theme-border rounded-lg bg-theme-background text-theme-foreground placeholder-theme-foreground-muted focus:ring-2 focus:ring-theme-primary/30 focus:border-theme-primary resize-none"
                    rows={3}
                    disabled={isOptimizing}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleOptimize();
                      }
                    }}
                  />
                  <button
                    onClick={handleOptimize}
                    disabled={isOptimizing || (!inputText.trim() && !value.trim())}
                    className="px-3 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isOptimizing ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* 操作按钮组 */}
            <div className="flex justify-between items-center pt-2 border-t border-theme-border">
              <div className="flex gap-2">
                <button
                  onClick={handleClear}
                  className="px-3 py-1.5 text-sm text-theme-foreground-muted hover:text-theme-error hover:bg-theme-error/10 rounded transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  清除全部
                </button>
                <button
                  onClick={() => handleCopy()}
                  disabled={!value}
                  className="px-3 py-1.5 text-sm text-theme-foreground-muted hover:text-theme-foreground hover:bg-theme-background rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  复制内容
                </button>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="px-4 py-1.5 text-sm bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-colors"
              >
                完成编辑
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}