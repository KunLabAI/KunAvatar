'use client';

import React, { useState } from 'react';
import { User, Copy, Axe, ChevronDown, ChevronUp, Check, Trash2 } from 'lucide-react';
import { ToolCallPanel } from './tools/ToolCallPanel';
import { useAgentData } from '../hooks/useAgentData';
import ModelLogo from '@/app/model-manager/components/ModelLogo';
import { AgentAvatar } from './ui/AgentAvatar';
import StreamedContent from './ui/StreamedContent';
import { ThinkingMode, hasThinkingContent } from './ui/ThinkingMode';
import { useAutoScroll } from '../hooks/useAutoScroll';
import { useChatStyle } from '../hooks/useChatStyle';
import { StatsDisplay } from './ui/StatsDisplay';
// 消息类型定义
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  model?: string;
  toolCalls?: any[];
  thinking?: string;
  images?: string[]; // 新增：图片数据数组
  // 工具调用相关字段
  tool_name?: string;
  tool_args?: string;
  tool_result?: string;
  tool_status?: 'executing' | 'completed' | 'error';
  tool_execution_time?: number;
  tool_error?: string;
  // Ollama统计信息字段
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

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

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  error?: string | null;
  isLoadingHistory?: boolean;
  chatMode: 'model' | 'agent';
  selectedAgent: Agent | null;
  models: any[]; // 添加models参数
  conversation?: any | null; // 新增：对话信息
  onDeleteMessage?: (messageId: string) => void; // 添加删除消息回调
  onImagePreview?: (imageUrl: string, imageIndex: number, images: string[]) => void; // 新增：图片预览回调
}

export function MessageList({ 
  messages, 
  isStreaming, 
  error, 
  isLoadingHistory,
  chatMode,
  selectedAgent,
  models,
  conversation, // 新增：对话信息
  onDeleteMessage,
  onImagePreview // 新增：图片预览回调
}: MessageListProps) {
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [showToolCallPanel, setShowToolCallPanel] = useState(false);
  
  // 获取智能体信息（仅用于其他用途，不再用于状态管理）
  const { agents } = useAgentData();

  // 使用自动滚动hook替换简单的滚动逻辑
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

  // 使用样式控制hook
  const { chatStyle, displaySize, isLoaded: styleLoaded } = useChatStyle();

  // 消息已经在useMessageSender中处理过了，直接使用
  const processedMessages = messages;

  // 处理MCP图标点击
  const handleMcpIconClick = (messageId: string) => {
    setSelectedMessageId(messageId);
    setShowToolCallPanel(true);
  };

  // 关闭工具调用面板
  const handleCloseToolCallPanel = () => {
    setShowToolCallPanel(false);
    setSelectedMessageId(null);
  };

  // 获取选中消息的工具调用信息
  const selectedMessage = selectedMessageId ? processedMessages.find(m => m.id === selectedMessageId) : null;

  return (
    <>
      <div ref={scrollContainerRef} className="relative h-full overflow-y-auto scrollbar-thin">
        <div className={`min-h-full ${displaySize === 'compact' ? 'p-2 space-y-2' : 'p-4 space-y-4'}`}>
          {/* 消息列表 */}
          {processedMessages.map((message) => (
            <MessageItem
                key={message.id}
                message={message}
                isStreaming={isStreaming && message.role === 'assistant' && message === processedMessages[processedMessages.length - 1]}
                onMcpIconClick={handleMcpIconClick}
                onDeleteMessage={onDeleteMessage}
                chatMode={chatMode}
                selectedAgent={selectedAgent}
                models={models}
                conversation={conversation} // 新增：传递对话信息
                chatStyle={chatStyle}
                displaySize={displaySize}
                onImagePreview={onImagePreview}
              />
          ))}
          
          {/* 滚动目标元素 */}
          <div ref={messagesEndRef} />
        </div>

        {/* 滚动按钮 */}
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

      {/* 工具调用面板 */}
      {showToolCallPanel && selectedMessage && (
        <ToolCallPanel
          isOpen={showToolCallPanel}
          onClose={handleCloseToolCallPanel}
          message={selectedMessage}
        />
      )}
    </>
  );
}

