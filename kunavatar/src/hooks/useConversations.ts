import { useState, useEffect, useCallback } from 'react';
import { Conversation } from '@/lib/database/types';

/**
 * 轻量级的对话数据hook，用于非聊天页面获取对话列表
 * 主要用于Sidebar组件显示对话历史
 */
export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // 加载对话列表
  const loadConversations = useCallback(async () => {
    if (loading || hasLoaded) return; // 避免重复加载
    
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        // 没有token，可能未登录，设置空数组
        setConversations([]);
        setHasLoaded(true);
        return;
      }

      const response = await fetch('/api/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('获取对话列表失败');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setConversations(data.conversations || []);
        setHasLoaded(true);
      } else {
        throw new Error(data.error || '获取对话列表失败');
      }
    } catch (err) {
      console.error('加载对话列表失败:', err);
      setError(err instanceof Error ? err.message : '加载对话列表失败');
      // 出错时也设置为已加载，避免无限重试
      setConversations([]);
      setHasLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [loading, hasLoaded]);

  // 组件挂载时自动加载
  useEffect(() => {
    // 延迟加载，避免阻塞页面初始化
    const timer = setTimeout(() => {
      loadConversations();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [loadConversations]);

  // 刷新对话列表（强制重新加载）
  const refreshConversations = useCallback(async () => {
    setHasLoaded(false);
    await loadConversations();
  }, [loadConversations]);

  return {
    conversations,
    loading,
    error,
    refreshConversations,
  };
}