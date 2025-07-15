'use client';

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { Send, Square } from 'lucide-react';
import { Conversation } from '../../../../lib/database';

interface MessageInputProps {
  inputMessage: string;
  onInputChange: (message: string) => void;
  onSendMessage: () => void;
  onStopGeneration: () => void;
  isStreaming: boolean;
  currentConversation: Conversation | null;
  selectedModel: string;
}

export function MessageInput({
  inputMessage,
  onInputChange,
  onSendMessage,
  onStopGeneration,
  isStreaming,
  currentConversation,
  selectedModel
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
    <div className="flex gap-3 items-end">
      <textarea
        ref={textareaRef}
        value={inputMessage}
        onChange={handleInputChange}
        onKeyDown={handleKeyPress}
        placeholder="输入消息..."
        className="flex-1 p-3 border border-theme-input-border rounded-lg resize-none bg-theme-input text-theme-foreground placeholder-theme-foreground-muted focus:ring-2 focus:ring-theme-input-focus focus:border-transparent transition-colors duration-200"
        style={{ minHeight: '24px', lineHeight: '24px' }}
        rows={1}
        disabled={!currentConversation && !selectedModel}
      />
      <button
        onClick={isStreaming ? onStopGeneration : onSendMessage}
        disabled={!isStreaming && (!inputMessage.trim() || !selectedModel)}
        className={`relative w-12 h-12 text-white rounded-full flex items-center justify-center transition-all duration-200 ${
          isStreaming
            ? 'bg-theme-secondary hover:bg-theme-secondary-hover'
            : 'bg-theme-primary hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed'
        } ${
          isStreaming ? 'before:content-[""] before:absolute before:inset-0 before:rounded-full before:border-2 before:border-transparent before:border-t-white before:border-r-white before:animate-spin' : ''
        }`}
        onMouseEnter={() => {
          if (!isStreaming) {
            console.log('🔍 [MessageInput] 发送按钮状态检查:', {
              hasInput: !!inputMessage.trim(),
              hasModel: !!selectedModel,
              hasConversation: !!currentConversation,
              conversationId: currentConversation?.id,
              isDisabled: !inputMessage.trim() || !selectedModel
            });
          }
        }}
      >
        {isStreaming ? (
          <Square className="w-4 h-4 relative z-10" />
        ) : (
          <Send className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}