// 单个消息组件
function MessageItem({ 
  message, 
  isStreaming, 
  onMcpIconClick,
  onDeleteMessage,
  chatMode,
  selectedAgent,
  models,
  conversation, // 新增：对话信息
  chatStyle,
  displaySize,
  onImagePreview
}: { 
  message: Message; 
  isStreaming: boolean;
  onMcpIconClick: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  chatMode: 'model' | 'agent';
  selectedAgent: Agent | null;
  models: any[];
  conversation?: any | null; // 新增：对话信息
  chatStyle: 'conversation' | 'assistant';
  displaySize: 'fullscreen' | 'compact';
  onImagePreview?: (imageUrl: string, imageIndex: number, images: string[]) => void;
}) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  
  // 思考面板状态管理
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);
  const hasThinking = hasThinkingContent(message.content);
  
  // 用户消息折叠状态管理
  const [isUserMessageExpanded, setIsUserMessageExpanded] = useState(false);
  const userMessageLines = message.content.split('\n').length;
  const shouldCollapseUserMessage = isUser && userMessageLines > 6;
  
  // 复制状态管理
  const [isCopied, setIsCopied] = useState(false);
  const [isUserCopied, setIsUserCopied] = useState(false);
  
  // 只有当工具调用有结果时才显示MCP图标（即工具执行完成并返回结果的AI回复）
  const hasToolCallsWithResults = message.toolCalls && message.toolCalls.length > 0 && 
    message.toolCalls.some(toolCall => toolCall.result !== null && toolCall.result !== undefined);

  // 复制消息内容
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // 2秒后恢复
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  // 复制用户消息内容
  const handleUserCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setIsUserCopied(true);
      setTimeout(() => setIsUserCopied(false), 2000); // 2秒后恢复
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  // 获取显示的名称
  const getDisplayName = () => {
    // 根据对话的 agent_id 来决定显示模式，而不是当前页面状态
    const isAgentConversation = conversation?.agent_id != null;
    
    if (isAgentConversation) {
      // 智能体对话：优先使用对话中的智能体信息，如果没有则使用当前选中的智能体
      if (conversation?.agent_name) {
        return conversation.agent_name;
      } else if (selectedAgent) {
        return selectedAgent.name;
      } else {
        return '智能体';
      }
    } else {
      // 普通模型对话：使用消息中的模型信息
      const model = models.find(m => m.base_model === message.model);
      return model?.display_name || message.model || '模型';
    }
  };

  // 渲染头像
  const renderAvatar = () => {
    if (isUser) {
      return (
        <div className="flex-shrink-0 w-8 h-8 bg-theme-accent rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-theme-foreground" />
        </div>
      );
    }

    if (isAssistant) {
      // 根据对话的 agent_id 来决定显示模式，而不是当前页面状态
      const isAgentConversation = conversation?.agent_id != null;
      
      if (isAgentConversation) {
        // 智能体对话：显示智能体头像
        // 优先使用当前选中的智能体，如果没有则使用默认头像
        if (selectedAgent) {
          return (
            <AgentAvatar 
              agent={selectedAgent} 
              size="md" 
              className="flex-shrink-0"
            />
          );
        } else {
          // 如果没有当前智能体信息，显示默认智能体头像
          return (
            <div className="flex-shrink-0 w-8 h-8 bg-theme-primary rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-theme-primary-foreground" />
            </div>
          );
        }
      } else {
        // 普通模型对话：显示模型logo
        const model = models.find(m => m.base_model === message.model);
        const logoName = model?.family || message.model?.split(':')[0] || 'default';
        return (
          <ModelLogo 
            modelName={logoName}
            size="sm" 
            className="flex-shrink-0"
          />
        );
      }
    }

    return null;
  };

  // 获取消息气泡样式
  const getMessageBubbleStyle = () => {
    if (isUser) {
      // 用户消息气泡：彩色背景，圆润设计
      return 'bg-theme-primary text-theme-primary-foreground rounded-2xl px-4 py-3';
    } else {
      // AI模型消息气泡：简洁设计，无背景，只有轻微的视觉分隔
      return 'text-theme-foreground rounded-lg px-1 py-1';
    }
  };

  return (
    <div className={`group ${chatStyle === 'conversation' && isUser ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
      {/* 图片显示层 - 仅在用户消息且有图片时显示，独立于消息气泡和头像 */}
      {isUser && message.images && message.images.length > 0 && (
        <div className={`mb-2 ${chatStyle === 'conversation' ? 'mr-12' : 'ml-12'}`}>
          <div className="bg-theme-background/50 rounded-lg">
            <div className={`grid gap-2 max-w-2xl ${
              message.images.length === 1 
                ? 'grid-cols-1' 
                : message.images.length === 2 
                ? 'grid-cols-2' 
                : message.images.length === 3 
                ? 'grid-cols-3' 
                : 'grid-cols-2'
            }`}>
              {message.images.map((image, index) => {
                // 确保图片有正确的 data URL 前缀
                const imageUrl = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;
                
                return (
                  <div key={index} className="relative group">
                    <img
                      src={imageUrl}
                      alt={`上传的图片 ${index + 1}`}
                      className="w-full h-auto rounded-lg cursor-pointer max-h-48 object-cover"
                      onClick={() => {
                        // 确保传递给预览模态框的所有图片URL都有正确的前缀
                        const processedImages = message.images!.map(img => 
                          img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`
                        );
                        onImagePreview?.(imageUrl, index, processedImages);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 消息气泡和头像层 - 水平排列 */}
      <div className={`flex gap-3 ${chatStyle === 'conversation' && isUser ? 'justify-end' : 'justify-start'}`}>
        {/* 左侧头像（助手消息或助手模式下的所有消息） */}
        {(chatStyle === 'assistant' || !isUser) && renderAvatar()}

        {/* 消息内容区域 */}
        <div className={`max-w-2xl group ${chatStyle === 'conversation' && isUser ? 'order-first' : ''}`}>
        
        {/* 发送者名称 */}
        {(isAssistant || (chatStyle === 'assistant' && isUser)) && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-theme-foreground-muted">
              {isUser ? '你' : getDisplayName()}
            </span>
            {isAssistant && hasToolCallsWithResults && (
              <button
                onClick={() => onMcpIconClick(message.id)}
                className="p-1 text-theme-foreground-muted hover:text-theme-primary hover:bg-theme-primary/10 rounded transition-all duration-200"
                title={`查看工具调用详情 (${message.toolCalls!.length} 个工具)`}
              >
                <Axe className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* 消息气泡 */}
        <div className={`relative group ${getMessageBubbleStyle()}`}>
          {/* 思考面板 - 仅在助手消息且有思考内容时显示，放在消息内容之前 */}
          {isAssistant && hasThinking && (
            <div className="mb-3">
              <ThinkingMode
                content={message.content}
                isExpanded={isThinkingExpanded}
                onToggleExpand={() => setIsThinkingExpanded(!isThinkingExpanded)}
                defaultHidden={false}
              />
            </div>
          )}



          {/* 消息内容 */}
          <div className={isUser ? 'whitespace-pre-wrap' : `prose prose-sm max-w-none prose-theme`} style={isUser ? { wordBreak: 'normal', overflowWrap: 'break-word' } : {}}>
            {message.content ? (
              <div className={shouldCollapseUserMessage && !isUserMessageExpanded ? 'line-clamp-6' : ''}>
                <StreamedContent
                  content={message.content}
                  isStreaming={isStreaming}
                  enableMarkdown={!isUser} // 只有助手消息启用 Markdown，用户消息保持原始格式
                  className={isUser ? 'text-theme-primary-foreground' : 'text-theme-foreground'}
                />
              </div>
            ) : (isStreaming ? (
              <div className="flex items-center space-x-1">
                <div className="animate-pulse">loading</div>
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce"></div>
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            ) : (
              <div className="text-theme-foreground-muted italic">消息内容为空</div>
            ))}
          </div>

          {/* 用户消息展开/折叠按钮 */}
          {shouldCollapseUserMessage && (
            <div className="flex justify-center mt-2">
              <button
                onClick={() => setIsUserMessageExpanded(!isUserMessageExpanded)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-theme-primary-foreground/70 hover:text-theme-primary-foreground transition-colors"
              >
                {isUserMessageExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* 操作区域 - 统一的时间戳和操作按钮 */}
        <div className="flex items-center justify-between mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* 左侧：时间戳和统计信息 */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* 时间戳（只在助手消息显示） */}
            {isAssistant && (
              <div className="text-xs text-theme-foreground-muted opacity-60 flex-shrink-0">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            )}
            
            {/* 统计信息（只在助手消息且有统计数据时显示） */}
            {isAssistant && (
              <StatsDisplay 
                stats={{
                  total_duration: message.total_duration,
                  load_duration: message.load_duration,
                  prompt_eval_count: message.prompt_eval_count,
                  prompt_eval_duration: message.prompt_eval_duration,
                  eval_count: message.eval_count,
                  eval_duration: message.eval_duration,
                }}
                className="opacity-70 overflow-hidden"
              />
            )}
          </div>
          
          {/* 右侧：操作按钮 */}
          <div className="flex items-center space-x-1 flex-shrink-0 ml-4">
            {/* 复制按钮 */}
            {message.content && (
              <button
                onClick={isUser ? handleUserCopy : handleCopy}
                className="p-1 text-theme-foreground-muted hover:text-theme-foreground rounded transition-colors"
                title={isUser ? (isUserCopied ? "已复制" : "复制") : (isCopied ? "已复制" : "复制")}
              >
                {(isUser ? isUserCopied : isCopied) ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            )}
            
            {/* 删除按钮 */}
            {onDeleteMessage && (
              <button
                onClick={() => onDeleteMessage(message.id)}
                className="p-1 text-theme-foreground-muted hover:text-red-500 rounded transition-colors"
                title="删除消息"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

        {/* 右侧头像（对话模式下的用户消息） */}
        {chatStyle === 'conversation' && isUser && renderAvatar()}
      </div>
    </div>
  );
}