import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { usePromptOptimizeSettings } from '../../settings/hooks/usePromptOptimizeSettings';
import { authenticatedFetch, useAuthErrorHandler } from '../../../lib/utils/auth-utils';

/**
 * 缩减消息中的base64图片数据用于日志显示
 */
function sanitizeMessagesForLogging(messages: any[]): any[] {
  return messages.map(message => {
    if (message.images && Array.isArray(message.images)) {
      return {
        ...message,
        images: message.images.map((image: string) => {
          if (typeof image === 'string' && image.startsWith('data:image/')) {
            const commaIndex = image.indexOf(',');
            if (commaIndex !== -1) {
              const prefix = image.substring(0, commaIndex + 1);
              const base64Data = image.substring(commaIndex + 1);
              if (base64Data.length > 50) {
                return `${prefix}${base64Data.substring(0, 50)}...[base64数据已缩减,长度:${base64Data.length}]`;
              }
            }
          }
          return image;
        })
      };
    }
    return message;
  });
}

// 消息类型定义
interface Message {
  id: string; // 数据库ID或临时ID
  clientId?: string; // 稳定的前端Key，避免替换ID导致的重挂载
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  model?: string;
  toolCalls?: any[];
  thinking?: string;
  images?: string[]; // 新增：图片数据数组
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

interface UseMessageSenderReturn {
  messages: Message[];
  isStreaming: boolean;
  error: string | null;
  isLoadingHistory: boolean;
  sendMessage: (message: string, conversationId: string, images?: string[]) => Promise<void>;
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
  // 流式内容节流/合并相关引用，避免在一次渲染周期内触发过多 setState
  const streamingUpdateRafRef = useRef<number | null>(null);
  const pendingAssistantContentRef = useRef<string>('');
  const targetAssistantMessageIdRef = useRef<string | null>(null);
  const thinkingBufferRef = useRef<string>('');
  const hasThinkingRef = useRef<boolean>(false);
  const lastFlushedContentRef = useRef<string>('');
  const streamingUpdateTimerRef = useRef<number | null>(null);
  const assistantStatsRef = useRef<{
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    prompt_eval_duration?: number;
    eval_count?: number;
    eval_duration?: number;
  } | null>(null);
  const isStreamingRef = useRef<boolean>(false);
  const lastUserMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

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

