'use client';

import { useState, useCallback, useRef } from 'react';
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
    modelId?: number; // 添加模型ID用于缓存验证
    supportsTools?: boolean; // 添加工具支持标识
  } | null>(null);

  // 验证结果缓存
  const validationCache = useRef<Map<string, { isValid: boolean; message?: string }>>(new Map());

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
    modelId?: number;
    supportsTools?: boolean;
  }> => {
    // 如果没有选择模型，返回无效
    if (!selectedModelId) {
      return {
        isValid: false,
        message: '请选择一个模型',
        supportsTools: false
      };
    }

    // 找到选中的模型
    const selectedModel = availableModels.find(m => m.id === selectedModelId);
    if (!selectedModel) {
      return {
        isValid: false,
        message: '所选模型不存在',
        supportsTools: false
      };
    }

    // 检查缓存
    const cacheKey = selectedModel.base_model;
    const cachedResult = validationCache.current.get(cacheKey);
    if (cachedResult) {
      console.log(`使用缓存的验证结果: ${cacheKey}`, cachedResult);
      return {
        ...cachedResult,
        modelId: selectedModelId,
        supportsTools: cachedResult.isValid,
        message: cachedResult.isValid 
          ? (hasSelectedTools 
              ? undefined
              : '该模型支持工具调用功能')
          : (hasSelectedTools 
              ? `模型 ${selectedModel.display_name || selectedModel.base_model} 不支持工具调用功能。`
              : `模型 ${selectedModel.display_name || selectedModel.base_model} 不支持工具调用功能。`)
      };
    }

    setIsValidating(true);
    
    try {
      const supportsTools = await checkModelToolSupport(selectedModel.base_model);
      
      // 缓存验证结果
      const cacheResult = { isValid: supportsTools };
      validationCache.current.set(cacheKey, cacheResult);
      
      if (!supportsTools) {
        return {
          isValid: false,
          modelId: selectedModelId,
          supportsTools: false,
          message: hasSelectedTools 
            ? `模型 ${selectedModel.display_name || selectedModel.base_model} 不支持工具调用功能，请选择支持工具调用的模型（如 llama3.1、qwen2.5 等）或移除已选择的工具。`
            : `模型 ${selectedModel.display_name || selectedModel.base_model} 不支持工具调用功能。如需使用工具，请选择支持工具调用的模型（如 llama3.1、qwen2.5 等）。`
        };
      }
      
      return {
        isValid: true,
        modelId: selectedModelId,
        supportsTools: true,
        message: hasSelectedTools 
          ? undefined
          : '该模型支持工具调用功能'
      };
    } catch (error) {
      return {
        isValid: false,
        modelId: selectedModelId,
        supportsTools: false,
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

  // 检查当前模型是否已验证过且支持工具
  const isModelValidated = useCallback(() => {
    if (!selectedModelId || !validationResult || validationResult.modelId !== selectedModelId) {
      return false;
    }
    return validationResult.isValid;
  }, [selectedModelId, validationResult]);

  return {
    isValidating,
    validationResult,
    performValidation,
    clearValidation,
    checkModelToolSupport,
    isModelValidated, // 新增：检查模型是否已验证
  };
}