'use client';

import { useState, useCallback, useEffect } from 'react';

export interface ModelToolValidationParams {
  selectedModel: string | null;
  selectedAgent: any;
  chatMode: 'model' | 'agent';
  enableTools: boolean;
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
  checkModelToolSupport: (model: string) => Promise<boolean>;
  resetValidationState: () => void;
  handleToolsToggle: (
    setEnableTools: (value: boolean) => void,
    setShowToolPanel?: (value: boolean) => void
  ) => Promise<boolean>;
  clearResetFlag: () => void;
}

export function useModelToolValidation({
  selectedModel,
  selectedAgent,
  chatMode,
  enableTools,
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

  // 检查模型是否支持工具调用（简化版本，不显示复杂提示）
  const checkModelToolSupport = useCallback(async (model: string): Promise<boolean> => {
    if (!model) {
      console.warn('模型名称为空，跳过工具支持检测');
      setModelSupportsTools(false);
      return false;
    }
    
    setIsCheckingModel(true);
    setModelSupportsTools(null);
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: 'test' }],
          enableTools: true,
          testMode: true,
        }),
      });
      
      if (!response.ok) {
        console.warn(`模型 ${model} 工具支持检测失败: HTTP ${response.status}`);
        setModelSupportsTools(false);
        return false;
      }
      
      const data = await response.json();
      if (data.success) {
        setModelSupportsTools(data.supportsTools);
        console.log(`模型 ${model} 工具支持检测结果:`, data.supportsTools);
        return data.supportsTools;
      } else {
        console.warn(`模型 ${model} 工具支持检测失败:`, data.error);
        setModelSupportsTools(false);
        return false;
      }
    } catch (error) {
      console.error(`模型 ${model} 工具支持检测异常:`, error);
      setModelSupportsTools(false);
      return false;
    } finally {
      setIsCheckingModel(false);
    }
  }, []);

  // 处理工具开关切换
  const handleToolsToggle = useCallback(async (
    setEnableTools: (value: boolean) => void,
    setShowToolPanel?: (value: boolean) => void
  ): Promise<boolean> => {
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
      const supportsTools = await checkModelToolSupport(currentModel);
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

  // 当模型或智能体切换时重置验证状态，并检查是否需要重置工具
  useEffect(() => {
    resetValidationState();
    
    // 如果工具已开启，需要检查新模型是否支持工具
    if (enableTools) {
      const currentModel = chatMode === 'agent' 
        ? selectedAgent?.model?.base_model 
        : selectedModel;
        
      if (!currentModel) {
        // 如果没有选择模型，需要重置工具状态
        setShouldResetTools(true);
        console.log('🔄 未选择模型，需要重置工具状态');
      } else {
        // 有模型时，异步检查支持性
        const checkAndReset = async () => {
          const supportsTools = await checkModelToolSupport(currentModel);
          if (!supportsTools) {
            setShouldResetTools(true);
            console.log(`🔄 模型 ${currentModel} 不支持工具，需要重置工具状态`);
          }
        };
        checkAndReset();
      }
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