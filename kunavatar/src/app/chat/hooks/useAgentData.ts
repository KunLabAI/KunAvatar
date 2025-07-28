import { useState, useEffect, useCallback } from 'react';
import { authenticatedFetch, useAuthErrorHandler } from '../../../lib/utils/auth-utils';
import { Agent } from '../types';

interface UseAgentDataReturn {
  agents: Agent[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAgentData(): UseAgentDataReturn {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 认证错误处理
  const { handleAuthError } = useAuthErrorHandler();

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authenticatedFetch('/api/agents');

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
        
        throw new Error(`获取Agent列表失败: ${response.statusText}`);
      }

      const agents = await response.json();
      // 后端直接返回agents数组，不需要检查success字段
      setAgents(Array.isArray(agents) ? agents : []);
    } catch (err) {
      console.error('获取Agent列表错误:', err);
      setError(err instanceof Error ? err.message : '获取Agent列表失败');
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }, [handleAuthError]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return {
    agents,
    loading,
    error,
    refetch: fetchAgents,
  };
}