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
    
    // 智能体模式下的特殊处理：如果传入的是智能体，直接使用其模型信息
    if (chatMode === 'agent' && selectedAgent?.model) {
      const agentModel = selectedAgent.model;
      // 检查智能体模型的capabilities字段
      const supportsTools = agentModel.capabilities?.includes('tools') || false;
      
      console.log(`智能体模型 ${agentModel.base_model || agentModel.display_name} 工具支持检测结果:`, supportsTools);
      console.log('智能体模型capabilities:', agentModel.capabilities);
      setModelSupportsTools(supportsTools);
      return supportsTools;
    }
    
    // 普通模式：根据模型名称查找对应的模型信息
    const modelInfo = availableModels.find(m => m.base_model === model);
    
    if (!modelInfo) {
      console.warn(`未找到模型 ${model} 的信息，假设不支持工具`);
      console.log('可用模型列表:', availableModels.map(m => m.base_model));
      setModelSupportsTools(false);
      return false;
    }
    
    // 检查capabilities字段是否包含"tools"
    const supportsTools = modelInfo.capabilities?.includes('tools') || false;
    
    console.log(`模型 ${model} 工具支持检测结果:`, supportsTools);
    setModelSupportsTools(supportsTools);
    return supportsTools;
  }, [availableModels, chatMode, selectedAgent]);

  // 处理工具开关切换
  const handleToolsToggle = useCallback((
    setEnableTools: (value: boolean) => void,
    setShowToolPanel?: (value: boolean) => void
  ): boolean => {
    const modeText = chatMode === 'agent' ? '智能体' : '模型';

    // 智能体模式下检查智能体是否存在
    if (chatMode === 'agent') {
      if (!selectedAgent) {
        showWarning?.('提示', `请先选择一个${modeText}`);
        return false;
      }
    } else {
      // 模型模式下检查模型是否存在
      if (!selectedModel) {
        showWarning?.('提示', `请先选择一个${modeText}`);
        return false;
      }
    }

    if (!enableTools) {
      // 开启工具前检查模型支持
      // 在智能体模式下，传入智能体的模型名称；在模型模式下，传入选中的模型名称
      const modelToCheck = chatMode === 'agent' 
        ? selectedAgent?.model?.base_model || selectedAgent?.model?.display_name || ''
        : selectedModel || '';
        
      const supportsTools = checkModelToolSupport(modelToCheck);
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