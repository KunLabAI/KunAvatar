'use client';

import React, { useCallback, useState } from 'react';
import { Bot, MessageCircle } from 'lucide-react';
import { MessageList } from './MessageList';
import Modal from '@/components/Modal';
import ImagePreviewModal from './ImagePreviewModal';

type ChatMode = 'model' | 'agent';

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

interface UserSettings {
  themePreference: string;
  colorTheme: string;
  chatStyle: string;
  displaySize: string;
}

interface UseMessageSenderReturn {
  messages: any[];
  isStreaming: boolean;
  error: string | null;
  isLoadingHistory: boolean;
  sendMessage: (message: string, conversationId: string) => Promise<void>;
  clearMessages: () => void;
  stopGeneration: () => void;
  loadConversationHistory: (conversationId: string) => Promise<{ conversation?: any; lastModel?: string } | null>;
  removeMessage: (messageId: string) => void; // 新增：删除消息方法
}

interface ChatAreaProps {
  chatMode: ChatMode;
  selectedModel: string;
  selectedAgent: Agent | null;
  userSettings: UserSettings;
  currentConversationId: string | null;
  currentConversation: any | null; // 添加conversation参数
  onCreateConversation: () => Promise<string | null>;
  isCreatingConversation: boolean;
  messageSender: UseMessageSenderReturn;
  models: any[]; // 添加models参数
}

export function ChatArea({
  chatMode,
  selectedModel,
  selectedAgent,
  userSettings,
  currentConversationId,
  currentConversation, // 添加conversation参数
  onCreateConversation,
  isCreatingConversation,
  messageSender,
  models, // 添加models参数
}: ChatAreaProps) {
  // 检查是否已选择模型或Agent
  const hasSelection = chatMode === 'model' ? !!selectedModel : !!selectedAgent;

  return (
    <div className="flex-1 flex flex-col bg-theme-background min-h-0">
      {!hasSelection ? (
        // 未选择状态的欢迎界面
        <WelcomeScreen chatMode={chatMode} />
      ) : (
        // 已选择状态的聊天界面
        <ChatInterface
          chatMode={chatMode}
          selectedModel={selectedModel}
          selectedAgent={selectedAgent}
          userSettings={userSettings}
          currentConversationId={currentConversationId}
          currentConversation={currentConversation} // 传递conversation参数
          onCreateConversation={onCreateConversation}
          isCreatingConversation={isCreatingConversation}
          messageSender={messageSender}
          models={models} // 传递models参数
        />
      )}
    </div>
  );
}

// 欢迎界面组件
function WelcomeScreen({ chatMode }: { chatMode: ChatMode }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="mb-6">
          {chatMode === 'model' ? (
            <Bot className="w-16 h-16 text-theme-primary mx-auto mb-4" />
          ) : (
            <Bot className="w-16 h-16 text-theme-primary mx-auto mb-4" />
          )}
        </div>
        
        <h2 className="text-2xl font-bold text-theme-foreground mb-4">
          Kun Avatar
        </h2>
        
        <p className="text-theme-foreground-muted mb-6 leading-relaxed">
        </p>
      </div>
    </div>
  );
}

