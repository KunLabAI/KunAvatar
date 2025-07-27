import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { usePromptOptimizeSettings } from '../../settings/hooks/usePromptOptimizeSettings';
import { authenticatedFetch, useAuthErrorHandler } from '../../../lib/utils/auth-utils';

// 消息类型定义
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  model?: string;
  toolCalls?: any[];
  thinking?: string;
}

interface UseMessageSenderReturn {
  messages: Message[];
  isStreaming: boolean;
  error: string | null;
  isLoadingHistory: boolean;
  sendMessage: (message: string, conversationId: string) => Promise<void>;
  clearMessages: () => void;
  stopGeneration: () => void;
  loadConversationHistory: (conversationId: string) => Promise<{ conversation?: any; lastModel?: string } | null>;
  removeMessage: (messageId: string) => void; // 新增：删除消息方法
  onTitleUpdate?: (conversationId: string, title: string) => void;
}

interface SendMessageParams {
  chatMode: 'model' | 'agent';
  selectedModel: string;
  selectedAgent: { id: number; name: string; model?: { base_model: string } } | null;
  enableTools?: boolean;
  selectedTools?: string[];
  onTitleUpdate?: (conversationId: string, title: string) => void;
  onConversationCleared?: () => void; // 新增：当对话被清除时的回调
}

