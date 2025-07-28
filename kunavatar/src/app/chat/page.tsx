'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sidebar } from '../Sidebar';
import { ChatHeader, ChatArea } from './components';
import { MessageInput } from './components/MessageInput';
import { ToolSettings } from './components/tools/ToolSettings';
import { 
  useModelData, 
  useAgentData, 
  useConversations,
  useChatMode,
  useMessageSender,
  useModelToolValidation
} from './hooks';
import { STORAGE_KEYS } from './types';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { useAuth } from '@/hooks/useAuth';
import { PageLoading } from '@/components/Loading';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useNotification } from '@/components/notification';

// 导入工具相关的hook和函数
import { availableTools, getAllAvailableTools } from '@/lib/tools';
import { Tool } from '@/lib/ollama';

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <ChatPageContent />
    </ProtectedRoute>
  );
}

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // 🎨 用户设置和主题
  const { settings, loading: settingsLoading } = useUserSettings();
  
  // 🔔 通知系统
  const { warning, error: notifyError } = useNotification();
  
  // 📊 数据获取
  const { models, loading: modelsLoading, error: modelsError } = useModelData();
  const { agents, loading: agentsLoading, error: agentsError } = useAgentData();
  const { 
    conversations, 
    loading: conversationsLoading, 
    createConversation,
    updateConversationTitle,
    refreshConversations,
    error: conversationsError 
  } = useConversations();
  
  // 🔄 模式管理
  const {
    chatMode,
    setChatMode,
    selectedModel,
    setSelectedModel,
    selectedAgent,
    setSelectedAgent,
    initializeWithModels,
    initializeWithAgents,
    setModeFromConversation
  } = useChatMode();

  // 🗨️ 当前对话状态
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(() => {
    // 从localStorage恢复当前对话ID
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEYS.CURRENT_CONVERSATION) || null;
    }
    return null;
  });
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  // 🎛️ 面板状态管理
  const [showToolPanel, setShowToolPanel] = useState(false);
  const [showMemoryPanel, setShowMemoryPanel] = useState(false);
  const [showPromptOptimizePanel, setShowPromptOptimizePanel] = useState(false);

  // 🔧 工具状态管理
  const [enableTools, setEnableTools] = useState(false);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [allTools, setAllTools] = useState<Tool[]>(availableTools);
  
  // 🔧 使用新的工具验证Hook
  const {
    modelSupportsTools,
    isCheckingModel,
    shouldResetTools,
    clearResetFlag,
    handleToolsToggle: handleToolsToggleFromHook
  } = useModelToolValidation({
    selectedModel,
    selectedAgent,
    chatMode,
    enableTools,
    showWarning: warning,
    showError: notifyError
  });

  // 🔄 用于跟踪上一次状态的ref，用于精确判断何时需要清空消息
  const prevStateRef = useRef<{
    chatMode: 'model' | 'agent';
    selectedAgentId: number | null;
    currentConversationId: string | null;
  }>({
    chatMode: 'model',
    selectedAgentId: null,
    currentConversationId: null,
  });

  // 💬 消息发送管理
  const messageSender = useMessageSender({
    chatMode,
    selectedModel,
    selectedAgent: selectedAgent ? { 
      id: selectedAgent.id, 
      name: selectedAgent.name,
      model: selectedAgent.model 
    } : null,
    enableTools,
    selectedTools,
    onTitleUpdate: useCallback((conversationId: string, title: string) => {
      console.log('📝 收到标题更新:', conversationId, title);
      // 更新当前对话的标题
      if (updateConversationTitle) {
        updateConversationTitle(conversationId, title);
      }
      // 不再调用 refreshConversations()，因为 updateConversationTitle 已经更新了本地状态
      // 这样可以避免页面刷新，提供更好的用户体验
    }, [updateConversationTitle]),
    onConversationCleared: useCallback(() => {
      console.log('🗑️ 收到对话清除通知，重置页面状态');
      // 清除当前对话ID
      setCurrentConversationId(null);
      
      // 重置URL，移除对话ID参数  
      if (typeof window !== 'undefined') {
        const newUrl = '/chat';
        window.history.replaceState(null, '', newUrl);
        console.log('📍 已重置URL:', newUrl);
      }
    }, []),
  });

  // 🔧 监听工具重置信号，自动关闭不支持的工具
  useEffect(() => {
    if (shouldResetTools && enableTools) {
      console.log('🔄 检测到需要重置工具状态，自动关闭工具');
      setEnableTools(false);
      setSelectedTools([]);
      setShowToolPanel(false);
      // 清除重置标志，避免重复处理
      clearResetFlag();
    }
  }, [shouldResetTools, enableTools, clearResetFlag]);

  // 🚀 初始化模型选择 - 当模型数据加载完成后自动选择
  useEffect(() => {
    if (models && models.length > 0 && !modelsLoading) {
      console.log('模型数据已加载，开始初始化模型选择:', models.length, '个模型');
      initializeWithModels(models);
    }
  }, [models, modelsLoading, initializeWithModels]);

  // 🤖 初始化智能体选择 - 当智能体数据加载完成后恢复选择状态
  useEffect(() => {
    if (agents && agents.length > 0 && !agentsLoading) {
      initializeWithAgents(agents);
    }
  }, [agents, agentsLoading, initializeWithAgents]);

  // 🔧 智能体选择时自动设置工具 - 新增逻辑
  useEffect(() => {
    if (selectedAgent && chatMode === 'agent') {
      console.log(`🤖 智能体 "${selectedAgent.name}" 已选择，自动设置工具:`, selectedAgent.tools);
      
      // 如果智能体有工具，自动启用工具功能并设置工具列表
      if (selectedAgent.tools && selectedAgent.tools.length > 0) {
        setEnableTools(true);
        setSelectedTools(selectedAgent.tools.map(t => t.name));
        console.log(`✅ 已为智能体 "${selectedAgent.name}" 启用 ${selectedAgent.tools.length} 个工具:`, selectedAgent.tools.map(t => t.name));
      } else {
        // 如果智能体没有工具，禁用工具功能
        setEnableTools(false);
        setSelectedTools([]);
        console.log(`ℹ️ 智能体 "${selectedAgent.name}" 没有配置工具，已禁用工具功能`);
      }
    } else if (chatMode === 'model') {
      // 切换到模型模式时，保持当前的工具设置不变
      console.log('🔄 切换到模型模式，保持当前工具设置');
    }
  }, [selectedAgent, chatMode]);

  // 🔄 智能模式切换时清空消息 - 精确逻辑
  useEffect(() => {
    const currentState = {
      chatMode,
      selectedAgentId: selectedAgent?.id || null,
      currentConversationId,
    };
    
    const prevState = prevStateRef.current;
    
    // 🔥 修复：添加初始化标识，避免页面刷新时误触发重置
    const isInitialLoad = prevState.chatMode === 'model' && 
                         prevState.selectedAgentId === null && 
                         prevState.currentConversationId === null;
    
    // 判断是否需要清空消息和重置对话
    const shouldResetConversation = (() => {
      // 如果是初始加载状态，不进行重置
      if (isInitialLoad) {
        console.log('检测到初始加载状态，跳过对话重置');
        return false;
      }
      
      // 如果没有当前对话ID，说明是新对话状态，不需要处理
      if (!currentConversationId) {
        return false;
      }
      
      // 如果对话ID发生了变化，说明切换了对话，不需要在这里处理（会在加载历史时处理）
      if (prevState.currentConversationId !== currentConversationId) {
        return false;
      }
      
      // 如果聊天模式发生了变化（模型 <-> 智能体），需要重置对话
      if (prevState.chatMode !== chatMode) {
        console.log(`聊天模式从 ${prevState.chatMode} 切换到 ${chatMode}，重置对话`);
        return true;
      }
      
      // 如果在智能体模式下切换了不同的智能体，需要重置对话
      if (chatMode === 'agent' && prevState.selectedAgentId !== currentState.selectedAgentId && prevState.selectedAgentId !== null) {
        console.log(`智能体从 ${prevState.selectedAgentId} 切换到 ${currentState.selectedAgentId}，重置对话`);
        return true;
      }
      
      // 在模型模式下切换模型，不重置对话
      return false;
    })();
    
    if (shouldResetConversation) {
      // 清空消息历史
      messageSender.clearMessages();
      // 🔥 重要：清空当前对话ID，这样用户发送消息时会自动创建新对话
      setCurrentConversationId(null);
      // 更新URL，移除对话ID参数
      const newUrl = '/chat';
      window.history.replaceState(null, '', newUrl);
      console.log('已重置对话状态，下次发送消息时将创建新对话');
    }
    
    // 更新上一次的状态
    prevStateRef.current = currentState;
  }, [chatMode, selectedAgent?.id, currentConversationId]); // 🔥 修复：移除messageSender.clearMessages依赖项



  // 🔄 当currentConversationId改变时加载历史消息
  useEffect(() => {
    // 🔥 简化逻辑：只有在对话列表加载完成且对话ID有效时才加载历史
    if (currentConversationId && conversations && conversations.length > 0) {
      // 验证对话ID是否在conversations列表中存在
      const conversationExists = conversations.some(conv => conv.id === currentConversationId);
      
      if (conversationExists) {
        // 🔥 关键修复：检查是否是新创建的对话，新对话不需要加载历史
        const conversation = conversations.find(conv => conv.id === currentConversationId);
        if (conversation) {
          // 检查对话是否有消息（通过created_at和updated_at判断）
          const isNewConversation = conversation.created_at === conversation.updated_at;
          
          if (isNewConversation) {
            console.log('🆕 检测到新对话，只设置模式，不加载历史消息:', currentConversationId);
            // 对于新对话，只设置模式，不加载历史消息
            if (agents && agents.length > 0) {
              setModeFromConversation(conversation, agents);
            }
          } else {
            console.log('🔄 开始加载已有对话的历史消息:', currentConversationId);
            // 只有已有消息的对话才加载历史
            messageSender.loadConversationHistory(currentConversationId).then(result => {
              if (result?.conversation && agents && agents.length > 0) {
                console.log('🔄 加载对话历史完成，自动设置模式:', result.conversation);
                setModeFromConversation(result.conversation, agents);
              }
            }).catch(error => {
              console.error('加载对话历史失败:', error);
            });
          }
        }
      } else {
        console.warn('⚠️ 对话ID无效，不加载历史消息:', currentConversationId);
        // 清除无效的对话ID
        setCurrentConversationId(null);
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', '/chat');
        }
      }
    }
  }, [currentConversationId, conversations, setModeFromConversation, agents]); // 🔥 简化：移除不必要的依赖项

  // 💾 持久化当前对话ID到localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (currentConversationId) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_CONVERSATION, currentConversationId);
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_CONVERSATION);
      }
    }
  }, [currentConversationId]);

  // 🔍 验证对话ID有效性 - 当conversations加载完成后验证当前对话ID
  useEffect(() => {
    // 🔥 修复：只在conversations刚加载完成时进行一次性验证，避免与历史加载逻辑重复
    if (conversations && conversations.length > 0 && currentConversationId) {
      // 这里只处理初始加载时的验证，历史加载时的验证已在上面的useEffect中处理
      console.log('🔍 验证初始对话ID有效性:', currentConversationId);
    }
  }, [conversations]); // 🔥 修复：只依赖conversations，避免重复验证

  // 🔗 处理URL参数 - 优化依赖项避免无限循环
  useEffect(() => {
    const conversationId = searchParams.get('id');
    const isNew = searchParams.get('new') === 'true';

    if (conversationId) {
      // 加载指定对话，但要验证对话是否有效
      console.log('从URL加载对话:', conversationId);
      
      // 验证对话ID是否在conversations列表中存在
      if (conversations && conversations.length > 0) {
        const conversationExists = conversations.some(conv => conv.id === conversationId);
        if (conversationExists) {
          // 🔥 修复：只有当currentConversationId与URL中的不同时才设置，避免重复触发
          if (currentConversationId !== conversationId) {
            setCurrentConversationId(conversationId);
            console.log('✅ 对话ID有效，已设置');
          } else {
            console.log('✅ 对话ID已经是当前对话，无需重复设置');
          }
        } else {
          console.warn('⚠️ 对话ID无效，重置到首页');
          setCurrentConversationId(null);
          window.history.replaceState(null, '', '/chat');
        }
      } else {
        // 如果conversations还未加载，暂时设置，等后续验证
        if (currentConversationId !== conversationId) {
          setCurrentConversationId(conversationId);
        }
      }
    } else if (isNew) {
      // 准备创建新对话 - 清空消息历史
      console.log('准备创建新对话，清空消息历史');
      setCurrentConversationId(null);
      messageSender.clearMessages(); // 🔥 新增：清空消息历史
    }
    // 🔥 修复：移除else分支，避免在没有URL参数时清空已恢复的对话ID
    // 这样页面刷新后能保持之前的对话状态
  }, [searchParams, conversations, currentConversationId]); // 🔥 关键修复：添加currentConversationId依赖项用于比较

  // 🤖 处理智能体URL参数 - 单独的useEffect避免循环依赖
  useEffect(() => {
    const isNew = searchParams.get('new') === 'true';
    const agentParam = searchParams.get('agent');
    
    if (isNew && agentParam && agents && agents.length > 0) {
      const agentId = parseInt(agentParam);
      const targetAgent = agents.find(agent => agent.id === agentId);
      
      if (targetAgent) {
        console.log('从URL参数选择智能体:', targetAgent.name, 'ID:', agentId);
        // 切换到智能体模式
        setChatMode('agent');
        // 选择对应的智能体
        setSelectedAgent(targetAgent);
        // 设置智能体对应的模型
        setSelectedModel(targetAgent.model.base_model);
        // 如果智能体有工具，自动启用工具功能
        if (targetAgent.tools && targetAgent.tools.length > 0) {
          setEnableTools(true);
          setSelectedTools(targetAgent.tools.map(t => t.name));
        }
      } else {
        console.warn('未找到指定的智能体，ID:', agentId);
      }
    }
  }, [searchParams, agents, setChatMode, setSelectedAgent, setSelectedModel, setEnableTools, setSelectedTools]);

  // 🆕 创建新对话（业务逻辑层）
  const handleCreateNewConversation = async (): Promise<string | null> => {
    if (isCreatingConversation) return null;

    try {
      setIsCreatingConversation(true);
      
      // 🔥 新增：创建新对话前先清空消息历史
      console.log('创建新对话前清空消息历史');
      messageSender.clearMessages();
      
      // 根据当前模式创建对话
      const conversationData = {
        title: chatMode === 'model' 
          ? `${selectedModel || '模型'}对话` 
          : `${selectedAgent?.name || '智能体'}对话`,
        model: chatMode === 'model' ? selectedModel : undefined,
        agent_id: chatMode === 'agent' ? selectedAgent?.id : undefined,
      };

      console.log('创建新对话:', conversationData);
      const newConversation = await createConversation(conversationData);
      if (newConversation) {
        console.log('新对话创建成功:', newConversation.id);
        setCurrentConversationId(newConversation.id);
        // 更新URL但不刷新页面
        const newUrl = `/chat?id=${newConversation.id}`;
        window.history.replaceState(null, '', newUrl);
        return newConversation.id;
      }
      return null;
    } catch (error) {
      console.error('创建对话失败:', error);
      return null;
    } finally {
      setIsCreatingConversation(false);
    }
  };

  // 🔧 工具功能函数



  // 验证模型是否支持工具调用的逻辑已移至useModelToolValidation Hook

  // 加载所有可用工具（包括MCP工具）
  const loadTools = async () => {
    try {
      const tools = await getAllAvailableTools();
      setAllTools(tools);
    } catch (error) {
      console.error('加载工具失败:', error);
      setAllTools(availableTools);
    }
  };

  useEffect(() => {
    loadTools();
  }, []);

  // 🔧 工具相关处理函数（使用新Hook）
  const handleToolsToggle = useCallback(async () => {
    const result = await handleToolsToggleFromHook(setEnableTools, setShowToolPanel);
    // 如果是关闭工具，同时关闭设置面板
    if (enableTools && result) {
      setShowToolPanel(false);
    }
  }, [handleToolsToggleFromHook, enableTools]);

  const handleClearChat = useCallback(async () => {
    if (!currentConversationId) {
      // 如果没有当前对话，只清除前端消息
      messageSender.clearMessages();
      return;
    }

    try {
      // 调用后端API清除对话消息
      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const response = await fetch(`/api/conversations/${currentConversationId}/clear`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // API调用成功，清除前端消息
        messageSender.clearMessages();
        console.log('✅ 对话已成功清空');
      } else {
        const errorData = await response.json();
        console.error('❌ 清空对话失败:', errorData.error);
        // 即使API失败，也清除前端消息（用户体验优先）
        messageSender.clearMessages();
      }
    } catch (error) {
      console.error('❌ 清空对话请求失败:', error);
      // 网络错误时也清除前端消息
      messageSender.clearMessages();
    }
  }, [messageSender, currentConversationId]);

  const handleInsertText = useCallback((text: string) => {
    // 可以在这里添加文本插入逻辑
    console.log('插入文本:', text);
  }, []);

  const handleToolSelection = useCallback((toolName: string) => {
    const newSelectedTools = selectedTools.includes(toolName)
      ? selectedTools.filter(t => t !== toolName)
      : [...selectedTools, toolName];
    setSelectedTools(newSelectedTools);
  }, [selectedTools]);

  // 🎛️ 面板切换处理函数 - 实现互斥功能
  const handleToggleToolPanel = useCallback(() => {
    setShowToolPanel(prev => {
      const newValue = !prev;
      if (newValue) {
        // 如果要打开工具面板，关闭其他面板
        setShowMemoryPanel(false);
        setShowPromptOptimizePanel(false);
      }
      return newValue;
    });
  }, []);

  const handleToggleMemoryPanel = useCallback(() => {
    setShowMemoryPanel(prev => {
      const newValue = !prev;
      if (newValue) {
        // 如果要打开记忆面板，关闭其他面板
        setShowToolPanel(false);
        setShowPromptOptimizePanel(false);
      }
      return newValue;
    });
  }, []);

  const handleTogglePromptOptimizePanel = useCallback(() => {
    setShowPromptOptimizePanel(prev => {
      const newValue = !prev;
      if (newValue) {
        // 如果要打开提示词优化面板，关闭其他面板
        setShowToolPanel(false);
        setShowMemoryPanel(false);
      }
      return newValue;
    });
  }, []);

  // 🎯 加载状态
  const isLoading = settingsLoading || modelsLoading || agentsLoading || conversationsLoading;

  // ❌ 错误处理
  const hasError = modelsError || agentsError || conversationsError;

  // 📋 获取当前对话对象
  const currentConversation = useMemo(() => {
    if (!currentConversationId || !conversations) return null;
    return conversations.find(conv => conv.id === currentConversationId) || null;
  }, [currentConversationId, conversations]);

  if (isLoading) {
    return (
      <PageLoading 
        text="loading..." 
        fullScreen={true}
      />
    );
  }

  if (hasError) {
    return (
      <div className="flex h-screen bg-theme-background-secondary dark:bg-theme-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 p-8">
            <div className="text-red-500 text-4xl">⚠️</div>
            <h2 className="text-xl font-semibold text-theme-foreground">初始化失败</h2>
            <p className="text-theme-foreground-muted max-w-md">
              {modelsError || agentsError || conversationsError}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-theme-primary text-theme-primary-foreground rounded-lg hover:bg-theme-primary/90 transition-colors"
            >
              重新加载
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-theme-background-secondary dark:bg-theme-background">
      {/* 🏠 侧边栏 */}
      <Sidebar 
        conversations={conversations}
        chatMode={chatMode}
        selectedAgent={selectedAgent}
      />

      {/* 🎯 主聊天区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 📋 顶部选择栏 */}
        <ChatHeader
          currentConversation={currentConversation}
          chatMode={chatMode}
          onModeChange={setChatMode}
          models={models}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          agents={agents}
          selectedAgent={selectedAgent}
          onAgentChange={setSelectedAgent}
        />

        {/* 💬 聊天消息区域 */}
        <ChatArea
          chatMode={chatMode}
          selectedModel={selectedModel}
          selectedAgent={selectedAgent}
          userSettings={settings}
          currentConversationId={currentConversationId}
          currentConversation={currentConversation}
          onCreateConversation={handleCreateNewConversation}
          isCreatingConversation={isCreatingConversation}
          messageSender={messageSender}
          models={models}
        />

        {/* ⌨️ 输入区域 */}
        <div className="relative">
          <MessageInput
            chatMode={chatMode}
            selectedModel={selectedModel}
            selectedAgent={selectedAgent}
            currentConversationId={currentConversationId}
            onCreateConversation={handleCreateNewConversation}
            isCreatingConversation={isCreatingConversation}
            onSendMessage={async (message: string) => {
              let conversationId = currentConversationId;
              if (!conversationId) {
                conversationId = await handleCreateNewConversation();
                if (!conversationId) {
                  console.error('创建对话失败');
                  return;
                }
              }
              await messageSender.sendMessage(message, conversationId);
            }}
            isStreaming={messageSender.isStreaming}
            onStopGeneration={messageSender.stopGeneration}
            
            // 修复的控件相关属性
            enableTools={enableTools}
            selectedToolsCount={selectedTools.length}
            onToolsToggle={handleToolsToggle}
            onClearChat={handleClearChat}
            onInsertText={handleInsertText}
            
            // 面板状态管理
            showToolPanel={showToolPanel}
            showMemoryPanel={showMemoryPanel}
            showPromptOptimizePanel={showPromptOptimizePanel}
            onToggleToolPanel={handleToggleToolPanel}
            onToggleMemoryPanel={handleToggleMemoryPanel}
            onTogglePromptOptimizePanel={handleTogglePromptOptimizePanel}
            
            // 修复的模型工具支持检测
            isCheckingModel={isCheckingModel}
            modelSupportsTools={modelSupportsTools}
          />

          {/* 🔧 工具面板 - 修复的数据传递 */}
          <ToolSettings
            enableTools={enableTools}
            selectedTools={selectedTools}
            allTools={allTools}
            onToolSelection={handleToolSelection}
            showToolPanel={showToolPanel}
            showMemoryPanel={showMemoryPanel}
            showPromptOptimizePanel={showPromptOptimizePanel}
            onToggleToolPanel={handleToggleToolPanel}
            onToggleMemoryPanel={handleToggleMemoryPanel}
            onTogglePromptOptimizePanel={handleTogglePromptOptimizePanel}
            onInsertText={handleInsertText}
            conversationId={currentConversationId}
            selectedAgentId={chatMode === 'agent' ? selectedAgent?.id : undefined}
          />
        </div>
      </div>
    </div>
  );
}