// 聊天界面组件
function ChatInterface({
  chatMode,
  selectedModel,
  selectedAgent,
  currentConversationId,
  currentConversation, // 添加conversation参数
  messageSender,
  models, // 添加models参数
}: {
  chatMode: ChatMode;
  selectedModel: string;
  selectedAgent: Agent | null;
  userSettings: UserSettings;
  currentConversationId: string | null;
  currentConversation: any | null; // 添加conversation类型
  onCreateConversation: () => Promise<string | null>;
  isCreatingConversation: boolean;
  messageSender: UseMessageSenderReturn;
  models: any[]; // 添加models类型
}) {
  // 删除确认弹窗状态
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    open: boolean;
    messageId: string | null;
  }>({
    open: false,
    messageId: null,
  });

  // 图片预览模态框状态
  const [imagePreviewModal, setImagePreviewModal] = useState<{
    isOpen: boolean;
    imageUrl: string;
    imageIndex: number;
    images: string[];
  }>({ isOpen: false, imageUrl: '', imageIndex: 0, images: [] });

  // 处理图片预览（稳定回调，避免子项重复渲染）
  const handleImagePreview = useCallback((imageUrl: string, imageIndex: number, images: string[]) => {
    setImagePreviewModal({
      isOpen: true,
      imageUrl,
      imageIndex,
      images
    });
  }, []);

  // 关闭图片预览
  const handleCloseImagePreview = useCallback(() => {
    setImagePreviewModal({ isOpen: false, imageUrl: '', imageIndex: 0, images: [] });
  }, []);

  // 删除消息的处理函数
  const handleDeleteMessage = useCallback(async (messageId: string) => {
    // 检查是否为临时ID（前端生成的ID）
    if (messageId.startsWith('msg_')) {
      alert('无法删除临时消息，请刷新页面后重试');
      return;
    }

    // 检查是否为有效的数字ID
    const numericId = parseInt(messageId, 10);
    if (isNaN(numericId)) {
      alert('无效的消息ID格式');
      return;
    }

    // 显示删除确认弹窗
    setDeleteConfirmModal({
      open: true,
      messageId: messageId,
    });
  }, []);

  // 确认删除消息
  const confirmDeleteMessage = async () => {
    const messageId = deleteConfirmModal.messageId;
    if (!messageId) return;

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        alert('请先登录');
        return;
      }

      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '删除失败' }));
        throw new Error(errorData.error || '删除消息失败');
      }

      const result = await response.json();
      
      if (result.success) {
        // 删除成功，立即更新前端消息列表
        messageSender.removeMessage(messageId);
      } else {
        throw new Error(result.error || '删除消息失败');
      }
    } catch (error) {
      console.error('删除消息失败:', error);
      const errorMessage = error instanceof Error ? error.message : '删除消息失败';
      alert(`删除消息失败: ${errorMessage}`);
    } finally {
      // 关闭确认弹窗
      setDeleteConfirmModal({
        open: false,
        messageId: null,
      });
    }
  };

  // 取消删除
  const cancelDeleteMessage = () => {
    setDeleteConfirmModal({
      open: false,
      messageId: null,
    });
  };
  return (
    <>
      <div className="flex-1 overflow-auto scrollbar-thin p-4 min-h-0">
        <div className="max-w-4xl mx-auto h-full">
          {currentConversationId ? (
            // 有对话ID时显示消息列表
            <div className="space-y-4">          
              {/* 消息列表 */}
              <MessageList
                messages={messageSender.messages}
                isStreaming={messageSender.isStreaming}
                error={messageSender.error}
                isLoadingHistory={messageSender.isLoadingHistory}
                chatMode={chatMode}
                selectedAgent={selectedAgent}
                models={models} // 传递models参数
                conversation={currentConversation} // 传递conversation参数
                onDeleteMessage={handleDeleteMessage}
                onImagePreview={handleImagePreview} // 添加图片预览回调
              />
            </div>
          ) : (
            // 没有对话ID时的提示 - 使用flex布局将内容推到底部
            <div className="h-full flex flex-col justify-end">
              <div className="text-center pb-1">
                <p className="text-theme-foreground-muted text-sm">
                  发送消息将自动创建新对话
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 删除确认弹窗 */}
      <Modal
        open={deleteConfirmModal.open}
        onClose={cancelDeleteMessage}
        title="确认删除"
        icon="🗑️"
        actions={[
          {
            label: '取消',
            onClick: cancelDeleteMessage,
            variant: 'secondary',
          },
          {
            label: '删除',
            onClick: confirmDeleteMessage,
            variant: 'danger',
            autoFocus: true,
          },
        ]}
      >
        <p>确定要删除这条消息吗？此操作无法撤销。</p>
      </Modal>

      {/* 图片预览模态框 */}
      <ImagePreviewModal
        isOpen={imagePreviewModal.isOpen}
        imageUrl={imagePreviewModal.imageUrl}
        imageIndex={imagePreviewModal.imageIndex}
        images={imagePreviewModal.images}
        onClose={handleCloseImagePreview}
      />
    </>
  );
}