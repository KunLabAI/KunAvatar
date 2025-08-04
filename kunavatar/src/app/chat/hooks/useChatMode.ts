import { useState, useCallback, useEffect } from 'react';
import { ChatMode, Agent, STORAGE_KEYS } from '../types';

interface UseChatModeReturn {
  chatMode: ChatMode;
  setChatMode: (mode: ChatMode, isUserAction?: boolean) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  selectedAgent: Agent | null;
  setSelectedAgent: (agent: Agent | null) => void;
  restoreModeFromConversation: (conversation: any, agents: Agent[]) => void;
  isRestoringFromHistory: boolean;
  isUserModeChange: boolean;
}

export function useChatMode(): UseChatModeReturn {
  // 🎯 聊天模式状态 - 默认为模型模式，等待用户手动选择
  const [chatMode, setChatModeState] = useState<ChatMode>('model');

  // 🔒 用户手动切换模式的标识
  const [isUserModeChange, setIsUserModeChange] = useState(false);

  // 🔄 从历史恢复模式的标识
  const [isRestoringFromHistory, setIsRestoringFromHistory] = useState(false);

  // 🤖 模型选择状态
  const [selectedModel, setSelectedModelState] = useState<string>(() => {
    // 默认不选择任何模型，让用户手动选择
    return '';
  });

  // 🧑‍💻 Agent选择状态
  const [selectedAgent, setSelectedAgentState] = useState<Agent | null>(() => {
    // 默认不选择任何智能体，让用户手动选择
    return null;
  });

  // 🔄 设置聊天模式并持久化
  const setChatMode = useCallback((mode: ChatMode, isUserAction: boolean = false) => {
    setChatModeState(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.CHAT_MODE, mode);
    }
    
    // 如果是用户手动切换，设置标识
    if (isUserAction) {
      setIsUserModeChange(true);
      console.log('🔒 用户手动切换模式到:', mode);
      
      // 设置一个短暂的延时后清除标识，防止后续的自动设置被阻止
      setTimeout(() => {
        setIsUserModeChange(false);
        console.log('🔓 清除用户手动切换标识');
      }, 1000);
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



  // 🔄 从对话历史恢复模式（仅用于加载历史对话）
  const restoreModeFromConversation = useCallback((conversation: any, agents: Agent[]) => {
    if (!conversation) return;
    
    console.log('🔄 从对话历史恢复模式:', conversation);
    
    // 设置恢复标识，避免触发对话重置
    setIsRestoringFromHistory(true);
    
    if (conversation.agent_id) {
      // 智能体对话
      const agent = agents.find(a => a.id === conversation.agent_id);
      if (agent) {
        console.log('✅ 恢复智能体模式:', agent.name);
        setChatModeState('agent');
        setSelectedAgentState(agent);
        setSelectedModelState(agent.model.base_model);
        
        // 持久化到localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.CHAT_MODE, 'agent');
          localStorage.setItem(STORAGE_KEYS.SELECTED_AGENT, agent.id.toString());
          localStorage.setItem(STORAGE_KEYS.SELECTED_MODEL, agent.model.base_model);
        }
      } else {
        console.warn('⚠️ 未找到对应的智能体:', conversation.agent_id);
      }
    } else if (conversation.model) {
      // 模型对话
      console.log('✅ 恢复模型模式:', conversation.model);
      setChatModeState('model');
      setSelectedModelState(conversation.model);
      setSelectedAgentState(null);
      
      // 持久化到localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.CHAT_MODE, 'model');
        localStorage.setItem(STORAGE_KEYS.SELECTED_MODEL, conversation.model);
        localStorage.removeItem(STORAGE_KEYS.SELECTED_AGENT);
      }
    } else {
      console.log('⚠️ 对话没有明确的模型或智能体信息，保持当前选择');
    }
    
    // 短暂延时后清除恢复标识
    setTimeout(() => {
      setIsRestoringFromHistory(false);
      console.log('🔓 清除历史恢复标识');
    }, 500);
  }, []);

  return {
    chatMode,
    setChatMode,
    selectedModel,
    setSelectedModel,
    selectedAgent,
    setSelectedAgent,
    restoreModeFromConversation,
    isRestoringFromHistory,
    isUserModeChange,
  };
}