export function useMessageSender(params: SendMessageParams): UseMessageSenderReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const currentConversationIdRef = useRef<string | null>(null);

  const { chatMode, selectedModel, selectedAgent, enableTools = true, selectedTools = [], onTitleUpdate, onConversationCleared } = params;
  
  // 获取提示词优化设置（包含标题总结设置）
  const { settings: promptOptimizeSettings } = usePromptOptimizeSettings();
  
  // 认证错误处理
  const { handleAuthError } = useAuthErrorHandler();
    
  // 稳定化 selectedTools
  const stableSelectedTools = useMemo(() => selectedTools, [selectedTools]);
  const stableEnableTools = Boolean(enableTools);

  // 同步 messages 到 ref
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // 生成消息ID
  const generateMessageId = useCallback(() => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // 🔄 加载对话历史消息
  const loadConversationHistory = useCallback(async (conversationId: string) => {
    if (!conversationId || currentConversationIdRef.current === conversationId) {
      return null; // 已经加载过了，不重复加载
    }

    try {
      setIsLoadingHistory(true);
      setError(null);
      
      const response = await authenticatedFetch(`/api/conversations/${conversationId}`);

      if (!response.ok) {
        // 检查是否是认证错误
        if (response.status === 401) {
          handleAuthError();
          return null;
        }
        
        const errorText = await response.text();
        if (errorText.includes('访问令牌')) {
          handleAuthError();
          return null;
        }
        
        throw new Error(`加载对话历史失败: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        if (data.messages && data.messages.length > 0) {
          console.log('原始消息数据:', data.messages);
          
          // 过滤和转换消息
          const regularMessages = data.messages.filter((msg: any) => 
            msg.role !== 'tool' && msg.role !== 'tool_call'
          );
          
          const toolMessages = data.messages.filter((msg: any) => 
            msg.role === 'tool' || msg.role === 'tool_call'
          );
          
          console.log('普通消息数量:', regularMessages.length);
          console.log('工具消息数量:', toolMessages.length);
          
          // 转换数据库消息格式为前端消息格式
          const historyMessages: Message[] = [];
          
          for (let i = 0; i < regularMessages.length; i++) {
            const msg = regularMessages[i];
            
            // 如果是assistant消息且内容为空，可能是工具调用消息
            if (msg.role === 'assistant' && !msg.content) {
              // 查找该assistant消息之后的工具消息
              const relatedToolMessages = toolMessages.filter((toolMsg: any) => {
                const msgTime = msg.timestamp || new Date(msg.created_at).getTime();
                const toolTime = toolMsg.timestamp || new Date(toolMsg.created_at).getTime();
                return toolTime > msgTime && (toolTime - msgTime) < 60000; // 1分钟内
              });
              
              if (relatedToolMessages.length > 0) {
                console.log(`为assistant消息 ${msg.id} 关联了 ${relatedToolMessages.length} 个工具调用`);
                
                const toolCalls = relatedToolMessages.map((toolMsg: any) => ({
                  id: toolMsg.id?.toString(),
                  name: toolMsg.tool_name,
                  function: {
                    name: toolMsg.tool_name,
                    arguments: toolMsg.tool_args ? JSON.parse(toolMsg.tool_args) : {}
                  },
                  args: toolMsg.tool_args ? JSON.parse(toolMsg.tool_args) : {},
                  result: toolMsg.tool_result ? JSON.parse(toolMsg.tool_result) : null,
                  status: toolMsg.tool_status || 'completed',
                  startTime: toolMsg.timestamp || new Date(toolMsg.created_at).getTime(),
                  executionTime: toolMsg.tool_execution_time
                }));
                
                // 查找工具调用之后的assistant消息（包含结果总结）
                const nextAssistantMsg = regularMessages[i + 1];
                if (nextAssistantMsg && nextAssistantMsg.role === 'assistant' && nextAssistantMsg.content) {
                  console.log(`合并工具调用消息和结果消息: ${msg.id} + ${nextAssistantMsg.id}`);
                  
                  // 合并成一个包含内容和工具调用的消息
                  historyMessages.push({
                    id: nextAssistantMsg.id?.toString() || generateMessageId(),
                    role: nextAssistantMsg.role,
                    content: nextAssistantMsg.content,
                    timestamp: nextAssistantMsg.timestamp || new Date(nextAssistantMsg.created_at).getTime(),
                    model: nextAssistantMsg.model,
                    toolCalls // 包含工具调用信息
                  });
                  
                  i++; // 跳过下一个消息，因为已经处理了
                } else {
                  // 如果没有找到后续消息，只保存工具调用消息（但不应该出现这种情况）
                  console.warn(`没有找到工具调用 ${msg.id} 的后续AI回复消息`);
                }
                continue;
              }
            }
            
            // 普通消息直接添加
            const baseMessage = {
              id: msg.id?.toString() || generateMessageId(),
              role: msg.role,
              content: msg.content || '',
              timestamp: msg.timestamp || new Date(msg.created_at).getTime(),
              model: msg.model,
            };
            
            historyMessages.push(baseMessage);
          }

          console.log('处理后的消息:', historyMessages);
          setMessages(historyMessages);
        }
        // 即使没有历史消息，也要标记为已加载此对话，避免重复加载
        currentConversationIdRef.current = conversationId;
        
        // 返回对话信息，供调用方使用
        return {
          conversation: data.conversation,
          lastModel: data.lastModel
        };
      }
    } catch (err) {
      console.error('加载对话历史失败:', err);
      const errorMessage = err instanceof Error ? err.message : '加载对话历史失败';
      
      // 如果是404错误，说明对话不存在，清除无效的对话ID
      if (errorMessage.includes('Not Found') || errorMessage.includes('404')) {
        console.warn(`对话 ${conversationId} 不存在，清除无效的对话ID并重置状态`);
        
        // 清除localStorage中的无效对话ID
        if (typeof window !== 'undefined') {
          localStorage.removeItem('current-conversation-id');
        }
        
        // 清空消息历史
        setMessages([]);
        
        // 重置当前对话ID引用
        currentConversationIdRef.current = null;
        
        // 更新URL，移除对话ID参数
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', '/chat');
        }
        
        // 不设置错误状态，因为这是正常的清理操作
        setError(null);
        
        // 通知页面对话已被清除
        if (onConversationCleared) {
          onConversationCleared();
        }
        
        console.log('已清除无效对话状态，用户可以开始新的对话');
        return null;
      } else {
        // 其他错误正常显示
        setError(errorMessage);
        return null;
      }
    } finally {
      setIsLoadingHistory(false);
    }
    
    // 确保函数总是有返回值
    return null;
  }, [generateMessageId, handleAuthError, onConversationCleared]);

  // 发送消息
  const sendMessage = useCallback(async (messageContent: string, conversationId: string) => {
    if (isStreaming || !messageContent.trim()) return;

    try {
      setError(null);
      setIsStreaming(true);

      // 准备API请求数据 - 使用当前消息列表，过滤掉空内容的助手消息
      const currentMessages = messagesRef.current;
      const validMessages = currentMessages.filter(msg => 
        msg.role === 'user' || (msg.role === 'assistant' && msg.content.trim())
      );

      // 创建用户消息
      const userMessage: Message = {
        id: generateMessageId(),
        role: 'user',
        content: messageContent.trim(),
        timestamp: Date.now(),
      };

      // 创建助手消息占位符
      const assistantMessageId = generateMessageId();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        model: chatMode === 'model' ? selectedModel : undefined,
      };

      // 同时添加用户消息和助手占位符
      setMessages(prev => [...prev, userMessage, assistantMessage]);
      
      const requestBody = {
        model: chatMode === 'model' ? selectedModel : selectedAgent?.model?.base_model || selectedModel,
        messages: [
          ...validMessages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          {
            role: 'user',
            content: messageContent.trim(),
          }
        ],
        conversationId,
        agentId: chatMode === 'agent' ? selectedAgent?.id : undefined,
        stream: true,
        enableTools: stableEnableTools,
        selectedTools: stableSelectedTools,
        // 添加标题总结设置
        titleSummarySettings: promptOptimizeSettings ? {
          enabled: promptOptimizeSettings.titleSummaryEnabled,
          model: promptOptimizeSettings.titleSummaryModel,
          systemPrompt: promptOptimizeSettings.titleSummarySystemPrompt,
        } : undefined,
      };

      // 创建中止控制器
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // 使用安全的token获取方式
      const token = localStorage.getItem('accessToken');
      if (!token) {
        handleAuthError();
        return;
      }

      // 发送流式请求
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        // 检查是否是认证错误
        if (response.status === 401) {
          handleAuthError();
          return;
        }
        
        const errorText = await response.text();
        if (errorText.includes('访问令牌')) {
          handleAuthError();
          return;
        }
        
        throw new Error(`请求失败: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('响应体为空');
      }

      // 处理流式响应
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let currentTargetMessageId = assistantMessageId;

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                
                // 处理标题更新事件
                if (parsed.type === 'title_update') {
                  console.log('📝 收到标题更新事件:', parsed.title);
                  if (onTitleUpdate) {
                    onTitleUpdate(parsed.conversationId, parsed.title);
                  }
                  continue;
                }
                
                // 处理工具调用开始
                if (parsed.type === 'tool_call_start') {
                  console.log('🔧 工具调用开始:', parsed.tool_name);
                  // 可以在这里添加工具调用状态更新
                  continue;
                }

                // 处理工具调用完成 - 将结果添加到当前助手消息
                if (parsed.type === 'tool_call_complete') {
                  console.log('🔧 工具调用完成，添加结果到当前消息');
                  
                  // 创建工具调用结果对象
                  const toolCall = {
                    id: parsed.tool_call_id,
                    name: parsed.tool_name,
                    function: {
                      name: parsed.tool_name,
                      arguments: parsed.tool_args || {}
                    },
                    args: parsed.tool_args || {},
                    result: parsed.tool_result,
                    status: 'completed' as const,
                    startTime: Date.now(),
                    executionTime: parsed.execution_time
                  };
                  
                  // 将工具调用结果添加到当前助手消息
                  setMessages(prev => 
                    prev.map(msg => {
                      if (msg.id === assistantMessageId) {
                        const existingToolCalls = msg.toolCalls || [];
                        // 更新现有工具调用或添加新的
                        const updatedToolCalls = existingToolCalls.map(tc => 
                          tc.id === toolCall.id ? { ...tc, result: toolCall.result, status: 'completed' } : tc
                        );
                        
                        // 如果没找到现有的，添加新的
                        if (!updatedToolCalls.find(tc => tc.id === toolCall.id)) {
                          updatedToolCalls.push(toolCall);
                        }
                        
                        return { ...msg, toolCalls: updatedToolCalls };
                      }
                      return msg;
                    })
                  );
                  
                  // 继续使用同一个助手消息接收后续AI回复内容
                  // currentTargetMessageId 保持不变
                  continue;
                }

                // 处理工具调用错误
                if (parsed.type === 'tool_call_error') {
                  console.log('🔧 工具调用错误:', parsed.tool_name);
                  continue;
                }
                
                // 处理普通消息内容
                const messageContent = parsed.message?.content || parsed.content;
                if (messageContent) {
                  assistantContent += messageContent;
                  
                  // 更新当前目标助手消息的内容
                  setMessages(prev => 
                    prev.map(msg => 
                      msg.id === currentTargetMessageId 
                        ? { ...msg, content: assistantContent }
                        : msg
                    )
                  );
                }

                // 处理工具调用（初始阶段）
                if (parsed.message?.tool_calls || parsed.tool_calls) {
                  const toolCalls = parsed.message?.tool_calls || parsed.tool_calls;
                  setMessages(prev => 
                    prev.map(msg => 
                      msg.id === currentTargetMessageId 
                        ? { ...msg, toolCalls }
                        : msg
                    )
                  );
                }

                // 处理思考过程
                if (parsed.thinking) {
                  setMessages(prev => 
                    prev.map(msg => 
                      msg.id === currentTargetMessageId 
                        ? { ...msg, thinking: parsed.thinking }
                        : msg
                    )
                  );
                }

              } catch (parseError) {
                console.warn('解析流数据失败:', parseError, '原始数据:', data);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (err) {
      console.error('发送消息失败:', err);
      
      if (err instanceof Error && err.name === 'AbortError') {
        setError('消息发送已取消');
      } else {
        setError(err instanceof Error ? err.message : '发送消息失败');
      }

      // 移除失败的助手消息
      setMessages(prev => prev.filter(msg => msg.role !== 'assistant' || msg.content));
      
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [isStreaming, chatMode, selectedModel, selectedAgent?.id, selectedAgent?.model?.base_model, stableEnableTools, stableSelectedTools, generateMessageId, handleAuthError, onTitleUpdate, promptOptimizeSettings]);

  // 停止生成
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // 清空消息
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    currentConversationIdRef.current = null;
  }, []);

  // 删除单个消息
  const removeMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);

  return {
    messages,
    isStreaming,
    error,
    isLoadingHistory,
    sendMessage,
    clearMessages,
    stopGeneration,
    loadConversationHistory,
    removeMessage,
  };
}