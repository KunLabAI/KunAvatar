'use client';

import { useState, useEffect, useCallback } from 'react';
import { CustomModel } from '@/lib/database/custom-models';
import { formatDatabaseMessages } from './utils/conversationUtils';

interface UseDataTransformReturn {
  customModels: Array<{
    base_model: string;
    display_name: string;
    family?: string;
  }>;
  
  // 操作函数
  updateMessagesFromDatabase: (dbMessages: any[], setMessages: Function, setToolCalls: Function) => void;
  generateCustomModels: (models: CustomModel[]) => void;
}

export function useDataTransform(): UseDataTransformReturn {
  const [customModels, setCustomModels] = useState<Array<{
    base_model: string;
    display_name: string;
    family?: string;
  }>>([]);

  // 从数据库数据更新消息的辅助函数
  const updateMessagesFromDatabase = useCallback((dbMessages: any[], setMessages: Function, setToolCalls: Function) => {
    console.log('🔧 更新消息数据，总数:', dbMessages.length);
    
    // 使用共享的消息格式化函数
    const { formattedMessages, toolCallMessages } = formatDatabaseMessages(dbMessages);
    
    // 检查是否有统计信息
    const hasStats = formattedMessages.some((msg: any) => 
      msg.role === 'assistant' && (msg.total_duration || msg.eval_count)
    );
    console.log('🔧 更新后的消息是否包含统计信息:', hasStats);
    console.log('🔧 更新后的工具调用数量:', toolCallMessages.length);
    
    setMessages(formattedMessages);
    setToolCalls(toolCallMessages);
  }, []);

  // 从CustomModel[]生成customModels显示信息
  const generateCustomModels = useCallback((models: CustomModel[]) => {
    if (models.length > 0) {
      const formattedCustomModels = models.map(model => ({
        base_model: model.base_model,
        display_name: model.display_name, // 使用正确的display_name
        family: model.family,
      }));
      setCustomModels(formattedCustomModels);
      console.log('✅ 生成customModels显示信息:', formattedCustomModels.length, '个模型');
    }
  }, []);

  return {
    customModels,
    updateMessagesFromDatabase,
    generateCustomModels,
  };
}