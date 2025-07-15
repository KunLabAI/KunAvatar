'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CustomModel } from '@/lib/database/custom-models';

// 本地存储键名
const SELECTED_MODEL_KEY = 'chat_selected_model';
const CONVERSATION_MODEL_KEY_PREFIX = 'chat_conversation_model_';

interface UseModelManagerReturn {
  models: CustomModel[];
  selectedModel: string;
  setSelectedModel: (modelName: string, conversationId?: string) => void;
  selectBestModel: (
    availableModels: CustomModel[],
    conversationId?: string,
    lastUsedModel?: string,
    conversationModel?: string,
    currentConversation?: any
  ) => string | undefined;
  isAgentMode: boolean;
  
  // 持久化相关函数
  loadSavedModel: () => string | null;
  loadConversationModel: (conversationId: string) => string | null;
  saveModelSelection: (modelName: string, conversationId?: string) => void;
}

export function useModelManager(): UseModelManagerReturn {
  const [models, setModels] = useState<CustomModel[]>([]);
  const [selectedModel, setSelectedModelState] = useState('');
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isAgentMode, setIsAgentMode] = useState(false);
  
  // 使用 ref 来跟踪最新的 selectedModel 值
  const selectedModelRef = useRef(selectedModel);
  
  // 更新 ref 当状态改变时
  useEffect(() => {
    selectedModelRef.current = selectedModel;
  }, [selectedModel]);
  
  // 模型持久化函数 - 整合到 useModelManager 中
  const loadSavedModel = useCallback(() => {
    if (typeof window === 'undefined') return null;
    try {
      const savedModel = localStorage.getItem(SELECTED_MODEL_KEY);
      return savedModel;
    } catch (error) {
      console.warn('无法从localStorage读取保存的模型:', error);
      return null;
    }
  }, []);

  const loadConversationModel = useCallback((conversationId: string) => {
    if (typeof window === 'undefined') return null;
    try {
      const key = `${CONVERSATION_MODEL_KEY_PREFIX}${conversationId}`;
      const savedModel = localStorage.getItem(key);
      return savedModel;
    } catch (error) {
      console.warn('无法从localStorage读取对话模型:', error);
      return null;
    }
  }, []);

  const saveModelSelection = useCallback((modelName: string, conversationId?: string) => {
    if (typeof window === 'undefined') return;
    try {
      // 保存全局模型选择
      localStorage.setItem(SELECTED_MODEL_KEY, modelName);
      
      // 如果有对话ID，也保存对话特定的模型选择
      if (conversationId) {
        const key = `${CONVERSATION_MODEL_KEY_PREFIX}${conversationId}`;
        localStorage.setItem(key, modelName);
        console.log(`保存对话 ${conversationId} 的模型选择: ${modelName}`);
      }
    } catch (error) {
      console.warn('无法保存模型选择到localStorage:', error);
    }
  }, []);

  // 检测智能体模式 - 支持传入对话信息
  const checkAgentMode = useCallback((currentConversation?: any) => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const hasAgentParam = urlParams.get('agent');
      const hasConversationAgent = currentConversation?.agent_id;
      const newIsAgentMode = !!hasAgentParam || !!hasConversationAgent;
      if (newIsAgentMode !== isAgentMode) {
        setIsAgentMode(newIsAgentMode);
        console.log(`🔄 智能体模式状态更新: ${isAgentMode} -> ${newIsAgentMode} (URL参数: ${!!hasAgentParam}, 对话智能体ID: ${hasConversationAgent})`);
      }
      return newIsAgentMode;
    }
    return false;
  }, [isAgentMode]);

  // 包装setSelectedModel以添加持久化
  const setSelectedModelWithPersistence = useCallback((modelName: string, conversationId?: string) => {
    const currentIsAgentMode = checkAgentMode();
    console.log(`🎯 useModelManager.setSelectedModel 被调用: ${modelName}, 对话ID: ${conversationId}, 智能体模式: ${currentIsAgentMode}, 时间戳: ${Date.now()}`);
    console.log(`🔍 设置前 selectedModel 状态:`, selectedModelRef.current);
    setSelectedModelState(modelName);
    console.log(`🔍 setSelectedModelState 调用完成，期望值: ${modelName}`);
    saveModelSelection(modelName, conversationId);
    console.log(`✅ useModelManager.setSelectedModel 完成: ${modelName}`);
    
    // 验证状态更新 - 使用 ref 获取最新值
    setTimeout(() => {
      console.log(`🔍 延迟检查 useModelManager selectedModel 状态:`, selectedModelRef.current);
    }, 50);
  }, [saveModelSelection, checkAgentMode]);

  // 智能模型选择函数 - 在智能体模式下允许恢复历史模型
  const selectBestModel = useCallback((
    availableModels: CustomModel[],
    conversationId?: string,
    lastUsedModel?: string,
    conversationModel?: string,
    currentConversation?: any
  ) => {
    const currentIsAgentMode = checkAgentMode(currentConversation);
    
    // 在智能体模式下，如果有历史对话模型，自动恢复
    if (currentIsAgentMode && conversationModel && conversationId) {
      console.log(`🤖 智能体模式：自动恢复对话 ${conversationId} 的历史模型: ${conversationModel}`);
      setSelectedModelWithPersistence(conversationModel, conversationId);
      return conversationModel;
    }
    
    // 非智能体模式下，新对话保持空状态
    if (!currentIsAgentMode) {
      console.log('🚫 非智能体模式：自动模型选择已禁用，新对话保持空状态');
      if (conversationModel) {
        console.log(`💡 该对话历史使用模型: ${conversationModel}，但不会自动设置`);
      }
    }
    
    return undefined;
  }, [saveModelSelection, checkAgentMode, setSelectedModelWithPersistence]);

  // 获取模型但不自动选择
  useEffect(() => {
    const fetchModels = async () => {
      try {
        console.log('🔄 开始加载模型列表');
        const token = localStorage.getItem('accessToken');
        const response = await fetch('/api/custom-models', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.models) {
            setModels(data.models);
            console.log(`✅ 模型列表已加载，新对话保持空状态`);
            setHasInitialized(true);
          }
        }
      } catch (err) {
        console.error('❌ 获取模型失败:', err);
      }
    };
    
    if (!hasInitialized) {
      fetchModels();
    }
  }, [hasInitialized]);

  return {
    models,
    selectedModel,
    setSelectedModel: setSelectedModelWithPersistence,
    selectBestModel,
    isAgentMode,
    
    // 持久化相关函数
    loadSavedModel,
    loadConversationModel,
    saveModelSelection,
  };
}