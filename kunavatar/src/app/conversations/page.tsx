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
import { useI18n } from '@/contexts/I18nContext';

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
  
  // 多语言支持
  const { t } = useI18n();

  // 加载智能体列表
  const fetchAgents = useCallback(async () => {
    try {
      const response = await authenticatedFetch('/api/agents');
      
      if (response.status === 401) {
        handleAuthError();
        return;
      }
      
      if (!response.ok) {
        throw new Error(t('conversations.messages.loadFailed'));
      }
      
      const agentList = await response.json();
      setAgents(agentList);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
      
      // 如果是认证相关错误，触发认证错误处理
      if (err instanceof Error && err.message.includes(t('conversations.messages.authError'))) {
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
        throw new Error(t('conversations.messages.loadFailed'));
      }
      
      const data = await response.json();
      const conversationList = data.conversations || [];
      setConversations(conversationList);
      setFilteredConversations(conversationList);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('conversations.messages.unknownError');
      setError(message);
      notification.error(t('conversations.messages.loadFailed'), message);
      
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
        throw new Error(t('conversations.messages.deleteFailed'));
      }
      
      await fetchConversations();
      notification.success(t('conversations.messages.deleteSuccess'), t('conversations.messages.deleteSuccessDesc').replace('{title}', conversationToDelete.title));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('conversations.messages.deleteFailed');
      setError(message);
      notification.error(t('conversations.messages.deleteFailed'), message);
      
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
          throw new Error(t('conversations.messages.authError'));
        }
        
        if (!response.ok) {
          throw new Error(t('conversations.messages.deleteFailed').replace('{id}', conversationId));
        }
        return conversationId;
      });
      
      await Promise.all(deletePromises);
      
      await fetchConversations();
      notification.success(t('conversations.messages.batchDeleteSuccess'), t('conversations.messages.batchDeleteSuccessDesc').replace('{count}', selectedConversations.size.toString()));
      
      // 退出选择模式
      setIsSelectionMode(false);
      setSelectedConversations(new Set());
    } catch (err) {
      const message = err instanceof Error ? err.message : t('conversations.messages.batchDeleteFailed');
      setError(message);
      notification.error(t('conversations.messages.batchDeleteFailed'), message);
      
      // 如果是认证相关错误，触发认证错误处理
      if (message.includes(t('conversations.messages.authError')) || message.includes('访问令牌')) {
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
          <PageLoading text={t('conversations.loading')} fullScreen={true} />
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
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between" style={{ gap: 'var(--spacing-md)' }}>
                  <div>
                    <h1 className="page-title">
                      {t('conversations.title')}
                    </h1>
                    <p className="page-subtitle mt-2">
                      {t('conversations.subtitle').replace('{count}', conversations.length.toString())}
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
                          <span className="hidden sm:inline">{t('conversations.actions.batchSelect')}</span>
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
                          <span className="hidden sm:inline">{t('conversations.actions.newConversation')}</span>
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
                              {selectedConversations.size === filteredConversations.length ? t('conversations.actions.deselectAll') : t('conversations.actions.selectAll')}
                            </span>
                          </Button>
                          <span style={{ 
                            fontSize: 'var(--font-size-sm)', 
                            color: 'var(--color-foreground-muted)' 
                          }}>
                            {t('conversations.selection.selected').replace('{count}', selectedConversations.size.toString())}
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
                            <span className="hidden sm:inline">{t('conversations.actions.deleteSelected')}</span>
                          </Button>
                          <Button
                            onClick={toggleSelectionMode}
                            variant="secondary"
                            className="flex items-center"
                            style={{ gap: 'var(--spacing-xs)' }}
                          >
                            {t('conversations.actions.cancel')}
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
                    placeholder={t('conversations.search.placeholder')}
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
                          {t('conversations.actions.retry')}
                        </Button>
                      </div>
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="flex items-center justify-center" style={{ paddingTop: 'var(--spacing-3xl)', paddingBottom: 'var(--spacing-3xl)' }}>
                      <div className="text-center">
                        <MessageSquare className="w-16 h-16 mx-auto" style={{ color: 'var(--color-foreground-muted)', marginBottom: 'var(--spacing-md)' }} />
                        <p style={{ color: 'var(--color-foreground-muted)', marginBottom: 'var(--spacing-md)' }}>
                          {searchQuery ? t('conversations.empty.noSearchResults') : t('conversations.empty.noConversations')}
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
        title={t('conversations.deleteModal.title')}
        actions={[
          {
            label: t('conversations.deleteModal.cancel'),
            onClick: () => setDeleteModalOpen(false),
            variant: 'secondary',
            disabled: isProcessing
          },
          {
            label: isProcessing ? t('conversations.deleteModal.deleting') : t('conversations.deleteModal.confirm'),
            onClick: confirmDeleteConversation,
            variant: 'danger',
            disabled: isProcessing
          }
        ]}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <p style={{ color: 'var(--color-foreground)' }}>
            {t('conversations.deleteModal.content').replace('{title}', conversationToDelete?.title || '')}
          </p>
          <p style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--font-size-sm)' }}>
            {t('conversations.deleteModal.warning')}
          </p>
        </div>
      </Modal>

      {/* 批量删除确认对话框 */}
      <Modal
        open={batchDeleteModalOpen}
        onClose={() => setBatchDeleteModalOpen(false)}
        title={t('conversations.batchDeleteModal.title')}
        actions={[
          {
            label: t('conversations.batchDeleteModal.cancel'),
            onClick: () => setBatchDeleteModalOpen(false),
            variant: 'secondary',
            disabled: isProcessing
          },
          {
            label: isProcessing ? t('conversations.batchDeleteModal.deleting') : t('conversations.batchDeleteModal.confirm'),
            onClick: confirmBatchDelete,
            variant: 'danger',
            disabled: isProcessing
          }
        ]}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <p style={{ color: 'var(--color-foreground)' }}>
            {t('conversations.batchDeleteModal.content').replace('{count}', selectedConversations.size.toString())}
          </p>
          <p style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--font-size-sm)' }}>
            {t('conversations.batchDeleteModal.warning')}
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
                {t('conversations.batchDeleteModal.listTitle')}
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
  return (
    <ProtectedRoute requiredPermission="conversations:read">
      <ConversationsPageContent />
    </ProtectedRoute>
  );
}