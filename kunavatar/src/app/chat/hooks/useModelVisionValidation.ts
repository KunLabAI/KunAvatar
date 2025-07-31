'use client';

import { useState, useCallback, useEffect } from 'react';

// 定义CustomModel类型
interface CustomModel {
  id: number;
  base_model: string;
  display_name: string;
  capabilities?: string[];
}

export interface ModelVisionValidationParams {
  selectedModel: string | null;
  selectedAgent: any;
  chatMode: 'model' | 'agent';
  availableModels: CustomModel[];
  // 通知函数
  showWarning?: (title: string, message?: string) => void;
  showError?: (title: string, message?: string) => void;
}

export interface ModelVisionValidationState {
  modelSupportsVision: boolean | null;
  isCheckingModel: boolean;
}

export interface ModelVisionValidationActions {
  checkModelVisionSupport: (model: string) => boolean;
  resetValidationState: () => void;
  validateImageUpload: () => boolean;
}

export function useModelVisionValidation({
  selectedModel,
  selectedAgent,
  chatMode,
  availableModels,
  showWarning,
  showError
}: ModelVisionValidationParams): ModelVisionValidationState & ModelVisionValidationActions {
  const [modelSupportsVision, setModelSupportsVision] = useState<boolean | null>(null);
  const [isCheckingModel, setIsCheckingModel] = useState(false);

  // 重置验证状态
  const resetValidationState = useCallback(() => {
    setModelSupportsVision(null);
    setIsCheckingModel(false);
  }, []);

  // 检查模型是否支持多模态（基于capabilities字段中的vision标签）
  const checkModelVisionSupport = useCallback((model: string): boolean => {
    if (!model) {
      console.warn('模型名称为空，跳过多模态支持检测');
      setModelSupportsVision(false);
      return false;
    }
    
    // 根据模型名称查找对应的模型信息
    const modelInfo = availableModels.find(m => m.base_model === model);
    
    if (!modelInfo) {
      console.warn(`未找到模型 ${model} 的信息，假设不支持多模态`);
      setModelSupportsVision(false);
      return false;
    }
    
    // 检查capabilities字段是否包含"vision"
    const supportsVision = modelInfo.capabilities?.includes('vision') || false;
    
    console.log(`模型 ${model} 多模态支持检测结果:`, supportsVision);
    setModelSupportsVision(supportsVision);
    return supportsVision;
  }, [availableModels]);

  // 验证图片上传功能
  const validateImageUpload = useCallback((): boolean => {
    const currentModel = chatMode === 'agent' 
      ? selectedAgent?.model?.base_model 
      : selectedModel;

    const modeText = chatMode === 'agent' ? '智能体' : '模型';

    if (!currentModel) {
      showWarning?.('提示', `请先选择一个${modeText}`);
      return false;
    }

    const supportsVision = checkModelVisionSupport(currentModel);
    if (!supportsVision) {
      showError?.(
        '图片上传不可用', 
        `当前${modeText}不支持多模态功能，请选择支持图片识别的模型（如 llava、bakllava 等）。`
      );
      return false;
    }
    
    console.log(`✅ ${modeText}支持多模态，可以上传图片`);
    return true;
  }, [chatMode, selectedAgent, selectedModel, checkModelVisionSupport, showWarning, showError]);

  // 当模型或智能体切换时重置验证状态
  useEffect(() => {
    resetValidationState();
    
    // 自动检查当前模型的多模态支持
    const currentModel = chatMode === 'agent' 
      ? selectedAgent?.model?.base_model 
      : selectedModel;
      
    if (currentModel) {
      checkModelVisionSupport(currentModel);
    }
  }, [selectedModel, selectedAgent?.model?.base_model, chatMode, checkModelVisionSupport, resetValidationState]);

  return {
    modelSupportsVision,
    isCheckingModel,
    checkModelVisionSupport,
    resetValidationState,
    validateImageUpload
  };
}