'use client';

import React, { useEffect, useState } from 'react';
import { Bot, User, Info, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { ThinkingMode, hasThinkingContent, removeThinkingContent } from '../ui/ThinkingMode';
import StreamedContent from '../ui/StreamedContent';
import { ToolCallMessage } from '../tools/ToolCallMessage';
import { ChatStyle, DisplaySize } from '../input-controls';
import { SimpleMessage } from '../../types';
import ModelLogo from '@/app/model-manager/components/ModelLogo';
import { AgentWithRelations } from '@/app/agents/types';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useAutoScroll } from '@/app/simple-chat/hooks/useAutoScroll';
import { AgentAvatar } from '../ui/AgentAvatar';

interface MessageListProps {
  messages: SimpleMessage[];
  isStreaming: boolean;
  expandedThinkingMessages: Set<string>;
  onToggleThinkingExpand: (messageId: string) => void;
  chatStyle?: ChatStyle;
  selectedModel?: string;
  // 重新添加customModels以支持正确的模型显示
  customModels?: Array<{
    base_model: string;
    display_name: string;
    family?: string;
  }>;
  // 智能体信息
  selectedAgent?: AgentWithRelations | null;
}

export function MessageList({
  messages,
  isStreaming,
  expandedThinkingMessages,
  onToggleThinkingExpand,
  chatStyle: propChatStyle,
  selectedModel,
  customModels,
  selectedAgent,
}: MessageListProps) {
  // 使用用户设置hook
  const { settings, loading: settingsLoading } = useUserSettings();
  
  // 优化：使用稳定的样式状态，避免频繁变化导致的抖动
  const [stableChatStyle, setStableChatStyle] = useState(propChatStyle || settings.chatStyle);
  const [stableDisplaySize, setStableDisplaySize] = useState(settings.displaySize);
  
  // 防抖更新样式，避免设置加载时的抖动
  useEffect(() => {
    if (!settingsLoading) {
      const newChatStyle = propChatStyle || settings.chatStyle;
      const newDisplaySize = settings.displaySize;
      
      // 只有当样式真正改变时才更新
      if (newChatStyle !== stableChatStyle) {
        setStableChatStyle(newChatStyle);
      }
      if (newDisplaySize !== stableDisplaySize) {
        setStableDisplaySize(newDisplaySize);
      }
    }
  }, [settings.chatStyle, settings.displaySize, propChatStyle, settingsLoading, stableChatStyle, stableDisplaySize]);
  
  const currentChatStyle = stableChatStyle;
  const currentDisplaySize = stableDisplaySize;
  
  // 使用自动滚动hook
  const {
    scrollContainerRef,
    messagesEndRef,
    isNearBottom,
    isNearTop,
    showScrollButtons,
    scrollToBottom,
    scrollToTop,
    updateScrollPosition
  } = useAutoScroll({ messages, isStreaming });

  // 获取模型的显示信息 - 修复：正确查找customModels
  const getModelDisplayInfo = (modelName?: string) => {
    if (!modelName) return { displayName: 'AI助手', family: 'default' };
    
    // 查找对应的自定义模型信息
    const customModel = customModels?.find(m => m.base_model === modelName);
    
    return {
      displayName: customModel?.display_name || modelName,
      family: customModel?.family || modelName.split(':')[0] || 'default'
    };
  };



  // 格式化时间（纳秒转秒）
  const formatDuration = (nanoseconds?: number) => {
    if (!nanoseconds) return null;
    const seconds = (nanoseconds / 1000000000).toFixed(2);
    return `${seconds}s`;
  };

  // 渲染生成统计信息图标
  const renderGenerationStatsIcon = (message: SimpleMessage) => {
    // 检查是否为当前生成中的消息
    const isCurrentlyGenerating = isStreaming && 
      message.role === 'assistant' && 
      messages.indexOf(message) === messages.length - 1;
    
    // 如果有完整的统计数据（至少有总时长或生成token数量），显示详细信息
    const hasCompleteStats = message.total_duration || message.eval_count;
    
    const statsText = hasCompleteStats
       ? `总时长: ${formatDuration(message.total_duration)}\n` +
         `加载时长: ${formatDuration(message.load_duration)}\n` +
         `提示词处理: ${message.prompt_eval_count || 0} tokens\n` +
         `生成内容: ${message.eval_count || 0} tokens\n` +
         `提示词速度: ${message.prompt_eval_duration && message.prompt_eval_count ? (message.prompt_eval_count / (message.prompt_eval_duration / 1000000000)).toFixed(1) : 0} tokens/s\n` +
         `生成速度: ${message.eval_duration && message.eval_count ? (message.eval_count / (message.eval_duration / 1000000000)).toFixed(1) : 0} tokens/s`
       : isCurrentlyGenerating 
         ? '正在生成中，统计信息将在完成后显示...'
         : '统计信息不可用';

    // 获取消息创建时间
    const messageTime = message.timestamp 
      ? new Date(message.timestamp).toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit'
        })
      : new Date().toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit'
        });

    return (
      <div className="flex items-center gap-2">
        <div className="relative inline-block">
          <div className="group inline-block">
            <Info className="w-4 h-4 text-theme-foreground-muted hover:text-theme-foreground cursor-help transition-colors" />
            <div className="absolute left-0 bottom-full mb-1 bg-gray-800 text-white text-xs rounded px-3 py-2 whitespace-pre-line opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 min-w-max shadow-lg pointer-events-none">
              {statsText}
            </div>
          </div>
        </div>
        {/* 消息时间显示在图标右侧 */}
        <span className="text-xs text-theme-foreground-muted">
          {messageTime}
        </span>
      </div>
    );
  };

  return (
    <div 
      ref={scrollContainerRef}
      className="relative h-full overflow-y-auto scrollbar-thin"
    >
      <div 
        className={`min-h-full ${currentDisplaySize === 'compact' ? 'p-2 space-y-2' : 'p-4 space-y-4'}`}
      >
        {messages.map((message, index) => {
          // 如果是工具调用占位符消息，渲染工具调用组件
          if (message.role === 'tool_call' && message.toolCall) {
            return (
              <ToolCallMessage key={message.id} toolCall={message.toolCall} />
            );
          }
          
          // 检查消息是否包含思考内容
          const hasThinking = message.role === 'assistant' && hasThinkingContent(message.content);
          const contentWithoutThinking = hasThinking ? removeThinkingContent(message.content) : message.content;
          const isCurrentlyThinking = isStreaming && message.role === 'assistant' && index === messages.length - 1 && hasThinkingContent(message.content) && !removeThinkingContent(message.content).trim();
          
          // 对于 assistant 消息，如果只有思考内容而没有实际内容，且不是正在生成状态，则不显示消息气泡
          const isLastMessage = index === messages.length - 1;
          const isGenerating = isStreaming && message.role === 'assistant' && isLastMessage;
          const hasActualContent = contentWithoutThinking.trim().length > 0;
          const shouldShowBubble = message.role === 'user' || hasActualContent || (isGenerating && !isCurrentlyThinking);
          
          // 获取模型显示信息
          const modelDisplayInfo = getModelDisplayInfo(message.model || selectedModel);
          
          // 根据聊天样式决定布局
          if (currentChatStyle === 'conversation') {
            // 对话模式：用户右侧，AI左侧
            const isUser = message.role === 'user';
            return (
              <div key={message.id} className={`flex ${currentDisplaySize === 'compact' ? 'gap-2' : 'gap-3'} ${isUser ? 'flex-row-reverse' : ''}`}>
                <div className={`${currentDisplaySize === 'compact' ? 'w-8 h-8' : 'w-10 h-10'} rounded-full flex items-center justify-center flex-shrink-0 ${
                  isUser 
                    ? 'bg-theme-primary text-white' 
                    : 'bg-theme-card border border-theme-border text-theme-foreground'
                }`}>
                  {isUser ? (
                    <User className={currentDisplaySize === 'compact' ? 'w-4 h-4' : 'w-5 h-5'} />
                  ) : (
                    selectedAgent ? (
                      <AgentAvatar 
                        agent={selectedAgent}
                        size={currentDisplaySize === 'compact' ? 'md' : 'lg'}
                      />
                    ) : (
                      <ModelLogo 
                        modelName={modelDisplayInfo.family}
                        size={currentDisplaySize === 'compact' ? 'md' : 'lg'}
                        containerSize={currentDisplaySize === 'compact' ? 32 : 40}
                        imageSize={currentDisplaySize === 'compact' ? 24 : 32}
                        className="bg-transparent border-0 rounded-full"
                      />
                    )
                  )}
                </div>
                <div className={`max-w-[80%] ${currentDisplaySize === 'compact' ? 'space-y-1' : 'space-y-2'} ${isUser ? 'flex flex-col items-end' : ''}`}>
                  {/* 只有在需要显示消息气泡或者有思考内容时才显示角色标识 */}
                  {(shouldShowBubble || hasThinking || isCurrentlyThinking) && (
                    <div className={`flex items-center gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`text-sm text-theme-foreground-muted ${isUser ? 'text-right' : 'text-left'}`}>
                        {isUser ? '你' : (selectedAgent ? selectedAgent.name : modelDisplayInfo.displayName)}
                      </div>
                      {/* AI消息的统计信息 */}
                      {!isUser && message.role === 'assistant' && renderGenerationStatsIcon(message)}
                    </div>
                  )}
                  
                  {/* 思考面板 - 只对AI消息显示 */}
                  {message.role === 'assistant' && (hasThinking || isCurrentlyThinking) && (
                    <ThinkingMode
                      content={message.content}
                      isExpanded={expandedThinkingMessages.has(message.id)}
                      onToggleExpand={() => onToggleThinkingExpand(message.id)}
                      defaultHidden={true}
                    />
                  )}
                  
                  {/* 消息气泡 - 只有在应该显示时才渲染 */}
                  {shouldShowBubble && (
                    <div className={`inline-block ${currentDisplaySize === 'compact' ? 'p-2' : 'p-3'} rounded-lg ${
                      isUser 
                        ? 'bg-theme-primary text-white' 
                        : 'text-theme-foreground'
                    }`}>
                      {isGenerating && !isCurrentlyThinking && !contentWithoutThinking ? (
                        <div className="flex items-center gap-2">
                          <div className="spinner-small">
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                          </div>
                          <span className="text-sm text-theme-foreground-muted">loading...</span>
                        </div>
                      ) : (
                        <StreamedContent
                          content={contentWithoutThinking || ''}
                          isStreaming={isGenerating}
                          enableMarkdown={!isUser} // 重新启用：只对AI助手的消息启用markdown渲染
                          className={!isUser ? "break-words leading-[1.4]" : "break-words whitespace-pre-wrap leading-[1.4]"}
                          style={{
                            minWidth: 0,
                            maxWidth: '100%',
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          } else {
            // 助手模式：所有消息都在左侧
            return (
              <div key={message.id} className={`flex ${currentDisplaySize === 'compact' ? 'gap-2' : 'gap-3'}`}>
                <div className={`${currentDisplaySize === 'compact' ? 'w-8 h-8' : 'w-10 h-10'} rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user' 
                    ? 'bg-theme-primary text-white' 
                    : 'bg-theme-card border border-theme-border text-theme-foreground'
                }`}>
                  {message.role === 'user' ? (
                    <User className={currentDisplaySize === 'compact' ? 'w-4 h-4' : 'w-5 h-5'} />
                  ) : (
                    selectedAgent ? (
                      <AgentAvatar 
                        agent={selectedAgent}
                        size={currentDisplaySize === 'compact' ? 'md' : 'lg'}
                      />
                    ) : (
                      <ModelLogo 
                        modelName={modelDisplayInfo.family}
                        size={currentDisplaySize === 'compact' ? 'md' : 'lg'}
                        containerSize={currentDisplaySize === 'compact' ? 32 : 40}
                        imageSize={currentDisplaySize === 'compact' ? 24 : 32}
                        className="bg-transparent border-0 rounded-full"
                      />
                    )
                  )}
                </div>
                <div className={`flex-1 max-w-[80%] ${currentDisplaySize === 'compact' ? 'space-y-1' : 'space-y-2'}`}>
                  {/* 只有在需要显示消息气泡或者有思考内容时才显示角色标识 */}
                  {(shouldShowBubble || hasThinking || isCurrentlyThinking) && (
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-theme-foreground-muted">
                        {message.role === 'user' ? '你' : (selectedAgent ? selectedAgent.name : modelDisplayInfo.displayName)}
                      </div>
                      {/* AI消息的统计信息 */}
                      {message.role === 'assistant' && renderGenerationStatsIcon(message)}
                    </div>
                  )}
                  
                  {/* 思考面板 - 只对AI消息显示 */}
                  {message.role === 'assistant' && (hasThinking || isCurrentlyThinking) && (
                    <ThinkingMode
                      content={message.content}
                      isExpanded={expandedThinkingMessages.has(message.id)}
                      onToggleExpand={() => onToggleThinkingExpand(message.id)}
                      defaultHidden={true}
                    />
                  )}
                  
                  {/* 正常内容显示 - 只有在应该显示时才渲染 */}
                  {shouldShowBubble && (
                    <div className="prose prose-sm max-w-none text-theme-foreground">
                      {isGenerating && !isCurrentlyThinking && !contentWithoutThinking ? (
                        <div className="flex items-center gap-2">
                          <div className="spinner-small">
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                          </div>
                          <span className="text-sm text-theme-foreground-muted">loading...</span>
                        </div>
                      ) : (
                        <StreamedContent
                          content={contentWithoutThinking || ''}
                          isStreaming={isGenerating}
                          enableMarkdown={message.role === 'assistant'} // 重新启用：只对AI助手的消息启用markdown渲染
                          className={message.role === 'assistant' ? "break-words leading-[1.4]" : "break-words whitespace-pre-wrap leading-[1.4]"}
                          style={{
                            minWidth: 0,
                            maxWidth: '100%'
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          }
        })}
      </div>

      {/* 浮动按钮组 - 垂直布局，固定在可视区域 */}
       {showScrollButtons && (
         <div className="group fixed bottom-40 right-12 z-50 flex flex-col gap-1 p-2">
          {/* 悬浮触发区域 - 透明但可交互 */}
          <div className="absolute inset-0 w-16 h-full -right-2"></div>
          
          {/* 按钮容器 - 默认隐藏，hover时显示 */}
          <div className="flex flex-col gap-1 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-out">
            {/* 回到顶部按钮 */}
            {!isNearTop && (
              <button
                onClick={() => scrollToTop('smooth')}
                className="w-10 h-10 bg-theme-background/80 hover:bg-theme-background hover:border-theme-border rounded-full transition-all duration-200 flex items-center justify-center hover:scale-110 backdrop-blur-sm"
                title="回到顶部"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            )}
          
            {/* 调试信息按钮 */}
            <button
              onClick={() => {
                const { nearBottom, nearTop } = updateScrollPosition();
                console.log('当前状态:', { isNearTop, isNearBottom, nearTop, nearBottom, showScrollButtons });
              }}
              className="w-10 h-10 bg-theme-background/80 hover:bg-theme-background hover:border-theme-border rounded-full transition-all duration-200 flex items-center justify-center hover:scale-110 backdrop-blur-sm"
              title="调试信息"
            >
              <Clock className="w-4 h-4" />
            </button>
          
            {/* 回到底部按钮 */}
            {!isNearBottom && (
              <button
                onClick={() => scrollToBottom('smooth')}
                className="w-10 h-10 bg-theme-background/80 hover:bg-theme-background hover:border-theme-border rounded-full transition-all duration-200 flex items-center justify-center hover:scale-110 backdrop-blur-sm"
                title="回到底部"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}