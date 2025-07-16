'use client';

import React from 'react';
import { DisplaySize } from '../input-controls';
import { Conversation } from '../../../../lib/database';
import { CustomModel } from '@/lib/database/custom-models';
import { SimpleMessage } from '../../types';
import { ChatHeader } from '../conversation/ChatHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ErrorDisplay } from '../ui/ErrorDisplay';
import { ToolSettings } from '../tools/ToolSettings';
import { useUserSettings } from '@/contexts/UserSettingsContext';

import { AgentWithRelations } from '@/app/agents/types';
import { Bot } from 'lucide-react';

type SelectorMode = 'model' | 'agent';

interface ChatContainerProps {
  // 对话相关
  currentConversation: Conversation | null;
  
  // 模型相关
  models: CustomModel[];
  selectedModel: string;
  onModelChange: (model: string) => void;

  // 智能体相关
  agents: AgentWithRelations[];
  selectedAgentId: number | null;
  onAgentChange: (agentId: number | null) => void;
  selectorMode: SelectorMode;
  onSelectorModeChange: (mode: SelectorMode) => void;
  isAgentMode?: boolean;
  
  // 自定义模型显示信息 - 重新添加以支持正确的模型显示
  customModels: Array<{
    base_model: string;
    display_name: string;
    family?: string;
  }>;
  
  // 消息相关
  messages: SimpleMessage[];
  inputMessage: string;
  onInputChange: (message: string) => void;
  onSendMessage: () => void;
  isStreaming: boolean;
  onStopGeneration: () => void;
  expandedThinkingMessages: Set<string>;
  onToggleThinkingExpand: (messageId: string) => void;
  
  // 工具相关
  enableTools: boolean;
  selectedTools: string[];
  onToolsToggle: (enabled: boolean) => void;
  onSelectedToolsChange: (tools: string[]) => void;
  onInsertText: (text: string) => void;
  onClearChat: () => void;
  
  // 错误处理
  error: string | null;
  onDismissError: () => void;
  
  // 对话创建
  onCreateConversation?: () => void;
  onCreateNewConversation?: () => Promise<void>;
  
  // 记忆面板现在由面板管理器统一管理
}

export function ChatContainer({
  currentConversation,
  models,
  selectedModel,
  onModelChange,
  agents,
  selectedAgentId,
  onAgentChange,
  selectorMode,
  onSelectorModeChange,
  isAgentMode = false,
  customModels,
  messages,
  inputMessage,
  onInputChange,
  onSendMessage,
  isStreaming,
  onStopGeneration,
  expandedThinkingMessages,
  onToggleThinkingExpand,
  enableTools,
  selectedTools,
  onToolsToggle,
  onSelectedToolsChange,
  onInsertText,
  onClearChat,
  error,
  onDismissError,
  onCreateNewConversation,

  // 移除记忆面板相关属性
}: ChatContainerProps) {
  // 使用用户设置hook
  const { settings } = useUserSettings();
  const currentDisplaySize = (settings.displaySize as DisplaySize) || 'fullscreen';

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* 顶部标题栏 - 始终显示 */}
      <ChatHeader
        currentConversation={currentConversation}
        models={models}
        selectedModel={selectedModel}
        onModelChange={onModelChange}
        agents={agents}
        selectedAgentId={selectedAgentId}
        onAgentChange={onAgentChange}
        selectorMode={selectorMode}
        onSelectorModeChange={onSelectorModeChange}
        isAgentMode={isAgentMode}
        onCreateNewConversation={onCreateNewConversation}
      />

      {/* 聊天消息区域 - 滚动优化 */}
      <div className="flex-1 overflow-hidden relative">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center px-4 h-full">
            <div className="text-center max-w-md mx-auto">
              <Bot className="w-16 h-16 text-theme-foreground-muted mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-theme-foreground mb-2">
                Kun Avatar
              </h2>
              
              {/* 如果没有选择模型，提示用户选择 */}
              {!selectedModel && (
                <p className="text-theme-foreground-muted text-sm">
                  请先在上方选择一个模型
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 overflow-y-auto scrollbar-thin">
            <div className="flex justify-center min-h-full">
              <div className={`w-full chat-container-responsive ${currentDisplaySize}`}>
                <MessageList
                  messages={messages}
                  isStreaming={isStreaming}
                  expandedThinkingMessages={expandedThinkingMessages}
                  onToggleThinkingExpand={onToggleThinkingExpand}

                  selectedModel={selectedModel}
                  customModels={customModels}
                  selectedAgent={selectedAgentId ? agents.find(a => a.id === selectedAgentId) : null}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 错误提示 - 添加居中和宽度控制 */}
      {error && (
        <div className="flex justify-center">
          <div className={`w-full px-4 mb-4 chat-container-responsive ${currentDisplaySize}`}>
            <ErrorDisplay 
              message={error} 
              onDismiss={onDismissError}
            />
          </div>
        </div>
      )}

      {/* 输入区域 - 添加居中和宽度控制 */}
      <div className="border-t border-theme-border">
        <div className="flex justify-center">
          <div className={`w-full p-4 chat-container-responsive ${currentDisplaySize}`}>
            {/* 工具设置组件 */}
            <ToolSettings
              selectedModel={selectedModel}
              enableTools={enableTools}
              selectedTools={selectedTools}
              onToolsToggle={onToolsToggle}
              onSelectedToolsChange={onSelectedToolsChange}
              onInsertText={onInsertText}
              onClearChat={onClearChat}

              // 记忆面板状态现在由面板管理器处理
              conversationId={currentConversation?.id}
              selectedAgentId={selectedAgentId}
            />
            
            {/* 消息输入组件 */}
            <MessageInput
              inputMessage={inputMessage}
              onInputChange={onInputChange}
              onSendMessage={onSendMessage}
              onStopGeneration={onStopGeneration}
              isStreaming={isStreaming}
              currentConversation={currentConversation}
              selectedModel={selectedModel}
            />
          </div>
        </div>
      </div>
    </div>
  );
}