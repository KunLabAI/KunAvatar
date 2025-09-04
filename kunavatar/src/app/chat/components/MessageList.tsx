'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { User, Copy, Axe, ChevronDown, ChevronUp, Check, Trash2, Eraser, AlertTriangle } from 'lucide-react';
import { ToolCallPanel } from './tools/ToolCallPanel';
import { useAgentData } from '../hooks/useAgentData';
import ModelLogo from '@/app/model-manager/components/ModelLogo';
import { AgentAvatar } from './ui/AgentAvatar';
import StreamedContent from './ui/StreamedContent';
import { ThinkingMode, hasThinkingContent } from './ui/ThinkingMode';
import { useAutoScroll } from '../hooks/useAutoScroll';
import { useChatStyle } from '../hooks/useChatStyle';
import { StatsDisplay } from './ui/StatsDisplay';
import { SelectableCopyWrapper } from './ui/SelectableCopyWrapper';
import Modal from '@/components/Modal';

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
  // 新增：实时工具调用状态字段
  activeToolCall?: {
    id: string;
    name: string;
    status: 'start' | 'executing' | 'complete';
  };
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
  onClearChat?: () => void; // 新增：清空对话回调
}

// 比较两条消息在渲染相关字段上的等价性（尽量轻量）
const areMessagesRenderEqual = (prev: Message, next: Message): boolean => {
  if (prev === next) return true;
  if (!prev || !next) return false;
  if (prev.id !== next.id) return false;
  if (prev.role !== next.role) return false;
  if (prev.model !== next.model) return false;
  if (prev.content !== next.content) return false;
  if (prev.thinking !== next.thinking) return false;
  if (prev.tool_status !== next.tool_status) return false;
  
  // 比较activeToolCall字段
  if (prev.activeToolCall !== next.activeToolCall) {
    if (!prev.activeToolCall || !next.activeToolCall) return false;
    if (prev.activeToolCall.id !== next.activeToolCall.id) return false;
    if (prev.activeToolCall.name !== next.activeToolCall.name) return false;
    if (prev.activeToolCall.status !== next.activeToolCall.status) return false;
  }
  if (prev.total_duration !== next.total_duration) return false;
  if (prev.load_duration !== next.load_duration) return false;
  if (prev.prompt_eval_count !== next.prompt_eval_count) return false;
  if (prev.prompt_eval_duration !== next.prompt_eval_duration) return false;
  if (prev.eval_count !== next.eval_count) return false;
  if (prev.eval_duration !== next.eval_duration) return false;

  // 仅做引用或长度检查，避免深度比较开销
  if (prev.images !== next.images) {
    const prevLen = Array.isArray(prev.images) ? prev.images.length : 0;
    const nextLen = Array.isArray(next.images) ? next.images.length : 0;
    if (prevLen !== nextLen) return false;
  }

  if (prev.toolCalls !== next.toolCalls) {
    const prevLen = Array.isArray(prev.toolCalls) ? prev.toolCalls.length : 0;
    const nextLen = Array.isArray(next.toolCalls) ? next.toolCalls.length : 0;
    if (prevLen !== nextLen) return false;
  }

  return true;
};

// 复用未变化的消息对象，稳定子项 props 引用，避免不必要重渲染
const useStableMessages = (messages: Message[]): Message[] => {
  const prevByIdRef = React.useRef<Map<string, Message>>(new Map());

  const stable = useMemo(() => {
    const prevById = prevByIdRef.current;
    const nextById = new Map<string, Message>();

    const result = messages.map((msg) => {
      const prev = prevById.get(msg.id);
      const nextMsg = prev && areMessagesRenderEqual(prev, msg) ? prev : msg;
      nextById.set(msg.id, nextMsg);
      return nextMsg;
    });

    prevByIdRef.current = nextById;
    return result;
  }, [messages]);

  return stable;
};

