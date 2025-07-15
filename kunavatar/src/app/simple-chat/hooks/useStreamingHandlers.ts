'use client';

import { useCallback, useRef } from 'react';
import { Conversation } from '@/lib/database/types';

interface StreamingHandlersConfig {
  setMessages: Function;
  setActiveTool: Function;
  setToolCalls: Function;
  setCurrentAssistantMessageId: Function;
  setIsStreaming: Function;
  setError: Function;
  loadConversations: Function;
  updateConversationTitle: Function;
  updateMessagesFromDatabase: Function;
  currentConversation: Conversation | null;
  selectedModel: string;
  cleanupHandlersRef: React.MutableRefObject<Array<() => void>>;
}

interface StreamingHandlers {
  onMessageUpdate: (messageId: string, content: string, stats?: any) => void;
  onToolCallStart: (toolCall: any) => void;
  onToolCallComplete: (toolCallId: string, toolName: string, result: string, executionTime?: number) => void;
  onToolCallError: (toolCallId: string, toolName: string, error: string, executionTime?: number) => void;
  onNewAssistantMessage: (messageId: string) => void;
  onTitleUpdate: (conversationId: string, title: string) => void;
  onStreamEnd: () => void;
  onError: (error: string) => void;
}

export function useStreamingHandlers(config: StreamingHandlersConfig) {
  const {
    setMessages,
    setActiveTool,
    setToolCalls,
    setCurrentAssistantMessageId,
    setIsStreaming,
    setError,
    loadConversations,
    updateConversationTitle,
    updateMessagesFromDatabase,
    currentConversation,
    selectedModel,
    cleanupHandlersRef,
  } = config;

  // 使用ref来获取最新的值，避免在useCallback依赖中包含过多状态
  const setMessagesRef = useRef(setMessages);
  const setActiveToolRef = useRef(setActiveTool);
  const setToolCallsRef = useRef(setToolCalls);
  const setCurrentAssistantMessageIdRef = useRef(setCurrentAssistantMessageId);
  const setIsStreamingRef = useRef(setIsStreaming);
  const setErrorRef = useRef(setError);
  const loadConversationsRef = useRef(loadConversations);
  const selectedModelRef = useRef(selectedModel);

  // 更新refs
  setMessagesRef.current = setMessages;
  setActiveToolRef.current = setActiveTool;
  setToolCallsRef.current = setToolCalls;
  setCurrentAssistantMessageIdRef.current = setCurrentAssistantMessageId;
  setIsStreamingRef.current = setIsStreaming;
  setErrorRef.current = setError;
  loadConversationsRef.current = loadConversations;
  selectedModelRef.current = selectedModel;

  // 创建流处理器句柄
  const createStreamHandlers = useCallback((): StreamingHandlers => {
    const handlers = {
      onMessageUpdate: (messageId: string, content: string, stats?: any) => {
        setMessagesRef.current((prev: any[]) => 
          prev.map((msg: any) => 
            msg.id === messageId 
              ? { ...msg, content, ...(stats || {}) }
              : msg
          )
        );
      },
      onToolCallStart: (toolCall: any) => {
        setActiveToolRef.current(toolCall);
        setToolCallsRef.current((prev: any[]) => [...prev, toolCall]);
        
        const toolCallMessage = {
          id: `tool-runtime-${toolCall.id}`,
          role: 'tool_call' as const,
          content: '',
          timestamp: Date.now(),
          toolCall: toolCall,
        };
        setMessagesRef.current((prev: any[]) => [...prev, toolCallMessage]);
      },
      onToolCallComplete: (toolCallId: string, toolName: string, result: string, executionTime?: number) => {
        setActiveToolRef.current(null);
        
        setToolCallsRef.current((prev: any[]) => 
          prev.map((tc: any) => {
            const isMatch = toolCallId 
              ? tc.id === toolCallId
              : tc.toolName === toolName && tc.status === 'executing';
            
            return isMatch
              ? { 
                  ...tc, 
                  status: 'completed' as const,
                  result: typeof result === 'string' ? result : JSON.stringify(result),
                  executionTime: executionTime || (Date.now() - tc.startTime)
                }
              : tc;
          })
        );
        
        setMessagesRef.current((prev: any[]) => 
          prev.map((msg: any) => {
            if (msg.role === 'tool_call' && msg.toolCall) {
              const isMatch = toolCallId 
                ? msg.toolCall.id === toolCallId
                : msg.toolCall.toolName === toolName && msg.toolCall.status === 'executing';
              
              if (isMatch) {
                return {
                  ...msg,
                  toolCall: {
                    id: msg.toolCall.id,
                    toolName: msg.toolCall.toolName,
                    args: msg.toolCall.args,
                    status: 'completed' as const,
                    result: typeof result === 'string' ? result : JSON.stringify(result),
                    startTime: msg.toolCall.startTime,
                    executionTime: executionTime || (Date.now() - msg.toolCall.startTime)
                  }
                };
              }
            }
            return msg;
          })
        );
      },
      onToolCallError: (toolCallId: string, toolName: string, error: string, executionTime?: number) => {
        setActiveToolRef.current(null);
        
        setToolCallsRef.current((prev: any[]) => 
          prev.map((tc: any) => {
            const isMatch = toolCallId 
              ? tc.id === toolCallId
              : tc.toolName === toolName && tc.status === 'executing';
            
            return isMatch
              ? { 
                  ...tc, 
                  status: 'error' as const,
                  error: error || '工具调用失败',
                  executionTime: executionTime || (Date.now() - tc.startTime)
                }
              : tc;
          })
        );
        
        setMessagesRef.current((prev: any[]) => 
          prev.map((msg: any) => {
            if (msg.role === 'tool_call' && msg.toolCall) {
              const isMatch = toolCallId 
                ? msg.toolCall.id === toolCallId
                : msg.toolCall.toolName === toolName && msg.toolCall.status === 'executing';
              
              if (isMatch) {
                return {
                  ...msg,
                  toolCall: {
                    id: msg.toolCall.id,
                    toolName: msg.toolCall.toolName,
                    args: msg.toolCall.args,
                    status: 'error' as const,
                    error: error || '工具调用失败',
                    startTime: msg.toolCall.startTime,
                    executionTime: executionTime || (Date.now() - msg.toolCall.startTime)
                  }
                };
              }
            }
            return msg;
          })
        );
      },
      onNewAssistantMessage: (messageId: string) => {
        const newAssistantMessage = {
          id: messageId,
          role: 'assistant' as const,
          content: '',
          timestamp: Date.now(),
          model: selectedModelRef.current,
        };
        
        setMessagesRef.current((prev: any[]) => [...prev, newAssistantMessage]);
        setCurrentAssistantMessageIdRef.current(messageId);
      },
      onTitleUpdate: (conversationId: string, title: string) => {
        console.log('📝 处理标题更新事件:', conversationId, title);
        // 调用updateConversationTitle更新前端状态
        updateConversationTitle(conversationId, title);
      },
      onStreamEnd: () => {
        setIsStreamingRef.current(false);
        setActiveToolRef.current(null);
        setCurrentAssistantMessageIdRef.current(null);
        
        // 优化：更智能的统计信息获取策略，减少API调用
        const cleanup = () => {
          if (currentConversation) {
            console.log('🔧 对话完成，准备获取统计信息');
            
            // 使用单次调用获取统计信息，如果没有则等待后重试一次
            const fetchStats = async (retryOnce = true) => {
              try {
                const token = localStorage.getItem('accessToken');
                const response = await fetch(`/api/conversations/${currentConversation.id}`, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                  },
                });
                const data = await response.json();
                
                if (data.success && data.messages) {
                  const hasStats = data.messages.some((msg: any) => 
                    msg.role === 'assistant' && (msg.total_duration || msg.eval_count)
                  );
                  
                  if (hasStats) {
                    console.log('✅ 获取到统计信息，更新消息');
                    updateMessagesFromDatabase(data.messages, setMessagesRef.current, setToolCallsRef.current);
                  } else if (retryOnce) {
                    console.log('⏳ 统计信息未就绪，1秒后重试一次');
                    setTimeout(() => fetchStats(false), 1000);
                  } else {
                    console.log('⚠️ 统计信息仍未就绪，使用当前消息');
                    updateMessagesFromDatabase(data.messages, setMessagesRef.current, setToolCallsRef.current);
                  }
                } else {
                  console.log('❌ 获取消息数据失败');
                }
              } catch (err) {
                console.error('获取统计信息失败:', err);
              }
            };
            
            // 延迟300ms后开始获取，给服务器时间保存统计信息
            setTimeout(() => fetchStats(), 300);
          } else {
            console.log('🔄 无当前对话，刷新对话列表');
            loadConversationsRef.current();
          }
        };
        
        // 添加到清理队列
        cleanupHandlersRef.current.push(cleanup);
        cleanup();
        
        // 从清理队列中移除
        setTimeout(() => {
          const index = cleanupHandlersRef.current.indexOf(cleanup);
          if (index > -1) {
            cleanupHandlersRef.current.splice(index, 1);
          }
        }, 3000);
      },
      onError: (errorMessage: string) => {
        setErrorRef.current(errorMessage);
        setIsStreamingRef.current(false);
      },
    };
    return handlers;
  }, [updateMessagesFromDatabase, currentConversation, updateConversationTitle, cleanupHandlersRef]);

  return {
    createStreamHandlers,
  };
}