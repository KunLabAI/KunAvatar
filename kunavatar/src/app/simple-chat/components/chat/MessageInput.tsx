'use client';

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { Send, Square, Sparkles } from 'lucide-react';
import { Conversation } from '../../../../lib/database';

interface MessageInputProps {
  inputMessage: string;
  onInputChange: (message: string) => void;
  onSendMessage: () => void;
  onStopGeneration: () => void;
  isStreaming: boolean;
  currentConversation: Conversation | null;
  selectedModel: string;
  
  // 新增：提示词优化相关属性
  onInsertText?: (text: string) => void;
  promptOptimizeEnabled?: boolean;
  onPromptOptimizeToggle?: () => void;
}

export function MessageInput({
  inputMessage,
  onInputChange,
  onSendMessage,
  onStopGeneration,
  isStreaming,
  currentConversation,
  selectedModel,
  onInsertText,
  promptOptimizeEnabled = false,
  onPromptOptimizeToggle
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 防抖定时器引用
  const adjustHeightTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 使用useCallback优化自动调整高度的函数，添加防抖
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // 清除之前的定时器
    if (adjustHeightTimerRef.current) {
      clearTimeout(adjustHeightTimerRef.current);
    }
    
    // 使用防抖，减少频繁的DOM操作
    adjustHeightTimerRef.current = setTimeout(() => {
      requestAnimationFrame(() => {
        textarea.style.height = 'auto';
        const scrollHeight = textarea.scrollHeight;
        const lineHeight = 24; // 大约每行24px
        const maxHeight = lineHeight * 6; // 最大6行
        const minHeight = lineHeight * 1; // 最小1行
        
        const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
        textarea.style.height = `${newHeight}px`;
        
        // 如果内容超过最大高度，启用滚动
        if (scrollHeight > maxHeight) {
          textarea.style.overflowY = 'auto';
        } else {
          textarea.style.overflowY = 'hidden';
        }
      });
    }, 16); // 约60fps的更新频率
  }, []);

  // 当输入框被清空时（发送消息后）自动聚焦
  useEffect(() => {
    if (inputMessage === '' && textareaRef.current) {
      // 使用setTimeout确保DOM更新完成后再聚焦
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [inputMessage]);

  // 当inputMessage变化时自动调整高度（处理外部文本插入）
  useEffect(() => {
    adjustHeight();
  }, [inputMessage, adjustHeight]);

  // 组件挂载时初始化高度，避免刷新时的闪烁
  useEffect(() => {
    // 确保初始渲染时设置正确的高度
    if (textareaRef.current) {
      adjustHeight();
    }
  }, [adjustHeight]);

  // 使用useCallback优化按键处理函数
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  }, [onSendMessage]);

  // 使用useCallback优化输入处理函数
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    
    // 立即更新状态，保持输入响应性
    onInputChange(value);
    
    // 只对高度调整进行防抖
    adjustHeight();
  }, [onInputChange, adjustHeight]);
  
  // 清理定时器
  useEffect(() => {
    return () => {
      if (adjustHeightTimerRef.current) {
        clearTimeout(adjustHeightTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      {/* 集成式输入框容器 */}
      <div className="relative flex items-end bg-[var(--color-background-secondary)] border border-[var(--color-border)] rounded-xl transition-all duration-200 focus-within:ring-1 focus-within:ring-[var(--color-primary)] focus-within:ring-opacity-20 focus-within:border-[var(--color-primary)]">
        {/* 左侧：提示词优化按钮 - 统一样式 */}
        {onPromptOptimizeToggle && (
          <div className="flex-shrink-0 p-3">
            <button
              onClick={onPromptOptimizeToggle}
              className={`
                w-8 h-8 rounded-xl transition-all duration-200 flex items-center justify-center
                ${promptOptimizeEnabled 
                  ? 'text-[var(--color-primary)]' 
                  : 'text-[var(--color-foreground-secondary)]'
                }
              `}
              title="提示词优化"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {/* 中间：输入框 */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder="输入消息..."
            className="w-full p-3 pr-4 bg-transparent text-[var(--color-foreground)] placeholder-[var(--color-foreground-muted)] border-0 resize-none focus:outline-none scrollbar-thin"
            style={{ minHeight: '24px', lineHeight: '24px' }}
            rows={1}
            disabled={!currentConversation && !selectedModel}
          />
          
          {/* 字符计数指示器（可选） */}
          {inputMessage.length > 0 && (
            <div className="absolute bottom-1 right-2 text-xs text-[var(--color-foreground-muted)] pointer-events-none">
              {inputMessage.length}
            </div>
          )}
        </div>
        
        {/* 右侧：发送按钮 */}
        <div className="flex-shrink-0 p-3">
          <button
            onClick={isStreaming ? onStopGeneration : onSendMessage}
            disabled={!isStreaming && (!inputMessage.trim() || !selectedModel)}
            className={`
              w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200
              ${isStreaming
                ? 'bg-[var(--color-secondary)] hover:bg-[var(--color-secondary-hover)] text-white'
                : inputMessage.trim() && selectedModel
                  ? 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white'
                  : 'text-[var(--color-foreground-muted)] cursor-not-allowed'
              }
            `}
          >
            {isStreaming ? (
              <Square className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}