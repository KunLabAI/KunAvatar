'use client';

import { useState, useCallback } from 'react';
import { CustomModel } from '@/lib/database/custom-models';

export interface UseModelToolValidationProps {
  availableModels: CustomModel[];
  selectedModelId: number | null;
  hasSelectedTools: boolean;
}

export function useModelToolValidation({
  availableModels,
  selectedModelId,
  hasSelectedTools,
}: UseModelToolValidationProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message?: string;
  } | null>(null);

  // 检查模型是否支持工具调用
  const checkModelToolSupport = useCallback(async (modelName: string): Promise<boolean> => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: 'user', content: 'test' }],
          enableTools: true,
          testMode: true, // 添加测试模式标识
        }),
      });
      
      if (!response.ok) {
        console.warn(`模型 ${modelName} 工具支持检测失败: HTTP ${response.status}`);
        return false;
      }
      
      const data = await response.json();
      if (data.success) {
        console.log(`模型 ${modelName} 工具支持检测结果:`, data.supportsTools);
        return data.supportsTools;
      } else {
        console.warn(`模型 ${modelName} 工具支持检测失败:`, data.error);
        return false;
      }
    } catch (error) {
      console.error(`模型 ${modelName} 工具支持检测异常:`, error);
      return false;
    }
  }, []);

  // 验证模型工具支持
  const validateModelToolConfiguration = useCallback(async (): Promise<{
    isValid: boolean;
    message?: string;
  }> => {
    // 如果没有选择模型，返回无效
    if (!selectedModelId) {
      return {
        isValid: false,
        message: '请选择一个模型'
      };
    }

    // 找到选中的模型
    const selectedModel = availableModels.find(m => m.id === selectedModelId);
    if (!selectedModel) {
      return {
        isValid: false,
        message: '所选模型不存在'
      };
    }

    setIsValidating(true);
    
    try {
      const supportsTools = await checkModelToolSupport(selectedModel.base_model);
      
      if (!supportsTools) {
        return {
          isValid: false,
          message: hasSelectedTools 
            ? `模型 ${selectedModel.display_name || selectedModel.base_model} 不支持工具调用功能，请选择支持工具调用的模型（如 llama3.1、qwen2.5 等）或移除已选择的工具。`
            : `模型 ${selectedModel.display_name || selectedModel.base_model} 不支持工具调用功能。如需使用工具，请选择支持工具调用的模型（如 llama3.1、qwen2.5 等）。`
        };
      }
      
      return {
        isValid: true,
        message: hasSelectedTools 
          ? undefined
          : '该模型支持工具调用功能，您可以为此智能体配置工具。'
      };
    } catch (error) {
      return {
        isValid: false,
        message: '模型工具支持检测失败，请稍后重试'
      };
    } finally {
      setIsValidating(false);
    }
  }, [selectedModelId, hasSelectedTools, availableModels, checkModelToolSupport]);

  // 执行验证并更新状态
  const performValidation = useCallback(async () => {
    const result = await validateModelToolConfiguration();
    setValidationResult(result);
    return result;
  }, [validateModelToolConfiguration]);

  // 清除验证结果
  const clearValidation = useCallback(() => {
    setValidationResult(null);
  }, []);

  return {
    isValidating,
    validationResult,
    performValidation,
    clearValidation,
    checkModelToolSupport,
  };
}