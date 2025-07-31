'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Send, Circle } from 'lucide-react';
import { 
  ToolControl,
  MemoryControl,
  PromptOptimizeControl,
  ChatActionsControl,
  ImageUploadControl
} from './input-controls';
import { useModelVisionValidation } from '../hooks/useModelVisionValidation';

type ChatMode = 'model' | 'agent';

interface Agent {
  id: number;
  name: string;
  description: string | null;
  model_id: number;
  system_prompt: string | null;
  avatar: string | null;
  memory_enabled: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  model: any;
  servers: any[];
  tools: any[];
}

interface MessageInputProps {
  chatMode: ChatMode;
  selectedModel: string;
  selectedAgent: Agent | null;
  currentConversationId: string | null;
  onCreateConversation: () => Promise<string | null>;
  isCreatingConversation: boolean;
  onSendMessage?: (message: string, images?: string[]) => Promise<void>;
  isStreaming?: boolean;
  disabled?: boolean;
  
  // 新增：停止生成功能
  onStopGeneration?: () => void;
  
  // 新增：控件相关属性
  enableTools?: boolean;
  selectedToolsCount?: number;
  onToolsToggle?: () => void;
  onClearChat?: () => void;
  onInsertText?: (text: string) => void;
  
  // 面板状态管理（移除提示词优化面板相关）
  showToolPanel?: boolean;
  showMemoryPanel?: boolean;  
  onToggleToolPanel?: () => void;
  onToggleMemoryPanel?: () => void;
  
  // 模型工具支持检测
  isCheckingModel?: boolean;
  modelSupportsTools?: boolean | null;
  
  // 图片上传相关
  enableImageUpload?: boolean;
  maxImages?: number;
  maxImageSize?: number;
  
  // 模型数据（用于多模态验证）
  availableModels?: any[];
}

