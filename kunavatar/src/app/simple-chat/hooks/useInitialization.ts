'use client';

import { useEffect, useCallback } from 'react';
import { CustomModel } from '@/lib/database/custom-models';

interface InitializationConfig {
  models: CustomModel[];
  hasMinimumLoadTime: boolean;
  setIsInitializing: (initializing: boolean) => void;
  generateCustomModels: (models: CustomModel[]) => void;
  loadConversationsIfNeeded: () => Promise<void>;
}

interface UseInitializationReturn {
  handleModelChange: (modelName: string, setSelectedModel: Function, conversationId?: string) => void;
}

export function useInitialization(config: InitializationConfig): UseInitializationReturn {
  const {
    models,
    hasMinimumLoadTime,
    setIsInitializing,
    generateCustomModels,
    loadConversationsIfNeeded,
  } = config;

  // 管理初始化状态，平衡加载体验和防闪屏
  useEffect(() => {
    if (models.length > 0 && hasMinimumLoadTime) {
      // 模型已加载且达到最小加载时间，短暂延迟后隐藏加载界面
      const timer = setTimeout(() => {
        setIsInitializing(false);
      }, 100); // 减少延迟时间
      
      return () => clearTimeout(timer);
    } else if (!models.length && hasMinimumLoadTime) {
      // 模型未加载但已达到最小时间，设置最大等待时间
      const timeout = setTimeout(() => {
        setIsInitializing(false);
      }, 1500); // 减少最大等待时间
      
      return () => clearTimeout(timeout);
    }
  }, [models.length, hasMinimumLoadTime, setIsInitializing]);

  // 从CustomModel[]生成customModels显示信息
  useEffect(() => {
    if (models.length > 0) {
      generateCustomModels(models);
    }
  }, [models, generateCustomModels]);

  // 确保侧边栏有对话列表数据
  useEffect(() => {
    // 延迟加载对话列表，避免阻塞页面初始化
    const timer = setTimeout(() => {
      loadConversationsIfNeeded();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [loadConversationsIfNeeded]);

  // 处理模型切换，传递对话ID以保存对话特定的模型选择
  const handleModelChange = useCallback((modelName: string, setSelectedModel: Function, conversationId?: string) => {
    setSelectedModel(modelName, conversationId);
  }, []);

  return {
    handleModelChange,
  };
}