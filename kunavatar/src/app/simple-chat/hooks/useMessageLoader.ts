'use client';

import { useEffect, useCallback, useRef } from 'react';
import { CustomModel } from '@/lib/database/custom-models';
import { formatDatabaseMessages, isAgentMode } from './utils/conversationUtils';

interface UseMessageLoaderProps {
  currentConversation: any;
  setSelectedModel: (model: string, conversationId?: string) => void;
  setMessages: (messages: any[]) => void;
  setToolCalls: (toolCalls: any[]) => void;
  selectedModel?: string; // 当前选择的模型
  models?: CustomModel[]; // 可用模型列表
  selectBestModel?: (
    availableModels: CustomModel[],
    conversationId?: string,
    lastUsedModel?: string,
    conversationModel?: string,
    currentConversation?: any
  ) => string | undefined; // 智能模型选择函数
}

export function useMessageLoader({
  currentConversation,
  setSelectedModel,
  setMessages,
  setToolCalls,
  selectedModel,
  models,
  selectBestModel,
}: UseMessageLoaderProps) {
  // 使用ref来稳定函数引用，避免useEffect重复触发
  const selectBestModelRef = useRef(selectBestModel);
  const modelsRef = useRef(models);
  
  // 更新ref的值
  selectBestModelRef.current = selectBestModel;
  modelsRef.current = models;

  // 加载对话消息历史 - 优化：添加缓存和重试机制
  const loadConversationMessages = useCallback(async (conversationId: string, retryCount = 0) => {
    try {
      console.log(`🔄 加载对话 ${conversationId} 的消息 (尝试 ${retryCount + 1})`);

      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/conversations/${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('对话不存在 (404)');
        }
        throw new Error(`加载对话失败: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.messages) {
        // 使用共享的消息格式化函数
        const { formattedMessages, toolCallMessages } = formatDatabaseMessages(data.messages);
        
        console.log(`✅ 成功加载对话 ${conversationId} 的 ${formattedMessages.length} 条消息`);
        setMessages(formattedMessages);
        setToolCalls(toolCallMessages);
        
        // 返回对话中最后使用的模型
        return data.lastModel;
      } else {
        console.log(`⚠️ 对话 ${conversationId} 没有消息数据`);
        setMessages([]);
        setToolCalls([]);
        return null;
      }
    } catch (err) {
      console.error('加载对话消息失败:', err);
      throw new Error('加载对话消息失败');
    }
  }, [setMessages, setToolCalls]);

  // 当切换对话时，加载对话的消息历史
  useEffect(() => {
    if (currentConversation) {
      // 清空当前消息和工具调用
      setMessages([]);
      setToolCalls([]);
      
      // 加载对话消息
      loadConversationMessages(currentConversation.id)
        .then(lastUsedModel => {
          console.log(`对话 ${currentConversation.id} 消息已加载`);
          
          // 🔥 移除冲突逻辑：智能体模式的模型恢复完全由 useAgentManager 负责
          // 只在非智能体模式下才处理模型恢复
          if (!isAgentMode(currentConversation) && currentConversation.model && selectBestModelRef.current && modelsRef.current) {
            console.log(`🎯 非智能体模式：尝试恢复对话历史模型: ${currentConversation.model}`);
            selectBestModelRef.current(modelsRef.current, currentConversation.id, lastUsedModel, currentConversation.model, currentConversation);
          } else if (isAgentMode(currentConversation)) {
            console.log(`🤖 智能体模式检测到，模型恢复由 useAgentManager 负责处理`);
          } else {
            console.log(`对话 ${currentConversation.id} 消息已加载，需要手动选择模型或智能体`);
          }
        })
        .catch(error => {
          console.error('加载消息失败:', error);
        });
    } else {
      setMessages([]);
      setToolCalls([]);
    }
  }, [currentConversation?.id, loadConversationMessages, setMessages, setToolCalls]); // 只依赖对话ID变化，避免函数引用变化导致的重复触发

  return {
    loadConversationMessages,
  };
}