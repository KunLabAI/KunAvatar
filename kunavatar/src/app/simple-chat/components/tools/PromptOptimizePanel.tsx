'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Sparkles, Send, Copy, RotateCcw, ArrowDown, X, GripVertical } from 'lucide-react';
import { usePromptOptimizeSettings } from '../../../settings/hooks/usePromptOptimizeSettings';

interface OptimizeResult {
  optimizedText: string;
  originalText: string;
}

interface PromptOptimizePanelProps {
  onInsertText: (text: string) => void;
  onToggle: () => void;
}

export function PromptOptimizePanel({ onInsertText, onToggle }: PromptOptimizePanelProps) {
  const [inputText, setInputText] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<OptimizeResult | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // 拖拽相关状态
  const [panelHeight, setPanelHeight] = useState(158);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  
  const { settings } = usePromptOptimizeSettings();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 拖拽处理函数
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartHeight.current = panelHeight;
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - dragStartY.current;
      // 修正拖拽方向：向上拖拽(deltaY < 0)扩大，向下拖拽(deltaY > 0)缩小
      const newHeight = Math.max(158, Math.min(800, dragStartHeight.current - deltaY));
      setPanelHeight(newHeight);
      
      // 计算拖拽进度 (0-1)
      const progress = Math.abs(deltaY) / 158;
      setDragProgress(Math.min(1, progress));
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      setDragProgress(0);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [panelHeight]);

  // 优化提示词
  const handleOptimize = async () => {
    if (!inputText.trim() || isOptimizing) return;
    
    setIsOptimizing(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/prompt-optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          text: inputText,
          model: settings?.promptModel || 'undefined',
        }),
      });
      
      if (!response.ok) {
        throw new Error('优化失败');
      }
      
      const data = await response.json();
      setOptimizeResult({
        optimizedText: data.optimizedText,
        originalText: inputText,
      });
    } catch (error) {
      console.error('优化提示词失败:', error);
      // 这里可以添加错误提示
    } finally {
      setIsOptimizing(false);
    }
  };

  // 复制结果
  const handleCopy = async () => {
    if (!optimizeResult) return;
    
    try {
      await navigator.clipboard.writeText(optimizeResult.optimizedText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  // 插入到主输入框
  const handleInsert = () => {
    if (!optimizeResult) return;
    onInsertText(optimizeResult.optimizedText);
    onToggle();
    resetState();
  };

  // 重置状态
  const resetState = () => {
    setInputText('');
    setOptimizeResult(null);
    setCopySuccess(false);
  };

  return (
    <>
      {/* 优化结果区域 - 显示在面板外部上方 */}
      {optimizeResult && (
        <div className="mb-3 border border-[var(--color-border)] rounded-[var(--radius-lg)] flex flex-col bg-[var(--color-card)] shadow-lg">
          <div className="flex items-center justify-between p-3 border-b border-[var(--color-border)] bg-[var(--color-background-secondary)] flex-shrink-0">
            <span className="text-xs font-medium text-[var(--color-foreground-muted)]">优化结果</span>
            <div className="flex gap-1">
              <button
                onClick={handleCopy}
                className="p-1 text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-background)] rounded-[var(--radius-sm)] transition-colors"
                title="复制"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                onClick={handleInsert}
                className="p-1 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-[var(--radius-sm)] transition-colors"
                title="插入到输入框"
              >
                <ArrowDown className="w-3 h-3" />
              </button>
              <button
                onClick={resetState}
                className="p-1 text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-background)] rounded-[var(--radius-sm)] transition-colors"
                title="清除"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="p-3 overflow-y-auto scrollbar-thin" style={{ maxHeight: '200px' }}>
            <p className="text-sm text-[var(--color-foreground)] whitespace-pre-wrap leading-relaxed">
              {optimizeResult.optimizedText}
            </p>
            {copySuccess && (
              <div className="text-xs text-[var(--color-success)] mt-2">
                已复制到剪贴板
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* 提示词优化输入面板 */}
      <div 
        className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-lg overflow-hidden flex flex-col"
        style={{ height: `${panelHeight}px` }}
      >
        {/* 拖拽手柄 */}
        <div 
          className={`relative flex items-center justify-center h-2 bg-[var(--color-background-secondary)] border-b border-[var(--color-border)] cursor-ns-resize select-none transition-all duration-200 ${
            isDragging 
              ? 'bg-[var(--color-primary)]/15' 
              : isHovering 
              ? 'bg-[var(--color-card-hover)]' 
              : 'hover:bg-[var(--color-card-hover)]'
          }`}
          onMouseDown={handleMouseDown}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          title="拖拽调整面板高度"
          style={{ userSelect: 'none' }}
        >
          {/* 拖拽进度指示器 */}
          <div 
            className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary)]/60 transition-all duration-200"
            style={{ 
              width: `${dragProgress * 100}%`,
              opacity: isDragging || isHovering ? 1 : 0
            }}
          />
          
          {/* 简化的拖拽图标 */}
          <GripVertical className={`w-3 h-3 transition-colors duration-200 ${
            isDragging 
              ? 'text-[var(--color-primary)]' 
              : isHovering 
              ? 'text-[var(--color-foreground)]'
              : 'text-[var(--color-foreground-muted)]'
          }`} />
        </div>
        
        <div className="p-4 flex-1 flex flex-col min-h-0">
          {/* 面板头部 */}
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
                <span className="text-sm font-medium text-[var(--color-foreground)]">提示词优化</span>
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => {
                  onToggle();
                  resetState();
                }}
                className="p-1 hover:bg-[var(--color-card-hover)] rounded-[var(--radius-sm)] transition-colors"
                title="关闭优化面板"
              >
                <X className="w-4 h-4 text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] transition-colors" />
              </button>
            </div>
          </div>

          {/* 输入区域 */}
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="输入需要优化的提示词..."
              className="flex-1 px-3 py-2 text-sm border border-[var(--color-border)] rounded-[var(--radius-lg)] bg-[var(--color-background)] text-[var(--color-foreground)] placeholder-[var(--color-foreground-muted)] focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] resize-none"
              style={{ minHeight: `${Math.max(80, (panelHeight - 180) * 0.6)}px` }}
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
              disabled={!inputText.trim() || isOptimizing}
              className="px-3 py-2 bg-[var(--color-primary)] text-white rounded-[var(--radius-lg)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
              style={{ height: '40px' }}
            >
              {isOptimizing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}