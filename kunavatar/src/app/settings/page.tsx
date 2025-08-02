'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { usePromptOptimizeSettings, useAvailableModels, useUserPermissions } from './hooks';
import { Sidebar } from '../Sidebar';
import { SettingsTabs, AssistantModelTab, AccountManagementTab, UserManagementTab, RoleManagementTab, AppearanceTab, AppInfoTab, InferenceEngineTab, LogManagementTab } from './components';
import { NotificationProvider, NotificationContainer, useNotification } from '@/components/notification';
import { PageLoading } from '@/components/Loading';
import { useConversations } from '@/hooks/useConversations';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// 禁用静态生成
export const dynamic = 'force-dynamic';


// 连接到Context的通知容器
function ConnectedNotificationContainer() {
  const { notifications, dismiss } = useNotification();
  return (
    <NotificationContainer 
      notifications={notifications} 
      onDismiss={dismiss} 
      position="top-right"
      maxNotifications={5}
    />
  );
}

// 设置页面内容组件（使用 useSearchParams）
function SettingsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // 从URL参数获取初始标签页，如果没有则默认为'account'
  const initialTab = searchParams.get('tab') || 'account';
  const [activeTab, setActiveTab] = useState(initialTab);
  
  const { settings, isLoaded, updateSetting } = usePromptOptimizeSettings();
  const { models: availableModels, isLoading: modelsLoading, error: modelsError } = useAvailableModels();
  const { isAdmin, loading: permissionsLoading } = useUserPermissions();
  
  // 获取对话数据用于侧边栏
  const { conversations } = useConversations();

  // 处理标签页切换，同时更新URL参数
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // 更新URL参数但不刷新页面
    const newUrl = `/settings?tab=${tab}`;
    window.history.replaceState(null, '', newUrl);
  };

  // 当模型列表加载完成且设置已加载时，自动设置默认模型
  useEffect(() => {
    if (isLoaded && !modelsLoading && availableModels.length > 0) {
      const firstModel = availableModels[0].value;
      
      // 如果当前模型为空或不在可用模型列表中，设置为第一个可用模型
      if (!settings.promptModel || !availableModels.find(m => m.value === settings.promptModel)) {
        updateSetting('promptModel', firstModel);
      }
      if (!settings.titleSummaryModel || !availableModels.find(m => m.value === settings.titleSummaryModel)) {
        updateSetting('titleSummaryModel', firstModel);
      }
      if (!settings.memoryModel || !availableModels.find(m => m.value === settings.memoryModel)) {
        updateSetting('memoryModel', firstModel);
      }
    }
  }, [isLoaded, modelsLoading, availableModels, settings, updateSetting]);

  // 如果当前标签页是用户管理但用户不是管理员，切换到账户管理
  useEffect(() => {
    if (!permissionsLoading && activeTab === 'users' && !isAdmin) {
      handleTabChange('account');
    }
  }, [isAdmin, permissionsLoading, activeTab]);
  
  // 如果设置还未加载完成，显示加载状态
  if (!isLoaded || permissionsLoading) {
    return (
      <div className="flex h-screen bg-theme-background">
        <Sidebar
          conversations={conversations}
        />
        <div className="flex-1 overflow-auto">
          <PageLoading 
            text="loading..."
            fullScreen={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-theme-background">
      <Sidebar
        conversations={conversations}
      />
      <div className="flex-1 overflow-auto scrollbar-thin">
        <div className="min-h-screen bg-theme-background transition-colors duration-300">
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <h1 className="text-2xl font-bold mb-6 text-theme-foreground">设置</h1>
              
              {/* 标签页导航 */}
              <SettingsTabs activeTab={activeTab} onTabChange={handleTabChange} isAdmin={isAdmin} />

              {/* Tab内容区 */}
              {activeTab === 'account' && (
                <AccountManagementTab />
              )}
              {activeTab === 'users' && isAdmin && (
                <UserManagementTab />
              )}
              {activeTab === 'roles' && isAdmin && (
                <RoleManagementTab />
              )}
              {activeTab === 'assistant' && (
                <AssistantModelTab
                  settings={settings}
                  availableModels={availableModels}
                  modelsLoading={modelsLoading}
                  modelsError={modelsError}
                  onUpdateSetting={updateSetting}
                />
              )}
              {activeTab === 'appearance' && (
                <AppearanceTab />
              )}
              {activeTab === 'logs' && (
                <LogManagementTab />
              )}
              {activeTab === 'appinfo' && (
                <AppInfoTab />
              )}
              {activeTab === 'inference' && (
                <InferenceEngineTab />
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <NotificationProvider>
        <Suspense fallback={
          <div className="flex h-screen bg-theme-background">
            <div className="flex-1 overflow-auto">
              <PageLoading 
                text="正在加载设置..."
                fullScreen={true}
              />
            </div>
          </div>
        }>
          <SettingsPageContent />
        </Suspense>
        {/* 通知容器 */}
        <ConnectedNotificationContainer />
      </NotificationProvider>
    </ProtectedRoute>
  );
}