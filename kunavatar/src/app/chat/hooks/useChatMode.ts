import { useState, useCallback, useEffect } from 'react';

export type ChatMode = 'model' | 'agent';

interface Agent {
  id: number;
  name: string;
  description: string | null;
  model_id: number;
  system_prompt: string | null;
  avatar: string | null;
  memory_enabled: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  model: any; 
  servers: any[];
  tools: any[];
}

interface UseChatModeReturn {
  chatMode: ChatMode;
  setChatMode: (mode: ChatMode) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  selectedAgent: Agent | null;
  setSelectedAgent: (agent: Agent | null) => void;
  initializeWithModels: (models: any[]) => void;
  setModeFromConversation: (conversation: any, agents: Agent[]) => void;
}

const STORAGE_KEYS = {
  CHAT_MODE: 'chat-mode',
  SELECTED_MODEL: 'selected-model',
  SELECTED_AGENT: 'selected-agent-id',
  LAST_USED_MODEL: 'last-used-model', // 新增：记录最后使用的模型
};

export function useChatMode(): UseChatModeReturn {
  // 🎯 聊天模式状态
  const [chatMode, setChatModeState] = useState<ChatMode>(() => {
    // 从localStorage恢复模式
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.CHAT_MODE);
      return (saved as ChatMode) || 'model';
    }
    return 'model';
  });

  // 🤖 模型选择状态
  const [selectedModel, setSelectedModelState] = useState<string>(() => {
    // 从localStorage恢复选择的模型
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEYS.SELECTED_MODEL) || '';
    }
    return '';
  });

  // 🧑‍💻 Agent选择状态
  const [selectedAgent, setSelectedAgentState] = useState<Agent | null>(() => {
    // 初始化时不从localStorage恢复，等待agents数据加载完成后再恢复
    // 这样可以避免显示不完整的智能体信息
    return null;
  });

  // 🔄 设置聊天模式并持久化
  const setChatMode = useCallback((mode: ChatMode) => {
    setChatModeState(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.CHAT_MODE, mode);
    }
  }, []);

  // 🎯 设置选择的模型并持久化
  const setSelectedModel = useCallback((model: string) => {
    setSelectedModelState(model);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SELECTED_MODEL, model);
      // 同时更新最后使用的模型
      if (model) {
        localStorage.setItem(STORAGE_KEYS.LAST_USED_MODEL, model);
      }
    }
  }, []);

  // 🤖 设置选择的Agent并持久化
  const setSelectedAgent = useCallback((agent: Agent | null) => {
    setSelectedAgentState(agent);
    if (typeof window !== 'undefined') {
      if (agent) {
        localStorage.setItem(STORAGE_KEYS.SELECTED_AGENT, agent.id.toString());
        console.log('保存智能体ID到localStorage:', agent.id, '键名:', STORAGE_KEYS.SELECTED_AGENT);
      } else {
        localStorage.removeItem(STORAGE_KEYS.SELECTED_AGENT);
        console.log('从localStorage移除智能体ID，键名:', STORAGE_KEYS.SELECTED_AGENT);
      }
    }
  }, []);

  // 🚀 初始化模型选择逻辑
  const initializeWithModels = useCallback((models: any[]) => {
    if (!models || models.length === 0) return;

    // 如果当前没有选择模型，则自动选择
    if (!selectedModel) {
      // 优先级：最后使用的模型 > 最新的模型 > 第一个模型
      let modelToSelect = '';
      
      if (typeof window !== 'undefined') {
        // 1. 尝试获取最后使用的模型
        const lastUsedModel = localStorage.getItem(STORAGE_KEYS.LAST_USED_MODEL);
        if (lastUsedModel && models.some(m => m.base_model === lastUsedModel)) {
          modelToSelect = lastUsedModel;
        }
      }
      
      // 2. 如果没有最后使用的模型，选择最新的模型（按更新时间排序）
      if (!modelToSelect) {
        const sortedModels = [...models].sort((a, b) => {
          const timeA = new Date(a.updated_at || a.created_at).getTime();
          const timeB = new Date(b.updated_at || b.created_at).getTime();
          return timeB - timeA; // 降序，最新的在前
        });
        modelToSelect = sortedModels[0]?.base_model || '';
      }
      
      // 3. 如果还是没有，选择第一个可用的模型
      if (!modelToSelect && models.length > 0) {
        modelToSelect = models[0].base_model;
      }
      
      if (modelToSelect) {
        console.log('自动选择模型:', modelToSelect);
        setSelectedModel(modelToSelect);
      }
    }
  }, [selectedModel, setSelectedModel]);

  // 🔧 模式切换时的逻辑处理
  useEffect(() => {
    if (chatMode === 'model') {
      // 🔥 修复：只有在明确切换到模型模式时才清除Agent选择
      // 避免在页面初始化时误清除已恢复的智能体状态
      const savedChatMode = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.CHAT_MODE) : null;
      
      // 如果当前是模型模式，但localStorage中保存的是智能体模式，说明是页面刷新后的初始化
      // 这种情况下不应该清除智能体选择
      if (savedChatMode === 'agent') {
        console.log('检测到页面刷新后的模式恢复，保持智能体选择状态');
        return;
      }
      
      // 只有在真正切换到模型模式时才清除Agent选择
      if (selectedAgent) {
        console.log('切换到模型模式，清除智能体选择');
        setSelectedAgent(null);
      }
    } else if (chatMode === 'agent') {
      // 🔥 切换到智能体模式时，不再依赖模型选择
      // 智能体模式下完全基于 agent_id 作为优先级
      // 模型信息由智能体关联的模型提供，不需要单独的模型选择
      console.log('切换到智能体模式，优先级基于 agent_id');
    }
  }, [chatMode, selectedAgent, setSelectedAgent]);

  // 🔄 根据对话信息自动设置模式
  const setModeFromConversation = useCallback((conversation: any, agents: Agent[]) => {
    if (!conversation) return;

    console.log('根据对话信息设置模式:', conversation);

    if (conversation.agent_id) {
      // 智能体对话
      console.log('检测到智能体对话，agent_id:', conversation.agent_id);
      
      // 切换到智能体模式
      setChatMode('agent');
      
      // 查找对应的智能体
      const targetAgent = agents.find(agent => agent.id === conversation.agent_id);
      if (targetAgent) {
        console.log('找到对应的智能体:', targetAgent.name);
        setSelectedAgent(targetAgent);
        
        // 设置智能体对应的模型
        if (targetAgent.model?.base_model) {
          setSelectedModel(targetAgent.model.base_model);
          console.log('设置智能体模型:', targetAgent.model.base_model);
        }
      } else {
        console.warn('未找到对应的智能体，ID:', conversation.agent_id);
        // 如果找不到智能体，至少切换到智能体模式
        setSelectedAgent(null);
      }
    } else {
      // 普通模型对话
      console.log('检测到普通模型对话');
      
      // 切换到模型模式
      setChatMode('model');
      
      // 清除智能体选择
      setSelectedAgent(null);
      
      // 设置模型（优先使用对话关联的模型）
      if (conversation.model) {
        setSelectedModel(conversation.model);
        console.log('设置对话模型:', conversation.model);
      }
    }
  }, [setChatMode, setSelectedAgent, setSelectedModel]);

  return {
    chatMode,
    setChatMode,
    selectedModel,
    setSelectedModel,
    selectedAgent,
    setSelectedAgent,
    initializeWithModels,
    setModeFromConversation,
  };
}