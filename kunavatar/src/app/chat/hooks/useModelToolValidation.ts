'use client';

import { useState, useCallback, useEffect } from 'react';

// 定义CustomModel类型
interface CustomModel {
  id: number;
  base_model: string;
  display_name: string;
  capabilities?: string[];
}

export interface ModelToolValidationParams {
  selectedModel: string | null;
  selectedAgent: any;
  chatMode: 'model' | 'agent';
  enableTools: boolean;
  availableModels: CustomModel[];
  // 通知函数
  showWarning?: (title: string, message?: string) => void;
  showError?: (title: string, message?: string) => void;
}

export interface ModelToolValidationState {
  modelSupportsTools: boolean | null;
  isCheckingModel: boolean;
  shouldResetTools: boolean;
}

export interface ModelToolValidationActions {
  checkModelToolSupport: (model: string) => boolean;
  resetValidationState: () => void;
  handleToolsToggle: (
    setEnableTools: (value: boolean) => void,
    setShowToolPanel?: (value: boolean) => void
  ) => boolean;
  clearResetFlag: () => void;
}

export function useModelToolValidation({
  selectedModel,
  selectedAgent,
  chatMode,
  enableTools,
  availableModels,
  showWarning,
  showError
}: ModelToolValidationParams): ModelToolValidationState & ModelToolValidationActions {
  const [modelSupportsTools, setModelSupportsTools] = useState<boolean | null>(null);
  const [isCheckingModel, setIsCheckingModel] = useState(false);
  const [shouldResetTools, setShouldResetTools] = useState(false);

  // 重置验证状态
  const resetValidationState = useCallback(() => {
    setModelSupportsTools(null);
    setIsCheckingModel(false);
    setShouldResetTools(false);
  }, []);

  // 清除重置标志
  const clearResetFlag = useCallback(() => {
    setShouldResetTools(false);
  }, []);

  // 检查模型是否支持工具调用（基于capabilities字段）
  const checkModelToolSupport = useCallback((model: string): boolean => {
    if (!model) {
      console.warn('模型名称为空，跳过工具支持检测');
      setModelSupportsTools(false);
      return false;
    }
    
    // 根据模型名称查找对应的模型信息
    const modelInfo = availableModels.find(m => m.base_model === model);
    
    if (!modelInfo) {
      console.warn(`未找到模型 ${model} 的信息，假设不支持工具`);
      setModelSupportsTools(false);
      return false;
    }
    
    // 检查capabilities字段是否包含"tools"
    const supportsTools = modelInfo.capabilities?.includes('tools') || false;
    
    console.log(`模型 ${model} 工具支持检测结果:`, supportsTools);
    setModelSupportsTools(supportsTools);
    return supportsTools;
  }, [availableModels]);

  // 处理工具开关切换
  const handleToolsToggle = useCallback((
    setEnableTools: (value: boolean) => void,
    setShowToolPanel?: (value: boolean) => void
  ): boolean => {
    const currentModel = chatMode === 'agent' 
      ? selectedAgent?.model?.base_model 
      : selectedModel;

    const modeText = chatMode === 'agent' ? '智能体' : '模型';

    if (!currentModel) {
      showWarning?.('提示', `请先选择一个${modeText}`);
      return false;
    }

    if (!enableTools) {
      // 开启工具前检查模型支持
      const supportsTools = checkModelToolSupport(currentModel);
      if (!supportsTools) {
        showError?.(
          'MCP工具不可用', 
          `当前${modeText}不支持工具调用功能，请选择支持工具调用的模型。`
        );
        return false;
      }
      
      console.log(`✅ ${modeText}支持工具调用，开启工具功能`);
      setEnableTools(true);
      setShowToolPanel?.(true);
      return true;
    } else {
      // 关闭工具
      setEnableTools(false);
      setShowToolPanel?.(false);
      return true;
    }
  }, [chatMode, selectedAgent, selectedModel, enableTools, checkModelToolSupport, showWarning, showError]);

  // 当模型或智能体切换时重置验证状态，并自动检查工具支持
  useEffect(() => {
    resetValidationState();
    
    // 自动检查当前模型的工具支持
    const currentModel = chatMode === 'agent' 
      ? selectedAgent?.model?.base_model 
      : selectedModel;
      
    if (currentModel) {
      // 主动检查新模型的工具支持能力
      const supportsTools = checkModelToolSupport(currentModel);
      
      // 如果工具已开启但新模型不支持工具，需要重置工具状态
      if (enableTools && !supportsTools) {
        setShouldResetTools(true);
        console.log(`🔄 模型 ${currentModel} 不支持工具，需要重置工具状态`);
      }
    } else if (enableTools) {
      // 如果没有选择模型但工具已开启，需要重置工具状态
      setShouldResetTools(true);
      console.log('🔄 未选择模型，需要重置工具状态');
    }
  }, [selectedModel, selectedAgent?.model?.base_model, chatMode, enableTools, checkModelToolSupport, resetValidationState]);

  return {
    modelSupportsTools,
    isCheckingModel,
    shouldResetTools,
    checkModelToolSupport,
    resetValidationState,
    clearResetFlag,
    handleToolsToggle
  };
}