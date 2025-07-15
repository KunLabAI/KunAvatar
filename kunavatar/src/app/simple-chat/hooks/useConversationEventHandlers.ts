'use client';

import { useState } from 'react';
import { CreateConversationOptions } from './utils/conversationUtils';

interface UseConversationEventHandlersProps {
  currentConversation: any;
  conversations: any[];
  selectedModel: string;
  createConversation: (options: CreateConversationOptions | string, model?: string, agentId?: number) => Promise<string | null>;
  switchConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  setMessages: (messages: any[]) => void;
  setToolCalls: (toolCalls: any[]) => void;
  setSelectedModel: (model: string, conversationId?: string) => void;
  setError: (error: string | null) => void;
  setIsProcessingUrl: (processing: boolean) => void;
}

export function useConversationEventHandlers({
  currentConversation,
  conversations,
  selectedModel,
  createConversation,
  switchConversation,
  deleteConversation,
  loadConversations,
  setMessages,
  setToolCalls,
  setSelectedModel,
  setError,
  setIsProcessingUrl,
}: UseConversationEventHandlersProps) {

  // 注意：handleCreateConversation 函数已被移除，请直接使用 createConversation



  // 加载对话
  const handleLoadConversation = async (conversationId: string) => {
    if (currentConversation?.id === conversationId) return;
    
    try {
      setIsProcessingUrl(true);
      await switchConversation(conversationId);
      setError(null);
      window.history.pushState(null, '', `/simple-chat?id=${conversationId}`);
    } catch (err) {
      console.error('切换对话失败:', err);
      setError('切换对话失败');
    } finally {
      setTimeout(() => setIsProcessingUrl(false), 100);
    }
  };

  // 删除对话
  const handleDeleteConversation = async (conversationId: string) => {
    const isCurrentConversation = currentConversation?.id === conversationId;
    
    try {
      setIsProcessingUrl(true);
      await deleteConversation(conversationId);
      
      if (isCurrentConversation) {
        await loadConversations();
        const updatedConversations = conversations.filter(conv => conv.id !== conversationId);
        
        if (updatedConversations.length > 0) {
          const targetConversation = updatedConversations[0];
          await switchConversation(targetConversation.id);
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', `/simple-chat?id=${targetConversation.id}`);
          }
        } else {
          setMessages([]);
          setToolCalls([]);
          setError(null);
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', '/simple-chat');
          }
        }
      }
    } catch (err) {
      console.error('删除对话失败:', err);
      setError('删除对话失败');
    } finally {
      setTimeout(() => setIsProcessingUrl(false), 200);
    }
  };

  // 清除当前聊天
  const clearCurrentChat = async () => {
    if (!currentConversation) {
      setMessages([]);
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/conversations/${currentConversation.id}/clear`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        setMessages([]);
        setError(null);
      } else {
        setError('清除对话失败');
      }
    } catch (err) {
      setError('清除对话失败');
    }
  };

  return {
    handleLoadConversation,
    handleDeleteConversation,
    clearCurrentChat,
  };
}