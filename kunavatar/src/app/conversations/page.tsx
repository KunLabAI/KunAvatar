'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Trash2, MessageSquare, Calendar, Clock, Plus, CheckSquare, Square, MoreHorizontal } from 'lucide-react';
import { PageLoading } from '@/components/Loading';
import { motion } from 'framer-motion';
import { useNotification } from '@/components/notification';
import Modal from '@/components/Modal';
import { Sidebar } from '../Sidebar';
import { Conversation } from '@/lib/database';
import { Agent } from '@/lib/database/agents';
import { DateGroupedConversationList, SearchBar } from './components';
import { Button } from '@/app/model-manager/components/FormComponents';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { authenticatedFetch, useAuthErrorHandler } from '@/lib/utils/auth-utils';

function ConversationsPageContent() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 多选功能状态
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
  const [batchDeleteModalOpen, setBatchDeleteModalOpen] = useState(false);

  // 侧边栏相关状态
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);

  // 使用新的通知系统和认证错误处理
  const notification = useNotification();
  const { handleAuthError } = useAuthErrorHandler();

  // 加载智能体列表
  const fetchAgents = useCallback(async () => {
    try {
      const response = await authenticatedFetch('/api/agents');
      
      if (response.status === 401) {
        handleAuthError();
        return;
      }
      
      if (!response.ok) {
        throw new Error('加载智能体列表失败');
      }
      
      const agentList = await response.json();
      setAgents(agentList);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
      
      // 如果是认证相关错误，触发认证错误处理
      if (err instanceof Error && err.message.includes('访问令牌')) {
        handleAuthError();
      }
      // 不显示错误，因为这不是关键功能
    }
  }, [handleAuthError]);

  // 加载对话列表
  const fetchConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authenticatedFetch('/api/conversations');
      
      if (!response.ok) {
        if (response.status === 401) {
          handleAuthError();
          return;
        }
        throw new Error('加载对话列表失败');
      }
      
      const data = await response.json();
      const conversationList = data.conversations || [];
      setConversations(conversationList);
      setFilteredConversations(conversationList);
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载对话时发生未知错误';
      setError(message);
      notification.error('加载失败', message);
      
      // 如果是token相关错误，触发认证错误处理
      if (message.includes('访问令牌')) {
        handleAuthError();
      }
    } finally {
      setLoading(false);
    }
  }, [notification, handleAuthError]);

  useEffect(() => {
    Promise.all([fetchConversations(), fetchAgents()]);
  }, [fetchConversations, fetchAgents]);

  // 搜索过滤
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter(conversation =>
        conversation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (conversation.model && conversation.model.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredConversations(filtered);
    }
  }, [searchQuery, conversations]);

  // 侧边栏事件处理
  const handleCreateConversation = () => {
    window.location.href = '/chat?new=true';
  };

  const handleLoadConversation = (conversationId: string) => {
    window.location.href = `/chat?id=${conversationId}`;
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      const response = await authenticatedFetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
      });
      
      if (response.status === 401) {
        handleAuthError();
        return;
      }
      
      if (response.ok) {
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
        if (currentConversation?.id === conversationId) {
          setCurrentConversation(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      if (error instanceof Error && error.message.includes('访问令牌')) {
        handleAuthError();
      }
    }
  };

  // 打开删除确认对话框
  const handleDeleteClick = (conversation: Conversation) => {
    setConversationToDelete(conversation);
    setDeleteModalOpen(true);
  };

  // 确认删除对话
  const confirmDeleteConversation = async () => {
    if (!conversationToDelete) return;
    
    try {
      setIsProcessing(true);
      const response = await authenticatedFetch(`/api/conversations/${conversationToDelete.id}`, { 
        method: 'DELETE',
      });
      
      if (response.status === 401) {
        handleAuthError();
        return;
      }
      
      if (!response.ok) {
        throw new Error('删除对话失败');
      }
      
      await fetchConversations();
      notification.success('删除成功', `对话 "${conversationToDelete.title}" 已删除`);
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除对话失败';
      setError(message);
      notification.error('删除失败', message);
      
      // 如果是token相关错误，触发认证错误处理
      if (message.includes('访问令牌')) {
        handleAuthError();
      }
    } finally {
      setIsProcessing(false);
      setDeleteModalOpen(false);
      setConversationToDelete(null);
    }
  };

  // 进入对话
  const handleEnterConversation = (conversationId: string) => {
    if (isSelectionMode) {
      // 选择模式下切换选中状态
      toggleConversationSelection(conversationId);
    } else {
      // 正常模式下进入对话
      window.location.href = `/chat?id=${conversationId}`;
    }
  };

  // 切换选择模式
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedConversations(new Set());
  };

  // 切换对话选中状态
  const toggleConversationSelection = (conversationId: string) => {
    const newSelected = new Set(selectedConversations);
    if (newSelected.has(conversationId)) {
      newSelected.delete(conversationId);
    } else {
      newSelected.add(conversationId);
    }
    setSelectedConversations(newSelected);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedConversations.size === filteredConversations.length) {
      setSelectedConversations(new Set());
    } else {
      setSelectedConversations(new Set(filteredConversations.map(conv => conv.id)));
    }
  };

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedConversations.size === 0) return;
    setBatchDeleteModalOpen(true);
  };

  // 确认批量删除
  const confirmBatchDelete = async () => {
    if (selectedConversations.size === 0) return;
    
    try {
      setIsProcessing(true);
      
      // 并行删除所有选中的对话
      const deletePromises = Array.from(selectedConversations).map(async (conversationId) => {
        const response = await authenticatedFetch(`/api/conversations/${conversationId}`, { 
          method: 'DELETE',
        });
        
        if (response.status === 401) {
          throw new Error('认证失败，请重新登录');
        }
        
        if (!response.ok) {
          throw new Error(`删除对话 ${conversationId} 失败`);
        }
        return conversationId;
      });
      
      await Promise.all(deletePromises);
      
      await fetchConversations();
      notification.success('批量删除成功', `已删除 ${selectedConversations.size} 个对话`);
      
      // 退出选择模式
      setIsSelectionMode(false);
      setSelectedConversations(new Set());
    } catch (err) {
      const message = err instanceof Error ? err.message : '批量删除失败';
      setError(message);
      notification.error('批量删除失败', message);
      
      // 如果是认证相关错误，触发认证错误处理
      if (message.includes('认证失败') || message.includes('访问令牌')) {
        handleAuthError();
      }
    } finally {
      setIsProcessing(false);
      setBatchDeleteModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
        <Sidebar
          conversations={conversations}
        />
        <div className="flex-1">
          <PageLoading text="loading..." fullScreen={true} />
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <Sidebar
        conversations={conversations}
      />
      
      {/* 主内容区域 */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        <div className="min-h-screen transition-all duration-300" style={{ backgroundColor: 'var(--color-background)' }}>
          {/* 页面头部 - 主标题副标题+操作区 */}
          <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <div className="mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between" style={{ gap: 'var(--spacing-md)' }}>
                  <div>
                    <h1 className="page-title">
                      对话历史
                    </h1>
                    <p className="page-subtitle mt-2">
                      查看和管理所有历史对话记录 · 共 {conversations.length} 个对话
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex items-center" style={{ gap: 'var(--spacing-sm)' }}>
                    {!isSelectionMode ? (
                      <>
                        <Button
                          onClick={toggleSelectionMode}
                          variant="secondary"
                          className="flex items-center"
                          style={{ gap: 'var(--spacing-xs)' }}
                        >
                          <CheckSquare className="w-4 h-4" />
                          <span className="hidden sm:inline">批量选择</span>
                        </Button>
                        <Button
                          onClick={handleCreateConversation}
                          variant="primary"
                          className="flex items-center"
                          style={{ 
                            gap: 'var(--spacing-xs)',
                            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)',
                            color: 'white'
                          }}
                        >
                          <Plus className="w-4 h-4" />
                          <span className="hidden sm:inline">新建对话</span>
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center" style={{ gap: 'var(--spacing-xs)' }}>
                          <Button
                            onClick={toggleSelectAll}
                            variant="secondary"
                            className="flex items-center"
                            style={{ gap: 'var(--spacing-xs)' }}
                          >
                            {selectedConversations.size === filteredConversations.length ? (
                              <CheckSquare className="w-4 h-4" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                            <span className="hidden sm:inline">
                              {selectedConversations.size === filteredConversations.length ? '取消全选' : '全选'}
                            </span>
                          </Button>
                          <span style={{ 
                            fontSize: 'var(--font-size-sm)', 
                            color: 'var(--color-foreground-muted)' 
                          }}>
                            已选择 {selectedConversations.size} 个
                          </span>
                        </div>
                        <div className="flex items-center" style={{ gap: 'var(--spacing-xs)' }}>
                          <Button
                            onClick={handleBatchDelete}
                            variant="secondary"
                            disabled={selectedConversations.size === 0}
                            className="flex items-center"
                            style={{ 
                              gap: 'var(--spacing-xs)',
                              color: selectedConversations.size > 0 ? 'var(--color-error)' : undefined
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">删除选中</span>
                          </Button>
                          <Button
                            onClick={toggleSelectionMode}
                            variant="secondary"
                            className="flex items-center"
                            style={{ gap: 'var(--spacing-xs)' }}
                          >
                            取消
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {/* 搜索栏单独一行，最大宽度自适应 */}
                <div style={{ marginTop: 'var(--spacing-lg)' }}>
                  <SearchBar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    placeholder="搜索对话标题或模型..."
                  />
                </div>
              </div>
            
              {/* 主要内容区域 */}
              <motion.div 
                style={{ marginTop: 'var(--spacing-2xl)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {/* 对话列表区域 */}
                <div style={{ marginTop: 'var(--spacing-xl)' }}>
                  {error ? (
                    <div className="flex items-center justify-center" style={{ paddingTop: 'var(--spacing-3xl)', paddingBottom: 'var(--spacing-3xl)' }}>
                      <div className="text-center">
                        <div style={{ color: 'var(--color-error)', marginBottom: 'var(--spacing-xs)', fontSize: 'var(--font-size-4xl)' }}>⚠️</div>
                        <p style={{ color: 'var(--color-foreground-muted)', marginBottom: 'var(--spacing-md)' }}>{error}</p>
                        <Button onClick={fetchConversations} variant="primary">
                          重试
                        </Button>
                      </div>
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="flex items-center justify-center" style={{ paddingTop: 'var(--spacing-3xl)', paddingBottom: 'var(--spacing-3xl)' }}>
                      <div className="text-center">
                        <MessageSquare className="w-16 h-16 mx-auto" style={{ color: 'var(--color-foreground-muted)', marginBottom: 'var(--spacing-md)' }} />
                        <p style={{ color: 'var(--color-foreground-muted)', marginBottom: 'var(--spacing-md)' }}>
                          {searchQuery ? '未找到匹配的对话' : '暂无对话历史'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <DateGroupedConversationList
                      conversations={filteredConversations}
                      agents={agents}
                      onEnterConversation={handleEnterConversation}
                      onDeleteConversation={handleDeleteClick}
                      isSelectionMode={isSelectionMode}
                      selectedConversations={selectedConversations}
                      onToggleSelection={toggleConversationSelection}
                    />
                  )}
                </div>
              </motion.div>
            </div>
          </main>
        </div>
      </div>

      {/* 删除确认对话框 */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="删除对话"
        actions={[
          {
            label: '取消',
            onClick: () => setDeleteModalOpen(false),
            variant: 'secondary',
            disabled: isProcessing
          },
          {
            label: isProcessing ? '删除中...' : '确认删除',
            onClick: confirmDeleteConversation,
            variant: 'danger',
            disabled: isProcessing
          }
        ]}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <p style={{ color: 'var(--color-foreground)' }}>
            确定要删除对话 <strong>&ldquo;{conversationToDelete?.title}&rdquo;</strong> 吗？
          </p>
          <p style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--font-size-sm)' }}>
            此操作将永久删除对话及其所有消息，无法恢复。
          </p>
        </div>
      </Modal>

      {/* 批量删除确认对话框 */}
      <Modal
        open={batchDeleteModalOpen}
        onClose={() => setBatchDeleteModalOpen(false)}
        title="批量删除对话"
        actions={[
          {
            label: '取消',
            onClick: () => setBatchDeleteModalOpen(false),
            variant: 'secondary',
            disabled: isProcessing
          },
          {
            label: isProcessing ? '删除中...' : '确认删除',
            onClick: confirmBatchDelete,
            variant: 'danger',
            disabled: isProcessing
          }
        ]}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <p style={{ color: 'var(--color-foreground)' }}>
            确定要删除选中的 <strong>{selectedConversations.size}</strong> 个对话吗？
          </p>
          <p style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--font-size-sm)' }}>
            此操作将永久删除这些对话及其所有消息，无法恢复。
          </p>
          {selectedConversations.size > 0 && (
            <div style={{ 
              maxHeight: '200px', 
              overflowY: 'auto',
              backgroundColor: 'var(--color-background-secondary)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--spacing-sm)'
            }}>
              <p style={{ 
                fontSize: 'var(--font-size-sm)', 
                color: 'var(--color-foreground-muted)',
                marginBottom: 'var(--spacing-xs)'
              }}>
                将要删除的对话：
              </p>
              {Array.from(selectedConversations).map(id => {
                const conversation = conversations.find(conv => conv.id === id);
                return conversation ? (
                  <div key={id} style={{ 
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-foreground)',
                    marginBottom: 'var(--spacing-xs)'
                  }}>
                    • {conversation.title}
                  </div>
                ) : null;
              })}
            </div>
          )}
        </div>
      </Modal>
      </div>
    </ProtectedRoute>
  );
}

export default function ConversationsPage() {
  return <ConversationsPageContent />;
}