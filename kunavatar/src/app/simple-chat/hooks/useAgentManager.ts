'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { AgentWithRelations } from '../../agents/types';
import { isAgentMode } from './utils/conversationUtils';

type SelectorMode = 'model' | 'agent';

interface UseAgentManagerProps {
  setSelectedModel?: (model: string, conversationId?: string) => void;
  setEnableTools?: (enable: boolean) => void;
  setSelectedTools?: (tools: string[]) => void;
  setSystemPrompt?: (prompt: string | null) => void;
  currentConversation?: any;
}

interface UseAgentManagerReturn {
  agents: AgentWithRelations[];
  selectedAgentId: number | null;
  selectedAgent: AgentWithRelations | null;
  selectorMode: SelectorMode;
  loading: boolean;
  error: string | null;
  
  // 操作函数
  selectAgent: (agentId: number | null, conversationId?: string) => Promise<void>;
  setSelectorMode: (mode: SelectorMode) => void;
  loadAgents: () => Promise<void>;
  
  // URL 处理相关
  processUrlAgentParam: () => void;
}

export function useAgentManager({
  setSelectedModel,
  setEnableTools,
  setSelectedTools,
  setSystemPrompt,
  currentConversation,
}: UseAgentManagerProps = {}): UseAgentManagerReturn {
  const searchParams = useSearchParams();
  const [agents, setAgents] = useState<AgentWithRelations[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentWithRelations | null>(null);
  
  // 使用惰性初始化避免重复检测URL参数
  const [selectorMode, setSelectorMode] = useState<SelectorMode>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const hasAgentParam = urlParams.get('agent');
      if (hasAgentParam) {
        console.log('🤖 检测到智能体参数，初始化选择器模式为agent');
        return 'agent';
      }
    }
    return 'model';
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 使用 ref 跟踪已处理的智能体参数，避免重复处理
  const processedAgentIdRef = useRef<number | null>(null);

  // 加载Agents列表
  const loadAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🤖 开始加载智能体列表');
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/agents', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const agents: AgentWithRelations[] = await response.json();
        setAgents(agents);
        console.log(`✅ 成功加载 ${agents.length} 个智能体`);
      } else {
        throw new Error('加载智能体列表失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载智能体失败';
      setError(errorMessage);
      console.error('❌ 加载智能体失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 智能体选择核心函数 - 统一处理智能体选择逻辑
  const selectAgent = useCallback(async (agentId: number | null, conversationId?: string) => {
    console.log(`🚀 selectAgent 被调用: agentId=${agentId}, conversationId=${conversationId}`);
    
    if (agentId === null) {
      setSelectedAgent(null);
      setSelectedAgentId(null);
      if (setSystemPrompt) setSystemPrompt(null);
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/agents/${agentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch agent details');
      }
      const agent: AgentWithRelations = await response.json();
      
      // 更新智能体相关状态
      setSelectedAgent(agent);
      setSelectedAgentId(agentId);
      
      // 智能体选择时自动设置关联的模型
      const agentModel = agent.model.base_model;
      console.log(`🤖 智能体 "${agent.name}" 已选择，设置模型: ${agentModel}`);
      
      if (setSelectedModel) {
        setSelectedModel(agentModel, conversationId);
        console.log(`✅ 智能体模型设置完成: ${agentModel}，对话ID: ${conversationId}`);
      }
      
      // 设置工具相关状态
      if (setEnableTools) setEnableTools(agent.tools.length > 0);
      if (setSelectedTools) setSelectedTools(agent.tools.map(t => t.name));
      
      // 设置系统提示
      if (setSystemPrompt) {
        setSystemPrompt(agent.system_prompt || null);
      }
      
      console.log(`🤖 Agent "${agent.name}" selected. Model set to "${agent.model.base_model}".`);
    } catch (error) {
      console.error('Error selecting agent:', error);
      setSelectedAgent(null);
      setSelectedAgentId(null);
    }
  }, [setSelectedModel, setEnableTools, setSelectedTools, setSystemPrompt]);



  // URL 智能体参数处理函数
  const processUrlAgentParam = useCallback(() => {
    const agentParam = searchParams.get('agent');
    
    // 只在有智能体参数时才输出调试信息
    if (agentParam && agents.length > 0) {
      console.log('🔍 处理URL智能体参数 - agentParam:', agentParam, 'agents.length:', agents.length);
      const agentId = parseInt(agentParam);
      const agentExists = agents.some(agent => agent.id === agentId);
      console.log('🔍 智能体检查 - agentId:', agentId, 'agentExists:', agentExists, 'processedAgentIdRef.current:', processedAgentIdRef.current);
      
      // 使用ref来避免重复处理同一个智能体
      if (agentExists && processedAgentIdRef.current !== agentId) {
        console.log('🤖 智能体加载完成，立即处理URL智能体参数:', agentId);
        processedAgentIdRef.current = agentId;
        
        // 立即设置选择器模式为智能体模式，确保UI显示正确
        setSelectorMode('agent');
        setSelectedAgentId(agentId);
        
        // 立即调用selectAgent来加载智能体的完整配置
        const conversationIdForAgent = currentConversation?.id;
        console.log('🔄 立即加载智能体配置，对话ID:', conversationIdForAgent);
        
        selectAgent(agentId, conversationIdForAgent).then(() => {
          console.log('✅ 智能体选择完成');
        }).catch(error => {
          console.error('从URL加载智能体配置失败:', error);
        });
      }
    }
  }, [searchParams, agents, currentConversation, selectAgent]);

  // 从对话记录恢复智能体状态
  const processConversationAgent = useCallback(() => {
    // 如果当前对话有 agent_id，且智能体列表已加载
    if (currentConversation?.agent_id && agents.length > 0) {
      const agentId = currentConversation.agent_id;
      const agentExists = agents.some(agent => agent.id === agentId);
      
      // 只有当前未选择智能体或选择的智能体不匹配时才处理
      if (agentExists && selectedAgentId !== agentId) {
        console.log('🔄 从对话记录恢复智能体状态:', agentId, '对话ID:', currentConversation.id);
        
        // 设置选择器模式为智能体模式
        setSelectorMode('agent');
        
        // 选择对应的智能体
        selectAgent(agentId, currentConversation.id).then(() => {
          console.log('✅ 从对话记录恢复智能体状态完成');
        }).catch(error => {
          console.error('从对话记录恢复智能体状态失败:', error);
        });
      }
    } else if (currentConversation && !currentConversation.agent_id && selectedAgentId !== null) {
      // 🔥 修复：只有在明确是已存在的对话且没有智能体时才清空状态
      // 避免在新建对话过程中错误清空智能体选择
      const isExistingConversation = currentConversation.created_at && 
        new Date(currentConversation.created_at).getTime() < Date.now() - 5000; // 5秒前创建的对话
      
      if (isExistingConversation) {
        console.log('🔄 已存在的对话无智能体，清空智能体状态');
        setSelectedAgent(null);
        setSelectedAgentId(null);
        setSelectorMode('model');
      } else {
        console.log('🤖 新建对话中，保持当前智能体选择状态');
      }
    }
  }, [currentConversation, agents, selectedAgentId, selectAgent]);

  // 初始化时加载Agents
  useEffect(() => {
    loadAgents();
  }, [loadAgents]);
  
  // 当智能体列表加载完成时，处理URL参数
  useEffect(() => {
    if (agents.length > 0) {
      processUrlAgentParam();
    }
  }, [agents, processUrlAgentParam]);

  // 当对话切换时，恢复智能体状态
  useEffect(() => {
    if (agents.length > 0 && currentConversation) {
      processConversationAgent();
    }
  }, [agents, currentConversation, processConversationAgent]);

  return {
    agents,
    selectedAgentId,
    selectedAgent,
    selectorMode,
    loading,
    error,
    selectAgent,
    setSelectorMode,
    loadAgents,
    processUrlAgentParam,
  };
}