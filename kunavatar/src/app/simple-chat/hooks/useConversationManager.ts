'use client';

import { useState, useEffect, useCallback } from 'react';
import { Conversation } from '@/lib/database/types';
import { generateConversationTitle, CreateConversationOptions } from './utils/conversationUtils';

interface UseConversationManagerReturn {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  loading: boolean;
  error: string | null;
  
  // 操作函数
  loadConversations: () => Promise<void>;
  loadConversationsIfNeeded: () => Promise<void>;
  createConversation: (options?: CreateConversationOptions | string, model?: string, agentId?: number) => Promise<string | null>;
  switchConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  updateConversationTitle: (id: string, title: string) => Promise<void>;
  updateConversationModel: (id: string, model: string) => Promise<void>;
  updateConversationAgent: (id: string, agentId: number | null) => Promise<void>;
}

export function useConversationManager(): UseConversationManagerReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedConversations, setHasLoadedConversations] = useState(false);

  // 加载对话列表
  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📋 开始加载对话列表');
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      
      if (data.success) {
        setConversations(data.conversations || []);
        setHasLoadedConversations(true);
        console.log(`✅ 成功加载 ${data.conversations?.length || 0} 个对话`);
      } else {
        setError(data.error || '加载对话列表失败');
      }
    } catch (err) {
      setError('网络错误，加载对话列表失败');
      console.error('加载对话列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 延迟加载对话列表
  const loadConversationsIfNeeded = useCallback(async () => {
    if (!hasLoadedConversations) {
      await loadConversations();
    }
  }, [hasLoadedConversations, loadConversations]);

  // 创建新对话 - 重构：支持不预选模型或智能体，同时保持向后兼容
  const createConversation = useCallback(async (
    options: CreateConversationOptions | string = {},
    model?: string,
    agentId?: number
  ): Promise<string | null> => {
    // 处理向后兼容的参数格式
    let config: CreateConversationOptions;
    if (typeof options === 'string') {
      // 旧的调用方式：createConversation(title, model, agentId)
      config = {
        title: options,
        model: model || null,
        agentId: agentId || null,
        autoSwitch: true,
        updateUrl: true
      };
    } else {
      // 新的调用方式：createConversation(options)
      config = {
        title: options.title || generateConversationTitle(),
        model: options.model || null,
        agentId: options.agentId || null,
        autoSwitch: options.autoSwitch ?? true,
        updateUrl: options.updateUrl ?? true
      };
    }
    try {
      setError(null);
      
      console.log(`📝 [useConversationManager] 开始创建对话: ${config.title}, 模型: ${config.model || '未选择'}, 智能体ID: ${config.agentId || '未选择'}`);
      
      const requestBody = { 
        title: config.title, 
        model: config.model, 
        agent_id: config.agentId 
      };
      console.log('📤 [useConversationManager] 发送的请求体:', JSON.stringify(requestBody, null, 2));

      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ 对话创建成功:`, data.conversation);
        
        // 直接添加到本地列表
        setConversations(prev => [data.conversation, ...prev]);
        
        // 根据配置决定是否自动切换
        if (config.autoSwitch) {
          setCurrentConversation(data.conversation);
          console.log(`✅ 当前对话已设置为新创建的对话`);
        }
        
        setHasLoadedConversations(true);
        
        console.log(`✅ 对话创建完成，ID: ${data.conversation.id}`);
        return data.conversation.id;
      } else {
        console.error(`❌ 创建对话失败:`, data.error);
        setError(data.error || '创建对话失败');
        return null;
      }
    } catch (err) {
      console.error(`❌ 创建对话异常:`, err);
      setError('网络错误，创建对话失败');
      return null;
    }
  }, []);

  // 切换对话
  const switchConversation = useCallback(async (id: string) => {
    try {
      setError(null);
      console.log(`🔄 开始切换到对话 ${id}`);
      
      // 先检查是否已在conversations列表中有此对话的基本信息
      const existingConversation = conversations.find(conv => conv.id === id);
      
      if (existingConversation) {
        console.log(`✅ 使用缓存的对话信息: ${existingConversation.title}`);
        setCurrentConversation(existingConversation);
        return;
      }
      
      // 如果没有缓存，再发起API请求
      console.log(`🌐 从服务器获取对话 ${id} 信息`);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/conversations/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ 成功获取对话 ${id} 信息:`, data.conversation);
        setCurrentConversation(data.conversation);
        
        // 更新conversations列表中的对话信息
        setConversations(prev => {
          const exists = prev.find(conv => conv.id === id);
          if (!exists) {
            return [...prev, data.conversation];
          }
          return prev.map(conv => conv.id === id ? data.conversation : conv);
        });
      } else {
        console.error(`❌ 切换对话 ${id} 失败:`, data.error);
        setError(data.error || '切换对话失败');
        throw new Error(data.error || '切换对话失败');
      }
    } catch (err) {
      console.error(`❌ 切换对话 ${id} 异常:`, err);
      setError('网络错误，切换对话失败');
      throw err;
    }
  }, [conversations]);

  // 删除对话
  const deleteConversation = useCallback(async (id: string) => {
    try {
      setError(null);
      
      if (!confirm('确定要删除这个对话吗？此操作无法撤销。')) {
        return;
      }
      
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 如果删除的是当前对话，清空当前对话
        if (currentConversation?.id === id) {
          setCurrentConversation(null);
        }
        // 从本地列表中移除
        setConversations(prev => prev.filter(conv => conv.id !== id));
        console.log(`✅ 成功删除对话 ${id}`);
      } else {
        setError(data.error || '删除对话失败');
      }
    } catch (err) {
      setError('网络错误，删除对话失败');
      console.error('删除对话失败:', err);
    }
  }, [currentConversation]);

  // 更新对话标题
  const updateConversationTitle = useCallback(async (id: string, title: string) => {
    try {
      setError(null);
      
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ title }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 更新本地状态
        setConversations(prev => 
          prev.map(conv => 
            conv.id === id ? { ...conv, title } : conv
          )
        );
        
        // 如果是当前对话，也更新当前对话状态
        if (currentConversation?.id === id) {
          setCurrentConversation(prev => 
            prev ? { ...prev, title } : null
          );
        }
      } else {
        setError(data.error || '更新对话标题失败');
      }
    } catch (err) {
      setError('网络错误，更新对话标题失败');
      console.error('更新对话标题失败:', err);
    }
  }, [currentConversation]);

  // 更新对话模型
  const updateConversationModel = useCallback(async (id: string, model: string) => {
    try {
      setError(null);
      
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ model }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 更新本地状态
        setConversations(prev => 
          prev.map(conv => 
            conv.id === id ? { ...conv, model } : conv
          )
        );
        
        // 如果是当前对话，也更新当前对话状态
        if (currentConversation?.id === id) {
          setCurrentConversation(prev => 
            prev ? { ...prev, model } : null
          );
        }
      } else {
        setError(data.error || '更新对话模型失败');
      }
    } catch (err) {
      setError('网络错误，更新对话模型失败');
      console.error('更新对话模型失败:', err);
    }
  }, [currentConversation]);

  // 更新对话智能体
  const updateConversationAgent = useCallback(async (id: string, agentId: number | null) => {
    try {
      setError(null);
      
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ agent_id: agentId }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 更新本地状态
        setConversations(prev => 
          prev.map(conv => 
            conv.id === id ? { ...conv, agent_id: agentId } : conv
          )
        );
        
        // 如果是当前对话，也更新当前对话状态
        if (currentConversation?.id === id) {
          setCurrentConversation(prev => 
            prev ? { ...prev, agent_id: agentId } : null
          );
        }
      } else {
        setError(data.error || '更新对话智能体失败');
      }
    } catch (err) {
      setError('网络错误，更新对话智能体失败');
      console.error('更新对话智能体失败:', err);
    }
  }, [currentConversation]);

  return {
    conversations,
    currentConversation,
    loading,
    error,
    
    loadConversations,
    loadConversationsIfNeeded,
    createConversation,
    switchConversation,
    deleteConversation,
    updateConversationTitle,
    updateConversationModel,
    updateConversationAgent,
  };
}