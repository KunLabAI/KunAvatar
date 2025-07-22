'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PageLoading, InlineLoading } from '@/components/Loading';
import { AgentWithRelations } from './types';
import AgentList from './components/AgentList';
import AgentFormModal from './components/AgentFormModal';
import { AgentMemoryModal } from './components/AgentMemoryModal';
import { motion } from 'framer-motion';
import { useNotification } from '@/components/notification';
import Modal from '@/components/Modal';
import { Sidebar } from '../Sidebar';
import { CustomModel } from '@/lib/database/custom-models';
import { McpServer, McpTool } from '@/lib/database';
import { useConversations } from '@/hooks/useConversations';
import { ProtectedRoute } from '@/components/ProtectedRoute';


function AgentsPageContent() {
  const router = useRouter();
  const [agents, setAgents] = useState<AgentWithRelations[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentWithRelations | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<AgentWithRelations | null>(null);
  const [memoryModalOpen, setMemoryModalOpen] = useState(false);
  const [memoryAgent, setMemoryAgent] = useState<AgentWithRelations | null>(null);

  // State for modal data
  const [availableModels, setAvailableModels] = useState<CustomModel[]>([]);
  const [availableServers, setAvailableServers] = useState<McpServer[]>([]);
  const [allAvailableTools, setAllAvailableTools] = useState<McpTool[]>([]);
  const [isModalDataLoading, setIsModalDataLoading] = useState<boolean>(false);

  // 使用新的通知系统
  const notification = useNotification();

  // 获取对话数据用于侧边栏
  const { conversations } = useConversations();
  


  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/agents');
      if (!response.ok) {
        throw new Error('加载智能体失败');
      }
      const data = await response.json();
      setAgents(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载智能体时发生未知错误';
      setError(message);
      notification.error('加载失败', message);
    } finally {
      setLoading(false);
    }
  }, [notification]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const prepareAndOpenModal = async (agent: AgentWithRelations | null) => {
    setSelectedAgent(agent);
    setIsModalDataLoading(true);

    try {
      const token = localStorage.getItem('accessToken');
      const [modelsRes, serversRes, toolsRes] = await Promise.all([
        fetch('/api/custom-models', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/mcp/servers?enabled=true'),
        fetch('/api/mcp/tools?available=true')
      ]);

      if (!modelsRes.ok || !serversRes.ok || !toolsRes.ok) {
        throw new Error('加载表单数据失败');
      }

      const modelsData = await modelsRes.json();
      const serversData = await serversRes.json();
      const toolsData = await toolsRes.json();

      setAvailableModels(modelsData.models || []);
      setAvailableServers(serversData.servers || []);
      setAllAvailableTools(toolsData.tools || []);

      // 数据加载完成后再打开弹窗
      setIsModalOpen(true);

    } catch (err) {
      const message = err instanceof Error ? err.message : '无法打开智能体编辑器';
      setError(message);
      notification.error('操作失败', message);
    } finally {
      setIsModalDataLoading(false);
    }
  };

  const handleCreate = () => {
    prepareAndOpenModal(null);
  };

  const handleEdit = (agent: AgentWithRelations) => {
    prepareAndOpenModal(agent);
  };

  const handleDelete = (agentId: number) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;
    setAgentToDelete(agent);
    setDeleteModalOpen(true);
  };

  const confirmDeleteAgent = async () => {
    if (!agentToDelete) return;
    
    try {
      setIsProcessing(true);
      const response = await fetch(`/api/agents/${agentToDelete.id}`, { 
        method: 'DELETE' 
      });
      
      if (!response.ok) {
        throw new Error('删除智能体失败');
      }
      
      await fetchAgents();
      notification.success('删除成功', `智能体 "${agentToDelete.name}" 已删除`);
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除智能体失败';
      setError(message);
      notification.error('删除失败', message);
    } finally {
      setIsProcessing(false);
      setDeleteModalOpen(false);
      setAgentToDelete(null);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedAgent(null);
  };

  const handleModalSave = () => {
    handleModalClose();
    fetchAgents();
    notification.success(
      selectedAgent ? '更新成功' : '创建成功',
      selectedAgent ? '智能体已更新' : '新智能体已创建'
    );
  };

  const handleStartChat = (agent: AgentWithRelations) => {
    // 简化跳转逻辑：只传递智能体ID，让聊天页面自动处理模型选择
    router.push(`/simple-chat?new=true&agent=${agent.id}`);
  };

  const handleShowMemory = (agent: AgentWithRelations) => {
    setMemoryAgent(agent);
    setMemoryModalOpen(true);
  };

  const handleCloseMemoryModal = () => {
    setMemoryModalOpen(false);
    setMemoryAgent(null);
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-theme-background">
        <Sidebar
          conversations={conversations}
        />
        <div className="flex-1 overflow-auto">
          <PageLoading 
            text="正在加载智能体..." 
            fullScreen={true}
          />
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-theme-background">
      {/* 侧边栏 */}
      <Sidebar
        conversations={conversations}
      />
      
      {/* 主内容区域 */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        <div className="min-h-screen bg-theme-background transition-all duration-300">
          {/* 页面头部 - 主标题副标题+操作区 */}
          <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <div className="mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="page-title">
                      智能体管理
                    </h1>
                    <p className="page-subtitle mt-2">
                      创建和管理 AI 智能体 · 共 {agents.length} 个智能体
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      onClick={handleCreate}
                      disabled={isModalDataLoading}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isModalDataLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">
                        {isModalDataLoading ? '加载中...' : '创建智能体'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
          
              {/* 主要内容区域 */}
              <motion.div 
                className="space-y-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {/* 处理状态指示器 */}
                {isProcessing && (
                  <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40">
                    <div className="bg-theme-card border border-theme-border rounded-lg px-4 py-2 shadow-lg">
                      <InlineLoading 
                        text="处理中..."
                        size="small"
                      />
                    </div>
                  </div>
                )}



                {/* 智能体列表 */}
                <div className="space-y-6">
                  <AgentList
                    agents={agents}
                    isLoading={loading}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onStartChat={handleStartChat}
                    onShowMemory={handleShowMemory}
                  />
                </div>
              </motion.div>

              {/* 智能体表单弹窗 */}
              {isModalOpen && (
                <AgentFormModal
                  agent={selectedAgent}
                  onClose={handleModalClose}
                  onSave={handleModalSave}
                  availableModels={availableModels}
                  availableServers={availableServers}
                  allAvailableTools={allAvailableTools}
                />
              )}

              {/* 删除确认弹窗 */}
              <Modal
                open={deleteModalOpen}
                onClose={() => { setDeleteModalOpen(false); setAgentToDelete(null); }}
                title="确认删除智能体"
                icon={<AlertTriangle className="w-6 h-6 text-theme-warning" />}
                actions={[
                  {
                    label: '取消',
                    onClick: () => { setDeleteModalOpen(false); setAgentToDelete(null); },
                    variant: 'secondary',
                  },
                  {
                    label: '确认删除',
                    onClick: confirmDeleteAgent,
                    variant: 'danger',
                    autoFocus: true,
                  },
                ]}
                width={380}
              >
                {agentToDelete && (
                  <span>
                    确定要删除智能体「<b>{agentToDelete.name}</b>」吗？此操作不可撤销。
                  </span>
                )}
              </Modal>

              {/* Agent 记忆弹窗 */}
              {memoryAgent && (
                <AgentMemoryModal
                  isOpen={memoryModalOpen}
                  onClose={handleCloseMemoryModal}
                  agentId={memoryAgent.id}
                  agentName={memoryAgent.name}
                />
              )}
            </div>
          </main>
        </div>
      </div>
      </div>
    </ProtectedRoute>
  );
}

export default function AgentsPage() {
  return <AgentsPageContent />;
}