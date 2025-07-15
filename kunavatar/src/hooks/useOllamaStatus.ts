'use client';

import { useState, useEffect, useCallback } from 'react';

interface OllamaStatus {
  available: boolean;
  status: 'connected' | 'disconnected' | 'checking';
  message: string;
}

export function useOllamaStatus() {
  const [status, setStatus] = useState<OllamaStatus>({
    available: false,
    status: 'checking',
    message: '正在检测Ollama状态...'
  });
  const [loading, setLoading] = useState(false);

  const checkOllamaStatus = useCallback(async () => {
    setLoading(true);
    setStatus(prev => ({ ...prev, status: 'checking', message: '正在检测Ollama状态...' }));

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setStatus({
          available: false,
          status: 'disconnected',
          message: '未登录，无法检测Ollama状态'
        });
        return;
      }

      const response = await fetch('/api/ollama/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({
          available: data.available,
          status: data.status,
          message: data.message
        });
      } else {
        setStatus({
          available: false,
          status: 'disconnected',
          message: data.message || 'Ollama服务不可用'
        });
      }
    } catch (error) {
      console.error('检测Ollama状态失败:', error);
      setStatus({
        available: false,
        status: 'disconnected',
        message: '网络错误，无法检测Ollama状态'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 初始检测
    checkOllamaStatus();
  }, [checkOllamaStatus]);

  return {
    status,
    loading,
    checkOllamaStatus,
    isAvailable: status.available,
    isConnected: status.status === 'connected',
    isChecking: status.status === 'checking' || loading
  };
}