    // 🔥 关键修复：如果正在流式生成，不要加载历史消息，避免清空正在生成的内容
    if (isStreaming) {
      console.log('🚫 正在流式生成消息，跳过历史消息加载，避免清空当前内容');
      return null;
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
          // 处理工具调用记录，按消息ID分组
          const toolCallsByMessageId = new Map<string, any[]>();
          if (data.toolCallRecords && data.toolCallRecords.length > 0) {
            console.log('处理工具调用记录:', data.toolCallRecords);
            
            // 按时间排序消息和工具调用记录
            const sortedMessages = data.messages
              .filter((msg: any) => msg.role === 'assistant')
              .sort((a: any, b: any) => {
                const timeA = a.timestamp || new Date(a.created_at).getTime();
                const timeB = b.timestamp || new Date(b.created_at).getTime();
                return timeA - timeB;
              });
            
            const sortedToolRecords = data.toolCallRecords.sort((a: any, b: any) => {
              const timeA = a.timestamp || new Date(a.created_at).getTime();
              const timeB = b.timestamp || new Date(b.created_at).getTime();
              return timeA - timeB;
            });
            
            // 为每个工具调用记录找到对应的助手消息
            sortedToolRecords.forEach((toolRecord: any) => {
              const toolTime = toolRecord.timestamp || new Date(toolRecord.created_at).getTime();
              
              // 找到工具调用时间之前最近的助手消息
              let targetMessage: any = null;
              for (let i = sortedMessages.length - 1; i >= 0; i--) {
                const msg = sortedMessages[i];
                const msgTime = msg.timestamp || new Date(msg.created_at).getTime();
                
                // 工具调用应该属于它之前最近的助手消息
                if (msgTime <= toolTime) {
                  targetMessage = msg;
                  break;
                }
              }
              
              // 如果没找到合适的消息，使用最后一个助手消息
              if (!targetMessage && sortedMessages.length > 0) {
                targetMessage = sortedMessages[sortedMessages.length - 1];
              }
              
              if (targetMessage) {
                const messageId = targetMessage.id?.toString();
                if (!toolCallsByMessageId.has(messageId)) {
                  toolCallsByMessageId.set(messageId, []);
                }
                
                // 转换工具调用记录为前端格式
                const toolCall = {
                  id: `tool_${toolRecord.id}`,
                  toolName: toolRecord.tool_name,
                  name: toolRecord.tool_name,
                  function: {
                    name: toolRecord.tool_name,
                    arguments: toolRecord.tool_args ? JSON.parse(toolRecord.tool_args) : {}
                  },
                  args: toolRecord.tool_args ? JSON.parse(toolRecord.tool_args) : {},
                  result: toolRecord.tool_result ? JSON.parse(toolRecord.tool_result) : undefined,
                  status: toolRecord.tool_status || 'completed',
                  startTime: toolRecord.timestamp || new Date(toolRecord.created_at).getTime(),
                  executionTime: toolRecord.tool_execution_time,
                  error: toolRecord.tool_error
                };
                
                toolCallsByMessageId.get(messageId)!.push(toolCall);
              }
            });
          }
          
          // 转换数据库消息格式为前端消息格式
          const historyMessages: Message[] = data.messages
            .filter((msg: any) => msg.role !== 'tool') // 过滤掉工具消息
            .map((msg: any) => {
              const messageId = msg.id?.toString();
              const toolCalls = toolCallsByMessageId.get(messageId) || [];
              
              return {
                id: messageId || generateMessageId(),
                role: msg.role,
                content: msg.content || '',
                timestamp: msg.timestamp || new Date(msg.created_at).getTime(),
                model: msg.model,
                toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
                // 添加图片字段支持
                ...(msg.images && msg.images.length > 0 && { images: msg.images }),
                // 添加Ollama统计信息字段
                total_duration: msg.total_duration,
                load_duration: msg.load_duration,
                prompt_eval_count: msg.prompt_eval_count,
                prompt_eval_duration: msg.prompt_eval_duration,
                eval_count: msg.eval_count,
                eval_duration: msg.eval_duration,
              };
            });

          console.log('处理后的消息:', sanitizeMessagesForLogging(historyMessages));
          console.log('工具调用映射:', toolCallsByMessageId);
          
          // 🔥 关键修复：再次检查是否正在流式生成，如果是则不覆盖当前消息
          if (!isStreaming) {
            setMessages(historyMessages);
          } else {
            console.log('🚫 检测到正在流式生成，不覆盖当前消息');
            return null;
          }
        } else {
          // 🔥 关键修复：对于新对话（没有历史消息），不清空当前消息
          // 新对话可能正在进行首次对话，不应该清空任何消息
          console.log('📝 新对话没有历史消息，保持当前消息状态');
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
  const sendMessage = useCallback(async (messageContent: string, conversationId: string, images?: string[]) => {
    if (isStreaming || (!messageContent.trim() && (!images || images.length === 0))) return;

    try {
      setError(null);
      setIsStreaming(true);

      // 准备API请求数据 - 使用当前消息列表，过滤掉空内容的助手消息
      const currentMessages = messagesRef.current;
      const validMessages = currentMessages.filter(msg => 
        msg.role === 'user' || (msg.role === 'assistant' && msg.content.trim())
      );

      // 创建用户消息
      const userMessageId = generateMessageId();
      const userMessage: Message = {
        id: userMessageId,
        clientId: userMessageId,
        role: 'user',
        content: messageContent.trim(),
        timestamp: Date.now(),
        ...(images && images.length > 0 && { images })
      };
      // 记录本次发送的用户消息临时ID，便于服务端保存后替换为数据库ID
      lastUserMessageIdRef.current = userMessage.id;

      // 创建助手消息占位符
      const assistantMessageId = generateMessageId();
      const assistantMessage: Message = {
        id: assistantMessageId,
        clientId: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        model: chatMode === 'model' ? selectedModel : undefined,
      };

      // 同时添加用户消息和助手占位符
      setMessages(prev => [...prev, userMessage, assistantMessage]);

      // 初始化流式内容缓冲与目标消息
      targetAssistantMessageIdRef.current = assistantMessageId;
      pendingAssistantContentRef.current = '';
      thinkingBufferRef.current = '';
      hasThinkingRef.current = false;
      lastFlushedContentRef.current = '';
      assistantStatsRef.current = null; // 清空统计信息
      
      // 构建消息内容，支持图片
      const userMessageContent = messageContent.trim();
      const messageForAPI = {
        role: 'user' as const,
        content: userMessageContent,
        ...(images && images.length > 0 && { images })
      };
      
      const requestBody = {
        model: chatMode === 'model' ? selectedModel : selectedAgent?.model?.base_model || selectedModel,
        messages: [
          ...validMessages.map(msg => ({
            role: msg.role,
            content: msg.content,
            ...(msg.images && msg.images.length > 0 && { images: msg.images })
          })),
          messageForAPI
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

      // 合并/节流：统一在 rAF 节点提交 setMessages，降低更新频率
      const flushAssistantContent = () => {
        const targetId = targetAssistantMessageIdRef.current;
        if (!targetId) return;
        const contentToFlush = pendingAssistantContentRef.current;
        if (contentToFlush == null) return;

        // 如果没有变化，跳过更新，避免无意义的 re-render
        if (contentToFlush === lastFlushedContentRef.current) return;

        // 读取当前消息实际内容，若一致则不更新
        const current = messagesRef.current.find(m => m.id === targetId);
        if (!current) {
          // 目标消息已不存在（可能被清空对话），停止后续刷写
          targetAssistantMessageIdRef.current = null;
          return;
        }
        if (current.content === contentToFlush) {
          lastFlushedContentRef.current = contentToFlush;
          return;
        }

        setMessages(prev => {
          let changed = false;
          const next = prev.map(msg => {
            if (msg.id === targetId) {
              if (msg.content !== contentToFlush) {
                changed = true;
                return { 
                  ...msg, 
                  content: contentToFlush,
                  // 使用ref中的统计信息，如果没有则保留原有的
                  total_duration: assistantStatsRef.current?.total_duration ?? msg.total_duration,
                  load_duration: assistantStatsRef.current?.load_duration ?? msg.load_duration,
                  prompt_eval_count: assistantStatsRef.current?.prompt_eval_count ?? msg.prompt_eval_count,
                  prompt_eval_duration: assistantStatsRef.current?.prompt_eval_duration ?? msg.prompt_eval_duration,
                  eval_count: assistantStatsRef.current?.eval_count ?? msg.eval_count,
                  eval_duration: assistantStatsRef.current?.eval_duration ?? msg.eval_duration
                };
              }
            }
            return msg;
          });
          if (changed) {
            lastFlushedContentRef.current = contentToFlush;
          }
          return next;
        });
      };

      const scheduleAssistantContentFlush = () => {
        // 无目标或已停止流式，跳过
        if (!targetAssistantMessageIdRef.current || !isStreamingRef.current) return;
        // 内容未变化则不调度
        if (pendingAssistantContentRef.current === lastFlushedContentRef.current) return;

        // 在服务端或无 window 环境直接同步
        if (typeof window === 'undefined') {
          flushAssistantContent();
          return;
        }

        // 基于时间的节流：最多每 ~100ms 刷新一次，避免深层次更新
        const STREAM_FLUSH_INTERVAL_MS = 100;
        if (streamingUpdateTimerRef.current == null) {
          streamingUpdateTimerRef.current = window.setTimeout(() => {
            streamingUpdateTimerRef.current = null;
            // 使用 rAF 在下一帧执行，进一步平滑
            if (streamingUpdateRafRef.current == null) {
              streamingUpdateRafRef.current = window.requestAnimationFrame(() => {
                streamingUpdateRafRef.current = null;
                flushAssistantContent();
              });
            }
          }, STREAM_FLUSH_INTERVAL_MS);
        }
      };

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
                
                // 处理用户消息/助手消息保存事件（用数据库ID替换前端临时ID）
                if (parsed.type === 'user_message_saved' && parsed.messageId) {
                  const savedId = String(parsed.messageId);
                  const oldId = lastUserMessageIdRef.current;
                  if (oldId) {
                    setMessages(prev => prev.map(m => m.id === oldId ? { ...m, id: savedId } : m));
                    lastUserMessageIdRef.current = savedId;
                  } else {
                    // 回退：找最近的临时用户消息
                    setMessages(prev => {
                      for (let i = prev.length - 1; i >= 0; i--) {
                        const m = prev[i];
                        if (m.role === 'user' && m.id.startsWith('msg_')) {
                          const copy = [...prev];
                          copy[i] = { ...m, id: savedId } as Message;
                          return copy;
                        }
                      }
                      return prev;
                    });
                  }
                  continue;
                }

                if (parsed.type === 'assistant_message_saved' && parsed.messageId) {
                  const savedId = String(parsed.messageId);
                  const oldAssistantId = targetAssistantMessageIdRef.current;
                  if (oldAssistantId) {
                    setMessages(prev => prev.map(m => m.id === oldAssistantId ? { ...m, id: savedId } : m));
                    // 保持 clientId 不变，避免重挂载
                    targetAssistantMessageIdRef.current = savedId;
                    currentTargetMessageId = savedId;
                  }
                  continue;
                }

                // 处理工具调用开始
                if (parsed.type === 'tool_call_start') {
                  console.log('🔧 工具调用开始:', parsed.tool_name);
                  
                  // 更新当前助手消息的工具调用状态
                  setMessages(prev => 
                    prev.map(msg => {
                      if (msg.id === assistantMessageId) {
                        return { 
                          ...msg, 
                          activeToolCall: {
                            id: parsed.tool_call_id,
                            name: parsed.tool_name,
                            status: 'executing'
                          }
                        };
                      }
                      return msg;
                    })
                  );
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
                        
                        return { 
                          ...msg, 
                          toolCalls: updatedToolCalls,
                          activeToolCall: undefined // 清除活跃工具调用状态
                        };
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
                  
                  // 清除当前助手消息的工具调用状态
                  setMessages(prev => 
                    prev.map(msg => {
                      if (msg.id === assistantMessageId) {
                        return { 
                          ...msg, 
                          activeToolCall: undefined // 清除活跃工具调用状态
                        };
                      }
                      return msg;
                    })
                  );
                  continue;
                }
                
                // 处理普通消息内容
                const messageContent = parsed.message?.content || parsed.content;
                if (messageContent) {
                  assistantContent += messageContent;
                  // 合并思考内容后再写入，保持与思考面板的一致性
                  const combinedContent = hasThinkingRef.current
                    ? `<think>\n${thinkingBufferRef.current}\n</think>\n\n${assistantContent}`
                    : assistantContent;
                  pendingAssistantContentRef.current = combinedContent;
                  scheduleAssistantContentFlush();
                }

                // 处理统计信息（当done为true时）
                if (parsed.done && (parsed.total_duration || parsed.eval_count)) {
                  console.log('🔧 收到统计信息:', {
                    total_duration: parsed.total_duration,
                    load_duration: parsed.load_duration,
                    prompt_eval_count: parsed.prompt_eval_count,
                    prompt_eval_duration: parsed.prompt_eval_duration,
                    eval_count: parsed.eval_count,
                    eval_duration: parsed.eval_duration
                  });
                  
                  // 将统计信息存储到ref中
                  assistantStatsRef.current = {
                    total_duration: parsed.total_duration,
                    load_duration: parsed.load_duration,
                    prompt_eval_count: parsed.prompt_eval_count,
                    prompt_eval_duration: parsed.prompt_eval_duration,
                    eval_count: parsed.eval_count,
                    eval_duration: parsed.eval_duration
                  };
                  
                  // 将统计信息添加到助手消息
                  setMessages(prev => 
                    prev.map(msg => 
                      msg.id === currentTargetMessageId 
                        ? { 
                            ...msg, 
                            total_duration: parsed.total_duration,
                            load_duration: parsed.load_duration,
                            prompt_eval_count: parsed.prompt_eval_count,
                            prompt_eval_duration: parsed.prompt_eval_duration,
                            eval_count: parsed.eval_count,
                            eval_duration: parsed.eval_duration
                          }
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
                if (parsed.type === 'thinking' && parsed.thinking) {
                  // 将思考内容缓冲，不立即 setState；与正文合并后再节流更新
                  hasThinkingRef.current = true;
                  if (thinkingBufferRef.current) {
                    thinkingBufferRef.current = `${thinkingBufferRef.current}\n\n${parsed.thinking}`;
                  } else {
                    thinkingBufferRef.current = parsed.thinking;
                  }
                  const combinedContent = `<think>\n${thinkingBufferRef.current}\n</think>\n\n${assistantContent}`;
                  pendingAssistantContentRef.current = combinedContent;
                  scheduleAssistantContentFlush();
                  continue;
                }

                // 处理思考过程（兼容旧格式）
                if (parsed.thinking) {
                  hasThinkingRef.current = true;
                  if (thinkingBufferRef.current) {
                    thinkingBufferRef.current = `${thinkingBufferRef.current}\n\n${parsed.thinking}`;
                  } else {
                    thinkingBufferRef.current = parsed.thinking;
                  }
                  const combinedContent = `<think>\n${thinkingBufferRef.current}\n</think>\n\n${assistantContent}`;
                  pendingAssistantContentRef.current = combinedContent;
                  scheduleAssistantContentFlush();
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
      // 如果是用户主动停止生成，不应该当作错误处理
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('✅ 用户主动停止了消息生成');
        // 不设置错误状态，因为这是用户的正常操作
        // 保留已生成的内容，不移除助手消息
        return;
      }
      
      console.error('发送消息失败:', err);
      setError(err instanceof Error ? err.message : '发送消息失败');

      // 只有在真正的错误情况下才移除失败的助手消息
      setMessages(prev => prev.filter(msg => msg.role !== 'assistant' || msg.content));
      
    } finally {
      // 结束前做一次最终 flush，确保最后一批内容写入
      if (streamingUpdateRafRef.current != null) {
        if (typeof window !== 'undefined') {
          window.cancelAnimationFrame(streamingUpdateRafRef.current);
        }
        streamingUpdateRafRef.current = null;
      }
      if (streamingUpdateTimerRef.current != null) {
        if (typeof window !== 'undefined') {
          clearTimeout(streamingUpdateTimerRef.current);
        }
        streamingUpdateTimerRef.current = null;
      }
      if (pendingAssistantContentRef.current && targetAssistantMessageIdRef.current) {
        setMessages(prev =>
          prev.map(msg => {
            if (msg.id === targetAssistantMessageIdRef.current) {
              // 保留现有的统计信息，只更新内容
              return { 
                ...msg, 
                content: pendingAssistantContentRef.current,
                // 使用ref中的统计信息，如果没有则保留原有的
                total_duration: assistantStatsRef.current?.total_duration ?? msg.total_duration,
                load_duration: assistantStatsRef.current?.load_duration ?? msg.load_duration,
                prompt_eval_count: assistantStatsRef.current?.prompt_eval_count ?? msg.prompt_eval_count,
                prompt_eval_duration: assistantStatsRef.current?.prompt_eval_duration ?? msg.prompt_eval_duration,
                eval_count: assistantStatsRef.current?.eval_count ?? msg.eval_count,
                eval_duration: assistantStatsRef.current?.eval_duration ?? msg.eval_duration
              };
            }
            return msg;
          })
        );
      }
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [isStreaming, chatMode, selectedModel, selectedAgent?.id, selectedAgent?.model?.base_model, stableEnableTools, stableSelectedTools, generateMessageId, handleAuthError, onTitleUpdate, promptOptimizeSettings]);

  // 停止生成
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current && isStreaming) {
      console.log('🛑 用户请求停止生成，正在保存已生成的内容...');
      
      // 中止请求，这会触发后端的handleAbort逻辑来保存内容
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      
      // 立即更新流状态，避免用户重复点击
      setIsStreaming(false);
      
      // 清除错误状态（如果有的话）
      setError(null);
      
      console.log('✅ 停止请求已发送，内容将被保存到数据库');
    }
  }, [isStreaming]);

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