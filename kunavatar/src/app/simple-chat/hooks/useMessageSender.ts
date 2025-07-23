'use client';

import { useCallback, useRef } from 'react';
import { Conversation } from '@/lib/database/types';
import { streamingChatService } from '../services/streamingChatService';

interface MessageSenderConfig {
  currentConversation: Conversation | null;
  selectedModel: string;
  selectedAgentId: number | null;
  inputMessage: string;
  isStreaming: boolean;
  enableTools: boolean;
  selectedTools: string[];
  messages: any[];
  
  // 状态更新函数
  setMessages: Function;
  setInputMessage: Function;
  setIsStreaming: Function;
  setError: Function;
  setToolCalls: Function;
  setActiveTool: Function;
  setCurrentAssistantMessageId: Function;
  setAbortController: Function;
  
  // 业务逻辑函数
  createConversation: Function;
  createStreamHandlers: Function;
}

interface UseMessageSenderReturn {
  sendMessage: () => Promise<void>;
  clearCurrentChat: () => Promise<void>;
  insertText: (text: string) => void;
}

export function useMessageSender(config: MessageSenderConfig): UseMessageSenderReturn {
  const {
    currentConversation,
    selectedModel,
    selectedAgentId,
    inputMessage,
    isStreaming,
    enableTools,
    selectedTools,
    messages,
    // 注意：systemPrompt 已移除，智能体系统提示由后端自动处理
    setMessages,
    setInputMessage,
    setIsStreaming,
    setError,
    setToolCalls,
    setActiveTool,
    setCurrentAssistantMessageId,
    setAbortController,
    createConversation,
    createStreamHandlers,
  } = config;

  // 使用ref来获取最新的消息列表，避免依赖问题
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // 发送消息的核心逻辑
  const sendMessage = useCallback(async () => {
    console.log('🚀 sendMessage 被调用，检查条件:', {
      hasInputMessage: !!inputMessage.trim(),
      selectedModel,
      isStreaming,
      selectedAgentId,
      currentConversation: currentConversation?.id
    });
    
    if (!inputMessage.trim() || !selectedModel || isStreaming) {
      console.log('❌ 发送消息被阻止:', {
        noInput: !inputMessage.trim(),
        noModel: !selectedModel,
        isStreaming
      });
      return;
    }

    let activeConversation = currentConversation;
    if (!activeConversation) {
      // 修复：使用默认标题而不是用户输入，让标题总结功能可以正常工作
      const defaultTitle = `新对话 - ${new Date().toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`;
      
      const conversationId = await createConversation({
        title: defaultTitle, // 使用默认标题，稍后由标题总结功能自动生成标题
        model: selectedModel,
        agentId: selectedAgentId || undefined,
        autoSwitch: true
      });
      if (!conversationId) {
        setError('创建对话失败');
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      activeConversation = currentConversation;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      content: inputMessage.trim(),
      timestamp: Date.now(),
    };

    // 获取当前的消息列表（使用ref避免在依赖中包含messages）
    const currentMessages = messagesRef.current;
    
    setMessages((prev: any[]) => [...prev, userMessage]);
    setInputMessage('');
    setIsStreaming(true);
    setError(null);
    setToolCalls([]);
    setActiveTool(null);

    const assistantMessageId = `assistant-${Date.now()}`;
    const assistantMessage = {
      id: assistantMessageId,
      role: 'assistant' as const,
      content: '',
      timestamp: Date.now(),
      model: selectedModel,
    };

    setMessages((prev: any[]) => [...prev, assistantMessage]);
    setCurrentAssistantMessageId(assistantMessageId);

    try {
      // 创建新的 AbortController
      const controller = new AbortController();
      setAbortController(controller);

      // 获取标题总结设置
      let titleSummarySettings = { enabled: false, model: '' };
      try {
        const savedSettings = localStorage.getItem('prompt_optimize_settings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          titleSummarySettings = {
            enabled: settings.titleSummaryEnabled || false,
            model: settings.titleSummaryModel || ''
          };
        }
      } catch (error) {
        console.error('Failed to load title summary settings:', error);
      }

      const chatRequestBody = {
        model: selectedModel,
        conversationId: activeConversation?.id,
        agentId: selectedAgentId,
        messages: [
          ...currentMessages.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
          })),
          {
            role: 'user',
            content: userMessage.content,
          },
        ],
        stream: true,
        enableTools,
        selectedTools,
        titleSummarySettings,
      };

      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(chatRequestBody),
        signal: controller.signal, // 添加中断信号
      });

      if (!response.ok) {
        throw new Error('聊天请求失败');
      }

      // 使用流式服务处理响应，传递 AbortController
      await streamingChatService.processStreamingResponse(response, createStreamHandlers(), assistantMessageId, controller);

    } catch (err) {
      // 如果是中断错误，不显示错误信息
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('🛑 用户主动停止了生成');
      } else {
        setError(err instanceof Error ? err.message : '发送消息失败');
        setMessages((prev: any[]) => prev.filter((msg: any) => msg.id !== assistantMessageId));
      }
    } finally {
      setIsStreaming(false);
      setAbortController(null);
    }
  }, [
    inputMessage, selectedModel, isStreaming, currentConversation,
    enableTools, selectedTools, createConversation, setAbortController,
    createStreamHandlers, setActiveTool, setCurrentAssistantMessageId, setInputMessage,
    setIsStreaming, setMessages, setToolCalls, selectedAgentId, setError
  ]);

  // 清空当前对话
  const clearCurrentChat = useCallback(async () => {
    if (!currentConversation) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/conversations/${currentConversation.id}/clear`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        // 清空当前消息
        setMessages([]);
        setToolCalls([]);
        setActiveTool(null);
        setError(null);
      }
    } catch (error) {
      console.error('清空对话失败:', error);
      setError('清空对话失败');
    }
  }, [currentConversation, setMessages, setToolCalls, setActiveTool, setError]);

  // 插入文本到输入框
  const insertText = useCallback((text: string) => {
    setInputMessage(text);
  }, [setInputMessage]);

  return {
    sendMessage,
    clearCurrentChat,
    insertText,
  };
}