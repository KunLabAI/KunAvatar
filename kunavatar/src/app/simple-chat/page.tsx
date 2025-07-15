'use client';

import React, { useRef, Suspense } from 'react';
import { 
  useConversationManager, 
  useChatMessages, 
  useUrlHandler,
  useMessageLoader,
  useConversationEventHandlers,
  useAgentManager,
  useUIStateManager,
  useDataTransform,
  useStreamingHandlers,
  useMessageSender,
  useInitialization,
  useModelManager,
} from './hooks';
import { Sidebar } from '../Sidebar';
import { ChatContainer } from './components';
import { PageLoading } from '../../components/Loading';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// 内部组件，使用useSearchParams
function SimpleChatPageContent() {
  // 🔄 对话管理
  const {
    conversations,
    currentConversation,
    loading: conversationLoading,
    error: conversationError,
    loadConversations,
    loadConversationsIfNeeded,
    createConversation,
    switchConversation,
    deleteConversation,
    updateConversationTitle,
  } = useConversationManager();

  // 🎯 模型管理
  const { models, selectedModel, setSelectedModel, selectBestModel, isAgentMode } = useModelManager();

  // 💬 消息管理
  const {
    messages,
    setMessages,
    inputMessage,
    setInputMessage,
    isStreaming,
    setIsStreaming,
    expandedThinkingMessages,
    enableTools,
    setEnableTools,
    selectedTools,
    setSelectedTools,
    setActiveTool,
    setToolCalls,
    setCurrentAssistantMessageId,
    toggleThinkingExpand,
    stopGeneration,
    setAbortController,
  } = useChatMessages();

  // 🤖 Agent管理
  const {
    agents,
    selectedAgentId,
    selectedAgent,
    selectorMode,
    selectAgent,
    setSelectorMode,
     processUrlAgentParam,
  } = useAgentManager({
    setSelectedModel,
    setEnableTools,
    setSelectedTools,
    setSystemPrompt: (prompt) => {
       // 智能体管理模块会自动处理系统提示
       console.log('智能体系统提示已自动配置:', prompt);
     },
    currentConversation,
  });
  
  // 🎨 UI状态管理
  const {
    error,
    isInitializing,
    hasMinimumLoadTime,
    setError,
    setIsInitializing,
    dismissError,
  } = useUIStateManager();

  // 🔧 数据转换
  const {
    customModels,
    updateMessagesFromDatabase,
    generateCustomModels,
  } = useDataTransform();

  // 清理队列引用
  const cleanupHandlersRef = useRef<Array<() => void>>([]);

  // 🌊 流式处理
  const { createStreamHandlers } = useStreamingHandlers({
    setMessages,
    setActiveTool,
    setToolCalls,
    setCurrentAssistantMessageId,
    setIsStreaming,
    setError,
    loadConversations,
    updateConversationTitle,
    updateMessagesFromDatabase,
    currentConversation,
    selectedModel,
    cleanupHandlersRef,
  });

  // 📤 消息发送
  const { sendMessage, clearCurrentChat, insertText } = useMessageSender({
    currentConversation,
    selectedModel,
    selectedAgentId,
    inputMessage,
    isStreaming,
    enableTools,
    selectedTools,
    messages,
    setMessages,
    setInputMessage,
    setIsStreaming,
    setError,
    setToolCalls,
    setActiveTool,
    setCurrentAssistantMessageId,
    setAbortController,
    createConversation,
    createStreamHandlers,
  });

  // 🚀 初始化管理
  const { handleModelChange } = useInitialization({
    models,
    hasMinimumLoadTime,
    setIsInitializing,
    generateCustomModels,
    loadConversationsIfNeeded,
  });

  // 🔗 URL处理
  const { isProcessingUrl, setIsProcessingUrl } = useUrlHandler({
    models,
    selectedModel,
    currentConversation,
    conversationLoading,
    createConversation,
    switchConversation,
    setSelectedModel,
  });

  // 📥 消息加载
  useMessageLoader({
    currentConversation,
    setSelectedModel,
    setMessages,
    setToolCalls,
    selectedModel,
    models,
    selectBestModel,
  });

  // 🎯 对话事件处理
  const { handleLoadConversation, handleDeleteConversation } = useConversationEventHandlers({
    currentConversation,
    conversations,
    selectedModel,
    createConversation,
    switchConversation,
    deleteConversation,
    loadConversations,
    setMessages,
    setToolCalls,
    setSelectedModel,
    setError,
    setIsProcessingUrl,
  });

  // 简化的创建对话处理函数
  const handleCreateConversation = async () => {
    try {
      setIsProcessingUrl(true);
      const conversationId = await createConversation({
        model: selectedModel || 'llama3.2',
        agentId: selectedAgentId || undefined
      });
      
      if (conversationId) {
        setMessages([]);
        setToolCalls([]);
        setError(null);
        if (typeof window !== 'undefined') {
          window.history.pushState(null, '', `/simple-chat?id=${conversationId}`);
        }
      }
    } catch (err) {
      console.error('创建对话失败:', err);
      setError('创建对话失败');
    } finally {
      setTimeout(() => setIsProcessingUrl(false), 100);
    }
  };

  // 🧹 组件卸载时清理
  React.useEffect(() => {
    return () => {
      cleanupHandlersRef.current.forEach(cleanup => cleanup());
      cleanupHandlersRef.current = [];
    };
  }, []);

  // 模型切换处理器
  const onModelChange = (modelName: string) => {
    const conversationId = currentConversation?.id;
    handleModelChange(modelName, setSelectedModel, conversationId);
  };

  // Agent选择处理器
  const onAgentChange = (agentId: number | null) => {
    console.log(`🎯 onAgentChange 被调用: agentId=${agentId}, currentConversation=${currentConversation?.id}`);
    console.log(`🔍 调用前 selectedModel 状态:`, selectedModel);
    selectAgent(agentId, currentConversation?.id).then(() => {
      console.log(`🔍 selectAgent 完成后 selectedModel 状态:`, selectedModel);
    });
  };

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-theme-background-secondary dark:bg-theme-background overflow-hidden">
        {/* 侧边栏 */}
        <Sidebar conversations={conversations} />

        {/* 主聊天区域 */}
        {isInitializing ? (
          <div className="flex-1 overflow-auto">
            <PageLoading text="loading" fullScreen={true} />
          </div>
        ) : (
          <ChatContainer
            currentConversation={currentConversation}
            models={models}
            selectedModel={selectedModel}
            onModelChange={onModelChange}
            agents={agents}
            selectedAgentId={selectedAgentId}
            onAgentChange={onAgentChange}
            selectorMode={selectorMode}
            onSelectorModeChange={setSelectorMode}
            isAgentMode={isAgentMode}
            customModels={customModels}
            messages={messages}
            inputMessage={inputMessage}
            onInputChange={setInputMessage}
            onSendMessage={sendMessage}
            isStreaming={isStreaming}
            onStopGeneration={stopGeneration}
            expandedThinkingMessages={expandedThinkingMessages}
            onToggleThinkingExpand={toggleThinkingExpand}
            enableTools={enableTools}
            selectedTools={selectedTools}
            onToolsToggle={setEnableTools}
            onSelectedToolsChange={setSelectedTools}
            onInsertText={insertText}
            onClearChat={clearCurrentChat}
            error={error}
            onDismissError={dismissError}
            onCreateConversation={handleCreateConversation}
            onCreateNewConversation={handleCreateConversation}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

// 外部组件，用Suspense包装内部组件
export default function SimpleChatPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-background">
        <PageLoading text="loading" fullScreen={true} />
      </div>
    }>
      <SimpleChatPageContent />
    </Suspense>
  );
}