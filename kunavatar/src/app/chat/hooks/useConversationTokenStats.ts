'use client';

import { useState, useEffect, useCallback } from 'react';
import { authenticatedFetch } from '@/lib/utils/auth-utils';

// 对话token统计数据类型
interface ConversationTokenStats {
  message_count: number;
  total_characters: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
}

interface UseConversationTokenStatsReturn {
  stats: ConversationTokenStats | null;
  loading: boolean;
  error: string | null;
  refreshStats: () => Promise<void>;
}

export function useConversationTokenStats(conversationId: string | null): UseConversationTokenStatsReturn {
  const [stats, setStats] = useState<ConversationTokenStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取对话统计信息
  const fetchStats = useCallback(async () => {
    if (!conversationId) {
      setStats(null);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await authenticatedFetch(`/api/conversations/${conversationId}/stats`);

      if (!response.ok) {
        if (response.status === 404) {
          // 对话不存在或没有消息，返回空统计
          setStats({
            message_count: 0,
            total_characters: 0,
            total_prompt_tokens: 0,
            total_completion_tokens: 0,
            total_tokens: 0
          });
          return;
        }
        throw new Error(`获取对话统计失败: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      } else {
        throw new Error(data.error || '获取对话统计失败');
      }
    } catch (err) {
      console.error('获取对话统计错误:', err);
      setError(err instanceof Error ? err.message : '获取对话统计失败');
      // 设置默认值，避免UI显示错误
      setStats({
        message_count: 0,
        total_characters: 0,
        total_prompt_tokens: 0,
        total_completion_tokens: 0,
        total_tokens: 0
      });
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // 刷新统计信息
  const refreshStats = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  // 当对话ID变化时自动获取统计信息
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refreshStats
  };
}