'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Wrench, GripVertical, ChevronDown, ChevronRight, Loader2, Check, AlertCircle } from 'lucide-react';
import { ToolCallMessage } from './ToolCallMessage';

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
  const [panelHeight, setPanelHeight] = useState(400);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const [expandedToolCalls, setExpandedToolCalls] = useState<Set<string>>(new Set());
  
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const startHeight = useRef(0);
  const animationFrameRef = useRef<number>(0);
  const lastUpdateTime = useRef(0);
  
  const minHeight = 200;
  const maxHeight = 600;

  // 平滑动画更新高度
  const smoothUpdateHeight = useCallback((targetHeight: number) => {
    const now = performance.now();
    if (now - lastUpdateTime.current < 8) return;
    
    lastUpdateTime.current = now;
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      setPanelHeight(targetHeight);
      const progress = (targetHeight - minHeight) / (maxHeight - minHeight);
      setDragProgress(Math.max(0, Math.min(1, progress)));
    });
  }, [minHeight, maxHeight]);

  // 拖拽处理
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    dragStartY.current = e.clientY;
    startHeight.current = panelHeight;
    
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const deltaY = dragStartY.current - e.clientY;
      const sensitivity = 1.2;
      const rawHeightChange = deltaY * sensitivity;
      
      let heightChange = rawHeightChange;
      const targetHeight = startHeight.current + rawHeightChange;
      
      if (targetHeight < minHeight) {
        const overflow = minHeight - targetHeight;
        heightChange = rawHeightChange + overflow * 0.7;
      } else if (targetHeight > maxHeight) {
        const overflow = targetHeight - maxHeight;
        heightChange = rawHeightChange - overflow * 0.7;
      }
      
      const newHeight = Math.max(
        minHeight * 0.9,
        Math.min(
          maxHeight * 1.1,
          startHeight.current + heightChange
        )
      );
      
      smoothUpdateHeight(newHeight);
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      
      const finalHeight = Math.max(minHeight, Math.min(maxHeight, panelHeight));
      if (finalHeight !== panelHeight) {
        if (panelRef.current) {
          panelRef.current.style.transition = 'height 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
          setTimeout(() => {
            if (panelRef.current) {
              panelRef.current.style.transition = '';
            }
          }, 300);
        }
        smoothUpdateHeight(finalHeight);
      }
      
      setIsDragging(false);
      document.body.style.overflow = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.body.style.overflow = 'hidden';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp, { passive: false });
  }, [panelHeight, smoothUpdateHeight, minHeight, maxHeight]);

  // 切换工具调用展开状态
  const toggleToolCallExpand = (toolCallId: string) => {
    setExpandedToolCalls(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(toolCallId)) {
        newExpanded.delete(toolCallId);
      } else {
        newExpanded.add(toolCallId);
      }
      return newExpanded;
    });
  };

  // 清理动画帧
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const toolCalls = message.toolCalls || [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4">
      <div 
        ref={panelRef}
        className="w-full max-w-4xl bg-theme-card border border-theme-border rounded-t-xl shadow-lg overflow-hidden flex flex-col"
        style={{ height: `${panelHeight}px` }}
      >
        {/* 拖拽手柄 */}
        <div 
          className={`relative flex items-center justify-center h-3 bg-theme-background-secondary border-b border-theme-border cursor-ns-resize select-none transition-all duration-200 ${
            isDragging 
              ? 'bg-theme-primary/15' 
              : isHovering 
              ? 'bg-theme-card-hover' 
              : 'hover:bg-theme-card-hover'
          }`}
          onMouseDown={handleMouseDown}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          title="拖拽调整面板高度"
        >
          <div 
            className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-theme-primary to-theme-primary/60 transition-all duration-200"
            style={{ 
              width: `${dragProgress * 100}%`,
              opacity: isDragging || isHovering ? 1 : 0
            }}
          />
          <GripVertical className={`w-4 h-4 transition-colors duration-200 ${
            isDragging 
              ? 'text-theme-primary' 
              : isHovering 
              ? 'text-theme-foreground'
              : 'text-theme-foreground-muted'
          }`} />
        </div>

        {/* 面板头部 */}
        <div className="flex items-center justify-between p-4 bg-theme-background/50 border-b border-theme-border">
          <div className="flex items-center space-x-3">
            <Wrench className="w-5 h-5 text-theme-primary" />
            <div>
              <h3 className="text-lg font-semibold text-theme-foreground">
                MCP 工具调用详情
              </h3>
              <p className="text-sm text-theme-foreground-muted">
                模型: {message.model} • 共 {toolCalls.length} 个工具调用
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-theme-card-hover rounded-lg transition-colors"
            title="关闭面板"
          >
            <X className="w-5 h-5 text-theme-foreground-muted hover:text-theme-foreground" />
          </button>
        </div>

        {/* 面板内容 */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
          {toolCalls.length === 0 ? (
            <div className="text-center py-8">
              <Wrench className="w-12 h-12 text-theme-foreground-muted mx-auto mb-4" />
              <p className="text-theme-foreground-muted">此消息没有工具调用</p>
            </div>
          ) : (
            <div className="space-y-4">
              {toolCalls.map((toolCall, index) => {
                const toolCallId = toolCall.id || `tool-${index}`;
                const isExpanded = expandedToolCalls.has(toolCallId);
                
                return (
                  <div key={toolCallId} className="border border-theme-border rounded-lg overflow-hidden">
                    {/* 工具调用摘要 */}
                    <div
                      onClick={() => toggleToolCallExpand(toolCallId)}
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-theme-card-hover transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-theme-foreground-muted" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-theme-foreground-muted" />
                        )}
                        
                        <Wrench className="w-4 h-4 text-theme-primary" />
                        
                        <div>
                          <span className="text-sm font-medium text-theme-foreground">
                            {toolCall.toolName || toolCall.function?.name || '未知工具'}
                          </span>
                          {toolCall.status && (
                            <div className="flex items-center ml-2">
                              {toolCall.status === 'executing' ? (
                                <Loader2 className="w-3 h-3 text-theme-primary animate-spin" />
                              ) : toolCall.status === 'completed' ? (
                                <Check className="w-3 h-3 text-green-500" />
                              ) : (
                                <AlertCircle className="w-3 h-3 text-red-500" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-xs text-theme-foreground-muted">
                        {isExpanded ? '收起' : '展开'}
                      </div>
                    </div>

                    {/* 工具调用详情 */}
                    {isExpanded && (
                      <div className="border-t border-theme-border bg-theme-background/50">
                        <ToolCallMessage
                          toolCall={{
                            id: toolCallId,
                            toolName: toolCall.toolName || toolCall.function?.name || '未知工具',
                            args: toolCall.args || toolCall.function?.arguments || {},
                            status: toolCall.status || 'completed',
                            result: toolCall.result,
                            error: toolCall.error,
                            startTime: toolCall.startTime || Date.now(),
                            executionTime: toolCall.executionTime,
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}