const MessageListComponent = ({ 
  messages, 
  isStreaming, 
  error, 
  isLoadingHistory,
  chatMode,
  selectedAgent,
  models,
  conversation, // 新增：对话信息
  onDeleteMessage,
  onImagePreview, // 新增：图片预览回调
  onClearChat // 新增：清空对话回调
}: MessageListProps) => {
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [showToolCallPanel, setShowToolCallPanel] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  
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

  // 复用未变化的消息，隔离已渲染内容，避免全量子项重渲染
  const processedMessages = useStableMessages(messages);

  // 处理MCP图标点击
  const handleMcpIconClick = useCallback((messageId: string) => {
    setSelectedMessageId(messageId);
    setShowToolCallPanel(true);
  }, []);

  // 关闭工具调用面板
  const handleCloseToolCallPanel = useCallback(() => {
    setShowToolCallPanel(false);
    setSelectedMessageId(null);
  }, []);

  // 处理清空对话点击
  const handleClearClick = useCallback(() => {
    setShowClearConfirmModal(true);
  }, []);

  // 确认清空对话
  const handleConfirmClear = useCallback(() => {
    setShowClearConfirmModal(false);
    onClearChat?.();
  }, [onClearChat]);

  // 取消清空
  const handleCancelClear = useCallback(() => {
    setShowClearConfirmModal(false);
  }, []);

  // 稳定删除回调，避免因函数引用变化导致子项重渲染
  const stableOnDeleteMessage = useCallback((id: string) => {
    onDeleteMessage?.(id);
  }, [onDeleteMessage]);

  // 获取选中消息的工具调用信息
  const selectedMessage = selectedMessageId ? processedMessages.find(m => m.id === selectedMessageId) : null;

  return (
    <>
      <div ref={scrollContainerRef} className="relative h-full">
        <div className={`min-h-full ${displaySize === 'compact' ? 'p-2 space-y-2' : 'space-y-4'}`}>
          {/* 消息列表 */}
          {processedMessages.map((message) => (
            <MessageItem
                key={(message as any).clientId || message.id}
                message={message}
                isStreaming={isStreaming && message.role === 'assistant' && message === processedMessages[processedMessages.length - 1]}
                onMcpIconClick={handleMcpIconClick}
                onDeleteMessage={stableOnDeleteMessage}
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
              
              {/* 清空对话按钮 */}
              {onClearChat && (
                <button
                  onClick={handleClearClick}
                  className="w-10 h-10 bg-red-500/80 hover:bg-red-500 hover:border-red-400 rounded-full transition-all duration-200 flex items-center justify-center hover:scale-110 backdrop-blur-sm text-white"
                  title="清空当前对话"
                >
                  <Eraser className="w-4 h-4" />
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

      {/* 确认清空对话的Modal */}
      <Modal
        open={showClearConfirmModal}
        onClose={handleCancelClear}
        title="确认清空对话"
        icon={<AlertTriangle className="text-yellow-500" />}
        actions={[
          {
            label: '取消',
            onClick: handleCancelClear,
            variant: 'secondary',
          },
          {
            label: '确认清空',
            onClick: handleConfirmClear,
            variant: 'danger',
            autoFocus: true,
          },
        ]}
      >
        确定要清空当前对话吗？此操作将删除所有聊天记录，且无法撤销。
      </Modal>
    </>
  );
};

// 使用 React.memo 优化性能
export const MessageList = React.memo(MessageListComponent);

// 单个消息组件
const MessageItemComponent = ({ 
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
}) => {
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

  // 检查是否有活跃的工具调用
  const hasActiveToolCall = message.activeToolCall && 
    (message.activeToolCall.status === 'start' || message.activeToolCall.status === 'executing');



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
              hasActiveToolCall={isAssistant && hasActiveToolCall}
            />
          );
        } else {
          // 如果没有当前智能体信息，显示默认智能体头像
          return (
            <div className={`relative w-8 h-8 bg-theme-primary rounded-full flex items-center justify-center flex-shrink-0`}>
              <User className="w-4 h-4 text-theme-primary-foreground" />
              {/* 工具调用动画覆盖在头像上 */}
              {isAssistant && hasActiveToolCall && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    className="w-full h-full animate-spin"
                    viewBox="0 0 32 32"
                    fill="none"
                    style={{ position: 'absolute', top: 0, left: 0 }}
                  >
                    <circle
                      cx="16"
                      cy="16"
                      r="14"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray="87.96"
                      strokeDashoffset="21.99"
                      className="text-theme-primary opacity-80"
                    />
                  </svg>
                  <div className="w-1.5 h-1.5 bg-theme-primary rounded-full animate-pulse" />
                </div>
              )}
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
            hasActiveToolCall={isAssistant && hasActiveToolCall}
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
      {/* 图片显示层 - 用户消息和AI助手消息都支持图片显示 */}
      {message.images && message.images.length > 0 && (
        <div className={`mb-2 ${
          isUser 
            ? (chatStyle === 'conversation' ? 'mr-12' : 'ml-12')
            : 'ml-12' // AI助手消息的图片始终在左侧对齐
        }`}>
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
                // 智能处理不同格式的图片URL
                const imageUrl = (() => {
                  if (!image || typeof image !== 'string') {
                    console.error('无效的图片数据:', image);
                    return '';
                  }
                  
                  if (image.startsWith('data:')) {
                    // 已经是data URL格式
                    return image;
                  } else if (image.startsWith('http://') || image.startsWith('https://')) {
                    // HTTP URL格式，直接使用
                    return image;
                  } else {
                    // 假设是base64编码，验证并添加data URL前缀
                    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(image)) {
                      console.error('无效的base64格式:', image.substring(0, 100));
                      return '';
                    }
                    return `data:image/png;jpeg;base64,${image}`;
                  }
                })();
                
                // 只有当图片URL有效时才渲染
                if (!imageUrl) {
                  return null;
                }
                
                return (
                  <div key={index} className="relative group">
                    <img
                      src={imageUrl}
                      alt={isUser ? `上传的图片 ${index + 1}` : `AI回复的图片 ${index + 1}`}
                      className={`w-full h-auto rounded-lg cursor-pointer object-cover ${
                        isUser ? 'max-h-56' : 'max-h-24'
                      }`}
                      onError={(e) => {
                        console.error('图片加载失败:', imageUrl);
                        e.currentTarget.style.display = 'none';
                      }}
                      onClick={() => {
                        // 智能处理传递给预览模态框的图片URL
                        const processedImages = message.images!.map(img => {
                          if (!img || typeof img !== 'string') {
                            return '';
                          }
                          if (img.startsWith('data:')) {
                            return img;
                          } else if (img.startsWith('http://') || img.startsWith('https://')) {
                            return img;
                          } else {
                            // 验证base64格式
                            if (!/^[A-Za-z0-9+/]*={0,2}$/.test(img)) {
                              console.error('预览时发现无效的base64格式:', img.substring(0, 100));
                              return '';
                            }
                            return `data:image/jpeg;base64,${img}`;
                          }
                        }).filter(url => url !== ''); // 过滤掉空的URL
                        
                        if (imageUrl && processedImages.length > 0) {
                          onImagePreview?.(imageUrl, index, processedImages);
                        }
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
          <SelectableCopyWrapper>
            <div className={isUser ? 'whitespace-pre-wrap' : `prose prose-sm max-w-none prose-theme`} style={isUser ? { wordBreak: 'normal', overflowWrap: 'break-word' } : {}}>
              {message.content ? (
                <div className={shouldCollapseUserMessage && !isUserMessageExpanded ? 'line-clamp-6' : ''}>
                  <StreamedContent
                    content={message.content}
                    isStreaming={isStreaming}
                    // 流式期间启用轻量Markdown，结束后启用完整Markdown
                    enableMarkdown={!isUser}
                    className={isUser ? 'text-theme-primary-foreground' : 'text-theme-foreground'}
                    onImagePreview={onImagePreview}
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
          </SelectableCopyWrapper>

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
};

// 使用 React.memo 优化 MessageItem 性能
const MessageItem = React.memo(MessageItemComponent);