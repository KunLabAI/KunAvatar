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