export function MessageInput({
  chatMode,
  selectedModel,
  selectedAgent,
  currentConversationId,
  onSendMessage,
  isStreaming = false,
  disabled = false,
  
  // 停止生成功能
  onStopGeneration,
  
  // 控件相关属性
  enableTools = false,
  selectedToolsCount = 0,
  onToolsToggle,
  onClearChat,
  onInsertText,
  
  // 面板状态管理（移除提示词优化面板相关）
  showToolPanel = false,
  showMemoryPanel = false,
  onToggleToolPanel,
  onToggleMemoryPanel,
  
  // 模型工具支持检测
  isCheckingModel = false,
  modelSupportsTools = null,
  
  // 图片上传相关
  enableImageUpload = false,
  maxImages = 5,
  maxImageSize = 10 * 1024 * 1024, // 10MB
  
  // 模型数据
  availableModels = [],
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // 防抖定时器引用
  const adjustHeightTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 多模态验证Hook
  const { modelSupportsVision, validateImageUpload } = useModelVisionValidation({
    selectedModel,
    selectedAgent,
    chatMode,
    availableModels,
    showWarning: (title: string, message?: string) => {
      console.warn(`${title}: ${message}`);
      if (message) alert(`${title}: ${message}`);
    },
    showError: (title: string, message?: string) => {
      console.error(`${title}: ${message}`);
      if (message) alert(`${title}: ${message}`);
    }
  });

  // 检查是否可以发送消息
  const canSend = !isLoading && !isStreaming && !disabled && (message.trim().length > 0 || images.length > 0);
  const hasSelection = chatMode === 'model' ? !!selectedModel : !!selectedAgent;

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
    if (message === '' && textareaRef.current) {
      // 使用setTimeout确保DOM更新完成后再聚焦
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [message]);

  // 当message变化时自动调整高度（处理外部文本插入）
  useEffect(() => {
    adjustHeight();
  }, [message, adjustHeight]);

  // 组件挂载时初始化高度，避免刷新时的闪烁
  useEffect(() => {
    // 确保初始渲染时设置正确的高度
    if (textareaRef.current) {
      adjustHeight();
    }
  }, [adjustHeight]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (adjustHeightTimerRef.current) {
        clearTimeout(adjustHeightTimerRef.current);
      }
    };
  }, []);

  // 处理发送消息
  const handleSendMessage = useCallback(async () => {
    if (!canSend || !hasSelection) return;

    const messageToSend = message.trim();
    const imagesToSend = [...images];
    
    if (!messageToSend && imagesToSend.length === 0) return;

    // 如果有图片但模型不支持多模态，显示警告
    if (imagesToSend.length > 0 && !validateImageUpload()) {
      return;
    }

    try {
      setIsLoading(true);
      // 立即清空输入框和图片，提供更好的用户体验
      setMessage('');
      setImages([]);

      // 发送消息（对话创建逻辑在父组件处理）
      if (onSendMessage) {
        await onSendMessage(messageToSend, imagesToSend.length > 0 ? imagesToSend : undefined);
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      // 如果发送失败，恢复消息内容和图片
      setMessage(messageToSend);
      setImages(imagesToSend);
    } finally {
      setIsLoading(false);
    }
  }, [canSend, hasSelection, message, images, onSendMessage, validateImageUpload]);

  // 使用useCallback优化按键处理函数
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // 使用useCallback优化输入处理函数
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    
    // 立即更新状态，保持输入响应性
    setMessage(value);
    
    // 只对高度调整进行防抖
    adjustHeight();
  }, [adjustHeight]);

  // 停止生成（如果正在流式生成）
  const handleStopGeneration = useCallback(() => {
    if (onStopGeneration && isStreaming) {
      console.log('🛑 用户点击停止生成按钮');
      onStopGeneration();
    }
  }, [onStopGeneration, isStreaming]);

  // 处理图片上传控件的文件选择
  const handleImageControlUpload = useCallback(async (files: FileList) => {
    if (!enableImageUpload || !modelSupportsVision || disabled) return;

    const fileArray = Array.from(files);
    const remainingSlots = maxImages - images.length;
    
    if (fileArray.length > remainingSlots) {
      alert(`最多只能上传 ${maxImages} 张图片，当前还可以上传 ${remainingSlots} 张`);
      return;
    }

    const newImages: string[] = [];

    for (const file of fileArray) {
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        alert(`文件 "${file.name}" 不是图片文件`);
        continue;
      }

      // 验证文件大小
      if (file.size > maxImageSize) {
        const maxSizeMB = maxImageSize / (1024 * 1024);
        alert(`文件 "${file.name}" 大小超过 ${maxSizeMB}MB`);
        continue;
      }

      try {
        // 转换为base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // 移除data:image/...;base64,前缀，只保留base64数据
            const base64Data = result.split(',')[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        newImages.push(base64);
      } catch (error) {
        console.error('文件转换失败:', error);
        alert(`文件 "${file.name}" 转换失败`);
      }
    }

    if (newImages.length > 0) {
      setImages(prev => [...prev, ...newImages]);
    }
  }, [enableImageUpload, modelSupportsVision, disabled, maxImages, images.length, maxImageSize]);

  // 处理文本插入
  const handleInsertText = useCallback((text: string) => {
    if (onInsertText) {
      onInsertText(text);
    }
    
    // 如果有textareaRef，则直接插入到当前光标位置
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = message.substring(0, start) + text + message.substring(end);
      setMessage(newValue);
      
      // 设置新的光标位置
      setTimeout(() => {
        textarea.setSelectionRange(start + text.length, start + text.length);
        textarea.focus();
      }, 0);
    } else {
      // 如果没有textarea引用，则追加到末尾
      setMessage(prev => prev + text);
    }
  }, [message, onInsertText]);

  return (
    <div className="flex-shrink-0 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 整合的输入组件：控件栏 + 输入框 */}
        <div className="bg-theme-card border border-theme-border rounded-xl shadow-sm overflow-visible">
          {/* 控件栏 */}
          <div className="flex items-center justify-between px-4 py-3 bg-theme-background/50 overflow-visible">
            <div className="flex items-center space-x-2">
              {/* 图片上传控件 - 默认显示，点击时验证模型支持 */}
              {enableImageUpload && (
                <ImageUploadControl
                  onImagesSelected={handleImageControlUpload}
                  disabled={disabled || isStreaming}
                  hasImages={images.length > 0}
                  imageCount={images.length}
                  maxImages={maxImages}
                  tooltip={`上传图片 (${images.length}/${maxImages})`}
                  isCheckingModel={isCheckingModel}
                  modelSupportsVision={modelSupportsVision}
                  onValidationError={(title: string, message: string) => {
                    console.error(`${title}: ${message}`);
                    alert(`${title}: ${message}`);
                  }}
                />
              )}

              {/* 工具控件 */}
              {onToolsToggle && (
                <ToolControl
                  enableTools={enableTools}
                  isCheckingModel={isCheckingModel}
                  modelSupportsTools={modelSupportsTools}
                  selectedToolsCount={selectedToolsCount}
                  onToolsToggle={onToolsToggle}
                  isOpen={showToolPanel}
                  onToggle={onToggleToolPanel}
                />
              )}

              {/* 记忆控件 */}
              {chatMode === 'agent' && (
                <MemoryControl
                  conversationId={currentConversationId}
                  isOpen={showMemoryPanel}
                  onToggle={onToggleMemoryPanel}
                />
              )}
            </div>
            
            {/* 右侧：清除对话按钮 */}
            <div className="flex items-center">
              {onClearChat && (
                <ChatActionsControl
                  onClearChat={onClearChat}
                />
              )}
            </div>
          </div>

          {/* 输入区域 */}
          <div className="relative flex flex-col bg-theme-background/50 overflow-visible">
            {/* 文本输入区域 */}
            <div className="flex items-end overflow-visible">        
              {/* 左侧：提示词优化控件 */}
              <div className="flex-shrink-0 p-3 overflow-visible">
                <PromptOptimizeControl
                  currentText={message}
                  onTextChange={setMessage}
                  disabled={disabled || !hasSelection}
                />
              </div>
              
              {/* 主输入区域 */}
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyPress}
                  placeholder={
                    hasSelection 
                      ? `与${chatMode === 'model' ? selectedModel : selectedAgent?.name}对话...`
                      : `请先选择${chatMode === 'model' ? '模型' : '智能体'}...`
                  }
                  disabled={disabled || !hasSelection}
                  className="w-full px-4 py-3 bg-transparent text-theme-foreground placeholder-theme-foreground-muted border-0 resize-none focus:outline-none scrollbar-thin"
                  style={{ minHeight: '48px', lineHeight: '24px' }}
                  rows={1}
                />
                
                {/* 字符计数指示器（可选） */}
                {(message.length > 0 || images.length > 0) && (
                  <div className="absolute bottom-2 right-12 text-xs text-theme-foreground-muted pointer-events-none">
                    {message.length > 0 && `${message.length}字符`}
                    {message.length > 0 && images.length > 0 && ' • '}
                    {images.length > 0 && `${images.length}张图片`}
                  </div>
                )}
              </div>
              
              {/* 右侧：发送按钮 */}
              <div className="flex-shrink-0 p-3 flex items-center">
                {/* 发送按钮 */}
                <button
                  onClick={isStreaming ? handleStopGeneration : handleSendMessage}
                  disabled={!isStreaming && (!message.trim() && images.length === 0) || !hasSelection}
                  className={`
                    w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200
                    ${isStreaming
                      ? 'bg-red-500 hover:bg-red-600 text-white shadow-sm'
                      : (message.trim() || images.length > 0) && hasSelection
                        ? 'bg-theme-primary hover:bg-theme-primary/90 text-theme-primary-foreground shadow-sm'
                        : 'text-theme-foreground-muted cursor-not-allowed'
                    }
                  `}
                  title={isStreaming ? "停止生成" : "发送消息 (Enter)"}
                >
                  {isStreaming ? (
                    <Circle className="w-4 h-4 fill-current" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}