'use client';

import { useMcpConfig } from './hooks/useMcpConfig';
import { AddServerModal } from './components/AddServerModal';
import { ToolsModal } from './components/ToolsModal';
import { RefreshCw, Trash2, Axe, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import NotificationProvider, { NotificationManager, useNotification } from '@/components/notification';
import Modal from '@/components/Modal';
import { Sidebar } from '../Sidebar';
import { PageLoading } from '@/components/Loading';
import { useConversations } from '@/hooks/useConversations';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useI18n } from '@/contexts/I18nContext';

function McpConfigPageContent() {
  const { t } = useI18n();
  const {
    servers,
    tools,
    loading,
    toolsLoading,
    showAddModal,
    showToolsModal,
    selectedTab,
    selectedServer,
    newServer,
    setShowAddModal,
    setShowToolsModal,
    setNewServer,
    setTools,
    loadServers,
    loadTools,
    handleTabChange,
    handleServerSelect,
    checkServerStatus,
    refreshTools,
    handleDeleteTool,
    handleUseTool,
    handleAddServer,
    handleDeleteServer,
    syncLocalTools,
    executionResult,
    setExecutionResult,
    usingToolId
  } = useMcpConfig();

  // 操作类弹窗
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<any>(null);
  const notification = useNotification?.() ?? null;

  // 获取对话数据用于侧边栏
  const { conversations } = useConversations();
  
  // 侧边栏事件处理

  // 删除服务器弹窗触发
  const handleDeleteServerModal = (server: any) => {
    setServerToDelete(server);
    setDeleteModalOpen(true);
  };

  // 确认删除服务器
  const confirmDeleteServer = async () => {
    if (!serverToDelete) return;
    try {
      // 本地服务器不允许删除
      if (serverToDelete.name === 'local') {
        notification && notification.error?.(t('mcp.messages.localServerCannotDelete'));
        setDeleteModalOpen(false);
        setServerToDelete(null);
        return;
      }
      // 先删除数据库记录
      const response = await fetch(`/api/mcp/servers/${serverToDelete.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        // 然后删除配置文件中的记录
        const configResponse = await fetch('/api/mcp/config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'delete',
            serverName: serverToDelete.name
          }),
        });
        if (configResponse.ok) {
          notification && notification.success?.(t('mcp.messages.deleteSuccess'), t('mcp.messages.deleteSuccessDesc').replace('{name}', serverToDelete.displayName || serverToDelete.name));
          if (selectedServer === serverToDelete.name) {
            handleServerSelect(null as any);
            setTools([]);
          }
          await loadServers();
        } else {
          const configErrorData = await configResponse.json();
          notification && notification.error?.(t('mcp.messages.deleteConfigFailed'), configErrorData.error || t('mcp.messages.unknownError'));
        }
      } else {
        const errorData = await response.json();
        notification && notification.error?.(t('mcp.messages.deleteServerFailed'), errorData.error || t('mcp.messages.unknownError'));
      }
    } catch (error) {
      notification && notification.error?.(t('mcp.messages.deleteServerFailed'), error instanceof Error ? error.message : t('mcp.messages.unknownError'));
    } finally {
      setDeleteModalOpen(false);
      setServerToDelete(null);
    }
  };

  const statusClasses = {
    connected: 'bg-theme-success',
    error: 'bg-theme-error',
    disconnected: 'bg-theme-foreground-muted',
    connecting: 'bg-yellow-500',
  };

  const borderClasses = {
    connecting: 'ring-2 ring-yellow-500/50 ring-offset-2 ring-offset-theme-background-secondary animate-pulse',
    selected: 'ring-2 ring-theme-primary ring-offset-2 ring-offset-theme-background-secondary',
    default: 'border-theme-border hover:border-theme-border-secondary'
  }

  const getBorderClass = (server: any) => {
    if (server.status === 'connecting') return borderClasses.connecting;
    if (selectedServer === server.name) return borderClasses.selected;
    return borderClasses.default;
  }

  if (loading) {
    return (
      <NotificationProvider>
        <div className="flex h-screen bg-theme-background">
          <Sidebar
            conversations={conversations}
          />
          <div className="flex-1 overflow-auto">
            <PageLoading 
              text={t('mcp.actions.loading')} 
              fullScreen={true}
            />
          </div>
        </div>
      </NotificationProvider>
    );
  }

  return (
    <ProtectedRoute>
      <NotificationProvider>
      <div className="flex h-screen bg-theme-background">
        {/* 侧边栏 */}
        <Sidebar
          conversations={conversations}
        />
        
        {/* 主内容区域 */}
        <div className="flex-1 overflow-auto scrollbar-thin">
          <div className="min-h-screen bg-theme-background transition-colors duration-300">
            {/* 全局通知管理器 */}
            <NotificationManager position="top-right" />
            
            <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
              <div className="px-4 py-6 sm:px-0">
                {/* 页面头部 - 主标题副标题+操作区 */}
                <div className="mb-8">
                  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                    <div>
                      <h1 className="page-title">
                       {t('mcp.title')}
                      </h1>
                      <p className="page-subtitle mt-2">
                        {t('mcp.subtitle')}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-colors duration-200 font-medium"
                      >
                        <Plus className="w-5 h-5" />
                        {t('mcp.actions.addServer')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 标签页 */}
                <div className="mb-6">
                  <div className="border-b border-theme-border">
                    <nav className="-mb-px flex space-x-8">
                      {[
                        { key: 'all', label: t('mcp.tabs.all'), count: servers.length },
                        { key: 'local', label: t('mcp.tabs.local'), count: servers.filter(s => s.type === 'stdio').length },
                        { key: 'external', label: t('mcp.tabs.external'), count: servers.filter(s => s.type !== 'stdio').length }
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => handleTabChange(tab.key as any)}
                          className={`${
                            selectedTab === tab.key
                              ? 'border-theme-primary text-theme-primary'
                              : 'border-transparent text-theme-foreground-muted hover:text-theme-foreground hover:border-theme-border-secondary'
                          } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors duration-200 focus:outline-none`}
                        >
                          <span>{tab.label}</span>
                          <span className="bg-theme-background-tertiary text-theme-foreground-secondary py-0.5 px-2.5 rounded-full text-xs font-medium">
                            {tab.count}
                          </span>
                        </button>
                      ))}
                    </nav>
                  </div>
                </div>

                {/* 服务器卡片 */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {servers
                      .filter(server => {
                        if (selectedTab === 'all') return true;
                        if (selectedTab === 'local') return server.type === 'stdio';
                        if (selectedTab === 'external') return server.type !== 'stdio';
                        return true;
                      })
                      .map((server) => (
                        <div
                          key={server.name}
                          className={`bg-theme-card border rounded-lg p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${getBorderClass(server)} flex flex-col h-full`}
                        >
                          {/* 头部：名称 + 状态和类型 */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-base font-semibold text-theme-foreground truncate" title={server.displayName}>{server.displayName}</h4>
                            </div>
                            <div className="flex items-center space-x-2 pl-4 flex-shrink-0">
                              <div className={`w-2.5 h-2.5 rounded-full ${statusClasses[server.status as keyof typeof statusClasses]}`} title={t('mcp.server.status').replace('{status}', server.status)}></div>
                              <span className="text-theme-foreground-muted capitalize text-xs">{server.type}</span>
                            </div>
                          </div>
                          
                          {/* 描述区域 - 限制两行 */}
                          <div className="flex-1">
                            <p className="text-sm text-theme-foreground-muted line-clamp-2 leading-5 h-10 overflow-hidden" title={server.description}>
                              {server.description}
                            </p>
                            {server.errorMessage && (
                              <p className="text-xs text-theme-error mt-2 truncate" title={server.errorMessage}>
                                {t('mcp.server.error').replace('{message}', server.errorMessage)}
                              </p>
                            )}
                          </div>
                          
                          {/* 底部操作区域 */}
                          <div className="flex items-center justify-between mt-4 pt-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleServerSelect(server.name);
                              }}
                              className="bg-theme-primary/10 hover:bg-theme-primary/20 text-theme-primary px-3 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-2"
                            >
                              <Axe className="w-4 h-4" />
                              <span>{t('mcp.server.toolsCount').replace('{count}', (server.toolCount || 0).toString())}</span>
                            </button>
                            
                            <div className="flex items-center space-x-1">
                              {server.type === 'stdio' && server.name === 'local' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    syncLocalTools();
                                  }}
                                  className="text-theme-foreground-muted hover:text-theme-primary p-1.5 rounded-full hover:bg-theme-primary/10 transition-colors"
                                  title={t('mcp.actions.syncTools')}
                                >
                                  <RefreshCw className={`w-3.5 h-3.5 ${server.status === 'connecting' ? 'animate-spin' : ''}`} />
                                </button>
                              )}
                              {server.type !== 'stdio' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    checkServerStatus(server.name);
                                  }}
                                  className="text-theme-foreground-muted hover:text-theme-primary p-1.5 rounded-full hover:bg-theme-primary/10 transition-colors"
                                  title={t('mcp.actions.checkStatus')}
                                >
                                  <RefreshCw className={`w-3.5 h-3.5 ${server.status === 'connecting' ? 'animate-spin' : ''}`} />
                                </button>
                              )}
                              {server.name !== 'local' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteServerModal(server);
                                  }}
                                  className="text-theme-foreground-muted hover:text-theme-error p-1.5 rounded-full hover:bg-theme-error/10 transition-colors"
                                  title={t('mcp.actions.deleteServer')}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>


              </div>
            </main>

            <AddServerModal
              isOpen={showAddModal}
              onClose={() => setShowAddModal(false)}
              newServer={newServer}
              onServerChange={setNewServer}
              onSubmit={handleAddServer}
            />
            
            <ToolsModal
              isOpen={showToolsModal}
              onClose={() => setShowToolsModal(false)}
              serverName={selectedServer || ''}
              tools={tools}
              onUseTool={handleUseTool}
              usingToolId={usingToolId}
              onToolUpdate={(updatedTool) => {
                // 更新工具列表中的对应工具
                setTools(prevTools => 
                  prevTools.map(tool => 
                    tool.id === updatedTool.id ? updatedTool : tool
                  )
                );
              }}
            />
            
            {/* 工具执行结果显示 */}
            {executionResult && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-theme-card rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-auto scrollbar-thin shadow-xl">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-theme-foreground">
                      {t('mcp.execution.resultTitle').replace('{toolName}', executionResult.toolName || '')}
                    </h3>
                    <button
                      onClick={() => setExecutionResult(null)}
                      className="text-theme-foreground-muted hover:text-theme-foreground"
                    >
                      {t('mcp.execution.close')}
                    </button>
                  </div>
                  
                  {executionResult.success ? (
                    <div className="space-y-3">
                      <div className="flex items-center text-theme-success">
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {t('mcp.execution.success')}
                      </div>
                      <div className="bg-theme-background-secondary rounded-md p-4">
                        <pre className="text-sm text-theme-foreground whitespace-pre-wrap">
                          {JSON.stringify(executionResult.data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center text-theme-error">
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        {t('mcp.execution.failed')}
                      </div>
                      <div className="bg-theme-error/10 rounded-md p-4">
                        <p className="text-sm text-theme-error">
                          {executionResult.error}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 操作类弹窗Modal：删除服务器 */}
            <Modal
              open={deleteModalOpen}
              onClose={() => { setDeleteModalOpen(false); setServerToDelete(null); }}
              title={t('mcp.deleteModal.title')}
              actions={[
                {
                  label: t('mcp.deleteModal.cancel'),
                  onClick: () => { setDeleteModalOpen(false); setServerToDelete(null); },
                  variant: 'secondary',
                },
                {
                  label: t('mcp.deleteModal.confirm'),
                  onClick: confirmDeleteServer,
                  variant: 'danger',
                  autoFocus: true,
                },
              ]}
              width={380}
            >
              {serverToDelete && (
                <span>
                  {t('mcp.deleteModal.content').replace('{name}', serverToDelete.displayName || serverToDelete.name)}
                </span>
              )}
            </Modal>
          </div>
        </div>
      </div>
      </NotificationProvider>
    </ProtectedRoute>
  );
}

export default function McpConfigPage() {
  return <McpConfigPageContent />;
}