'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
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

  // 检查模型是否支持工具调用（基于capabilities字段）
  const checkModelToolSupport = useCallback((modelId: number): boolean => {
    const model = availableModels.find(m => m.id === modelId);
    if (!model) {
      console.warn(`模型ID ${modelId} 不存在`);
      return false;
    }
    
    // 检查capabilities字段是否包含"tools"
    const supportsTools = model.capabilities?.includes('tools') || false;
    console.log(`模型 ${model.display_name || model.base_model} 工具支持检测结果:`, supportsTools, '(基于capabilities字段)');
    return supportsTools;
  }, [availableModels]);

  // 验证模型工具支持
  const validateModelToolConfiguration = useCallback((): {
    isValid: boolean;
    message?: string;
    modelId?: number;
    supportsTools?: boolean;
  } => {
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

    // 基于capabilities字段检查工具支持
    const supportsTools = checkModelToolSupport(selectedModelId);
    
    // 缓存验证结果
    const cacheResult = { isValid: supportsTools };
    validationCache.current.set(cacheKey, cacheResult);
    
    if (!supportsTools) {
      return {
        isValid: false,
        modelId: selectedModelId,
        supportsTools: false,
        message: hasSelectedTools 
          ? `模型 ${selectedModel.display_name || selectedModel.base_model} 不支持工具调用功能。`
          : `模型 ${selectedModel.display_name || selectedModel.base_model} 不支持工具调用功能。`
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
  }, [selectedModelId, hasSelectedTools, availableModels, checkModelToolSupport]);

  // 当选择的模型发生变化时，自动执行验证
  useEffect(() => {
    if (selectedModelId) {
      const result = validateModelToolConfiguration();
      setValidationResult(result);
    } else {
      // 如果没有选择模型，清除验证结果
      setValidationResult(null);
    }
  }, [selectedModelId, validateModelToolConfiguration]);

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
    clearValidation,
    checkModelToolSupport,
    isModelValidated, // 新增：检查模型是否已验证
  };
}