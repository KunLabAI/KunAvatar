import { useState, useEffect, useCallback } from 'react';
import { authenticatedFetch, useAuthErrorHandler } from '../../../lib/utils/auth-utils';

// 对话类型定义
interface Conversation {
  id: string;
  title: string;
  model?: string;
  user_id: string;
  agent_id?: number | null;
  created_at: string;
  updated_at: string;
}

interface UseConversationsReturn {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  createConversation: (data: CreateConversationData) => Promise<Conversation | null>;
  deleteConversation: (id: string) => Promise<boolean>;
  updateConversationTitle: (id: string, title: string) => Promise<boolean>;
  refreshConversations: () => Promise<void>;
}

interface CreateConversationData {
  title: string;
  model?: string;
  agent_id?: number | null;
}

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 认证错误处理
  const { handleAuthError } = useAuthErrorHandler();

  // 获取对话列表
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authenticatedFetch('/api/conversations');

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
        
        throw new Error(`获取对话列表失败: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setConversations(data.conversations || []);
      } else {
        throw new Error(data.error || '获取对话列表失败');
      }
    } catch (err) {
      console.error('获取对话列表错误:', err);
      setError(err instanceof Error ? err.message : '获取对话列表失败');
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [handleAuthError]);

  // 创建新对话
  const createConversation = useCallback(async (data: CreateConversationData): Promise<Conversation | null> => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        handleAuthError();
        return null;
      }

      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

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
        
        throw new Error(`创建对话失败: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        const newConversation = result.conversation;
        setConversations(prev => [newConversation, ...prev]);
        return newConversation;
      } else {
        throw new Error(result.error || '创建对话失败');
      }
    } catch (err) {
      console.error('创建对话错误:', err);
      setError(err instanceof Error ? err.message : '创建对话失败');
      return null;
    }
  }, [handleAuthError]);

  // 删除对话
  const deleteConversation = useCallback(async (id: string): Promise<boolean> => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        handleAuthError();
        return false;
      }

      const response = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // 检查是否是认证错误
        if (response.status === 401) {
          handleAuthError();
          return false;
        }
        
        const errorText = await response.text();
        if (errorText.includes('访问令牌')) {
          handleAuthError();
          return false;
        }
        
        throw new Error(`删除对话失败: ${response.statusText}`);
      }

      // 从本地状态中移除
      setConversations(prev => prev.filter(conv => conv.id !== id));
      return true;
    } catch (err) {
      console.error('删除对话错误:', err);
      setError(err instanceof Error ? err.message : '删除对话失败');
      return false;
    }
  }, [handleAuthError]);

  // 更新对话标题
  const updateConversationTitle = useCallback(async (id: string, title: string): Promise<boolean> => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        handleAuthError();
        return false;
      }

      const response = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        // 检查是否是认证错误
        if (response.status === 401) {
          handleAuthError();
          return false;
        }
        
        const errorText = await response.text();
        if (errorText.includes('访问令牌')) {
          handleAuthError();
          return false;
        }
        
        throw new Error(`更新对话标题失败: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        // 更新本地状态
        setConversations(prev => 
          prev.map(conv => conv.id === id ? { ...conv, title } : conv)
        );
        return true;
      } else {
        throw new Error(result.error || '更新对话标题失败');
      }
    } catch (err) {
      console.error('更新对话标题错误:', err);
      setError(err instanceof Error ? err.message : '更新对话标题失败');
      return false;
    }
  }, [handleAuthError]);

  // 刷新对话列表
  const refreshConversations = useCallback(async () => {
    await fetchConversations();
  }, [fetchConversations]);

  // 初始化时获取对话列表
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    loading,
    error,
    createConversation,
    deleteConversation,
    updateConversationTitle,
    refreshConversations,
  };
}