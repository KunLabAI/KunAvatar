'use client';

import { useState, useEffect } from 'react';
import { availableTools, getAllAvailableTools } from '@/lib/tools';
import { Tool } from '@/lib/ollama';

interface UseToolSettingsProps {
  selectedModel: string;
  enableTools: boolean;
  selectedTools: string[];
  onToolsToggle: (enabled: boolean) => void;
  onSelectedToolsChange: (tools: string[]) => void;
}

export function useToolSettings({
  selectedModel,
  enableTools,
  selectedTools,
  onToolsToggle,
  onSelectedToolsChange,
}: UseToolSettingsProps) {
  const [showToolSettings, setShowToolSettings] = useState(false);
  const [modelSupportsTools, setModelSupportsTools] = useState<boolean | null>(null);
  const [isCheckingModel, setIsCheckingModel] = useState(false);
  const [allTools, setAllTools] = useState<Tool[]>(availableTools);

  // 验证模型是否支持工具调用
  const checkModelToolSupport = async (model: string) => {
    if (!model) {
      setModelSupportsTools(null);
      return;
    }
    
    setIsCheckingModel(true);
    setModelSupportsTools(null); // 重置状态
    
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
          testMode: true, // 添加测试模式标识
        }),
      });
      
      if (!response.ok) {
        console.warn(`模型 ${model} 工具支持检测失败: HTTP ${response.status}`);
        setModelSupportsTools(false);
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        setModelSupportsTools(data.supportsTools);
        console.log(`模型 ${model} 工具支持检测结果:`, data.supportsTools);
      } else {
        console.warn(`模型 ${model} 工具支持检测失败:`, data.error);
        setModelSupportsTools(false);
      }
    } catch (error) {
      console.error(`模型 ${model} 工具支持检测异常:`, error);
      setModelSupportsTools(false);
    } finally {
      setIsCheckingModel(false);
    }
  };

  // 加载所有可用工具（包括MCP工具）
  const loadTools = async () => {
    try {
      const tools = await getAllAvailableTools();
      setAllTools(tools);
    } catch (error) {
      console.error('加载工具失败:', error);
      setAllTools(availableTools);
    }
  };

  useEffect(() => {
    loadTools();
  }, []);

  // 当模型改变时检查工具支持
  useEffect(() => {
    if (selectedModel && enableTools) {
      checkModelToolSupport(selectedModel);
    } else {
      setModelSupportsTools(null);
    }
  }, [selectedModel, enableTools]);

  // 处理工具开关切换
  const handleToolsToggle = async () => {
    if (!enableTools) {
      // 开启工具时，先检查模型支持
      if (!selectedModel) {
        alert('请先选择一个模型');
        return;
      }
      
      // 如果还没有检测过模型支持，先进行检测
      if (modelSupportsTools === null) {
        await checkModelToolSupport(selectedModel);
        // 检测完成后再次检查结果
        if (modelSupportsTools === false) {
          alert(`模型 ${selectedModel} 不支持工具调用功能，请选择支持工具调用的模型（如 llama3.1、qwen2.5 等）。`);
          return;
        }
      } else if (modelSupportsTools === false) {
        alert(`模型 ${selectedModel} 不支持工具调用功能，请选择支持工具调用的模型（如 llama3.1、qwen2.5 等）。`);
        return;
      }
    }
    
    onToolsToggle(!enableTools);
    
    // 如果是关闭工具，同时关闭设置面板
    if (enableTools) {
      setShowToolSettings(false);
    }
  };

  // 处理工具选择
  const handleToolSelection = (toolName: string) => {
    const newSelectedTools = selectedTools.includes(toolName)
      ? selectedTools.filter(t => t !== toolName)
      : [...selectedTools, toolName];
    onSelectedToolsChange(newSelectedTools);
  };

  return {
    showToolSettings,
    setShowToolSettings,
    modelSupportsTools,
    isCheckingModel,
    allTools,
    handleToolsToggle,
    handleToolSelection,
  };
} 