'use client';

import { useState, useCallback } from 'react';
import { Message, RuntimeToolCall } from '../types';
import { useModelManager } from './useModelManager';

export function useChatMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [expandedThinkingMessages, setExpandedThinkingMessages] = useState<Set<string>>(new Set());
  
  // 注意：智能体相关状态已移至 useAgentManager
  
  // 工具相关状态
  const [enableTools, setEnableTools] = useState(false);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<RuntimeToolCall | null>(null);
  const [toolCalls, setToolCalls] = useState<RuntimeToolCall[]>([]);
  const [currentAssistantMessageId, setCurrentAssistantMessageId] = useState<string | null>(null);
  
  // 添加AbortController来控制请求中断
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // 使用模型管理器
  const { models, selectedModel, setSelectedModel, selectBestModel } = useModelManager();

  // 注意：智能体选择逻辑已移至 useAgentManager，这里保留状态用于向后兼容

  // 思考面板切换
  const toggleThinkingExpand = useCallback((messageId: string) => {
    setExpandedThinkingMessages(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(messageId)) {
        newExpanded.delete(messageId);
      } else {
        newExpanded.add(messageId);
      }
      return newExpanded;
    });
  }, []);

  // 停止生成
  const stopGeneration = useCallback(() => {
    // 中断正在进行的请求
    if (abortController) {
      console.log('🛑 中断正在进行的请求');
      abortController.abort();
      setAbortController(null);
    }
    
    // 重置流式状态
    setIsStreaming(false);
  }, [abortController]);

  return {
    // 消息状态
    messages,
    setMessages,
    inputMessage,
    setInputMessage,
    isStreaming,
    setIsStreaming,
    selectedModel,
    setSelectedModel,
    models,
    expandedThinkingMessages,
    setExpandedThinkingMessages,
    
    // 注意：智能体状态已移至 useAgentManager，这里保留注释用于说明

    // 工具状态
    enableTools,
    setEnableTools,
    selectedTools,
    setSelectedTools,
    activeTool,
    setActiveTool,
    toolCalls,
    setToolCalls,
    currentAssistantMessageId,
    setCurrentAssistantMessageId,
    
    // 方法
    toggleThinkingExpand,
    stopGeneration,
    
    // AbortController
    abortController,
    setAbortController,
    
    // 模型管理相关方法
    selectBestModel,
  };
}