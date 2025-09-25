'use client';

import React, { useState, useRef, useEffect } from 'react';
import ModelLogo from '@/app/model-manager/components/ModelLogo';
import { AgentAvatar } from './ui/AgentAvatar';
import { Brain, Bot, ChevronDown, MessageSquare } from 'lucide-react';
import Modal from '@/components/Modal';
import { useI18n } from '@/contexts/I18nContext';

type ChatMode = 'model' | 'agent';

// 暂时定义Agent和Model类型，稍后会替换为正确的导入
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

interface Model {
  id: number;
  base_model: string;
  display_name: string;
  model_hash: string;
  description?: string | null;
  family: string;
  system_prompt?: string | null;
  parameters: Record<string, any>;
  template?: string | null;
  license?: string | null;
  tags?: string[];
  created_at: string;
  updated_at?: string | null;
  size?: number | null;
  digest?: string | null;
  ollama_modified_at?: string | null;
  architecture?: string | null;
  parameter_count?: number | null;
  context_length?: number | null;
  embedding_length?: number | null;
  quantization_level?: string | null;
  format?: string | null;
  capabilities?: string[];
}

interface ChatHeaderProps {
  currentConversation?: any;
  chatMode: ChatMode;
  onModeChange: (mode: ChatMode, isUserAction?: boolean) => void;
  models: Model[];
  selectedModel: string;
  onModelChange: (model: string) => void;
  agents: Agent[];
  selectedAgent: Agent | null;
  onAgentChange: (agent: Agent | null) => void;
  isAgentMode?: boolean;
  onCreateNewConversation?: (targetMode?: ChatMode) => Promise<string | null>;
}

export function ChatHeader({
  currentConversation,
  chatMode,
  onModeChange,
  models,
  selectedModel,
  onModelChange,
  agents,
  selectedAgent,
  onAgentChange,
  isAgentMode = false,
  onCreateNewConversation,
}: ChatHeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showModeChangeModal, setShowModeChangeModal] = useState(false);
  const [pendingMode, setPendingMode] = useState<ChatMode | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n(); // 多语言支持
  
  // 标题逻辑：如果有对话则显示对话标题，否则显示默认格式的新对话标题
  const title = currentConversation 
    ? currentConversation.title 
    : `${t('chat.header.newConversation')} - ${new Date().toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`;

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 适配层：将Model[]转换为ModelSelector期望的格式
  const adaptedModels = models.map(model => ({
    name: model.base_model,
    model: model.base_model,
    modified_at: model.ollama_modified_at || model.updated_at || model.created_at,
    size: model.size || 0,
    digest: model.digest || '',
    details: {
      parent_model: '',
      format: model.format || '',
      family: model.family,
      families: [],
      parameter_size: model.parameter_count ? `${model.parameter_count}` : '',
      quantization_level: model.quantization_level || '',
    }
  }));

  const adaptedCustomModels = models.map(model => ({
    base_model: model.base_model,
    display_name: model.display_name,
    family: model.family,
  }));

  // 适配Agent数据为AgentSelector期望的格式
  const adaptedAgents = agents.map(agent => ({
    ...agent,
    id: agent.id,
    name: agent.name,
    description: agent.description,
    avatar: agent.avatar,
    model: agent.model,
  }));

  // 处理模式切换，在智能体模式下限制某些操作
  const handleModeChange = (mode: ChatMode) => {
    if (isAgentMode && mode === 'model') {
      console.log('🚫 当前处于智能体模式，无法切换到模型模式');
      return;
    }
    
    // 如果当前模式与目标模式相同，直接返回
    if (chatMode === mode) {
      return;
    }
    
    // 如果有当前对话，显示确认弹窗
    if (currentConversation) {
      setPendingMode(mode);
      setShowModeChangeModal(true);
      setIsDropdownOpen(false); // 关闭下拉菜单
      return;
    }
    
    // 没有当前对话，直接切换
    performModeChange(mode);
  };

  // 执行模式切换的实际逻辑
  const performModeChange = (mode: ChatMode) => {
    // 传递 isUserAction=true 表示这是用户手动切换
    onModeChange(mode, true);
    
    // 🔥 简化：移除自动选择逻辑，让page.tsx中的逻辑统一处理
    // 这样避免了重复的自动选择逻辑
    console.log('🔄 模式切换到:', mode);
  };

  // 确认模式切换
  const handleConfirmModeChange = async () => {
    if (pendingMode) {
      try {
        // 只切换模式，不立即创建新对话
        // 让用户先选择模型/智能体，然后在发送消息时再创建新对话
        performModeChange(pendingMode);
        console.log('✅ 模式已切换到:', pendingMode, '等待用户选择');
      } catch (error) {
        console.error('❌ 模式切换失败:', error);
      }
    }
    setShowModeChangeModal(false);
    setPendingMode(null);
  };

  // 取消模式切换
  const handleCancelModeChange = () => {
    setShowModeChangeModal(false);
    setPendingMode(null);
  };

  // 处理模型选择
  const handleModelSelect = (modelName: string) => {
    onModelChange(modelName);
    setIsDropdownOpen(false);
  };

  // 处理智能体选择
  const handleAgentSelect = (agentId: number | null) => {
    const agent = agents.find(a => a.id === agentId) || null;
    onAgentChange(agent);
    setIsDropdownOpen(false);
  };

  // 获取当前显示的信息
  const getCurrentDisplayInfo = () => {
    if (isAgentMode || chatMode === 'agent') {
      if (selectedAgent) {
        return {
          mode: 'agent' as const,
          icon: <AgentAvatar agent={selectedAgent} size="sm" className="rounded-md" />,
          name: selectedAgent.name,
          label: 'Agent'
        };
      } else {
        return {
          mode: 'agent' as const,
          icon: <div className="w-5 h-5 bg-theme-background-secondary rounded-md border border-theme-border flex-shrink-0 flex items-center justify-center">
            <Bot className="w-4 h-4 text-theme-foreground-muted" />
          </div>,
          name: t('chat.header.selectAgent'),
          label: 'Agent'
        };
      }
    } else {
      if (selectedModel) {
        const currentModel = models.find(m => m.base_model === selectedModel);
        const customModel = adaptedCustomModels.find(m => m.base_model === selectedModel);
        const displayName = customModel?.display_name || selectedModel;
        const family = customModel?.family || currentModel?.family || selectedModel;
        
        return {
          mode: 'model' as const,
          icon: <ModelLogo
            modelName={family}
            size="sm"
            containerSize={24}
            imageSize={16}
            className="bg-theme-background-secondary border-theme-border flex-shrink-0"
          />,
          name: displayName,
          label: 'Model'
        };
      } else {
        return {
          mode: 'model' as const,
          icon: <div className="w-5 h-5 bg-theme-background-secondary rounded-md flex-shrink-0 flex items-center justify-center">
            <Brain className="w-4 h-4 text-theme-foreground-muted" />
          </div>,
          name: t('chat.header.selectModel'),
          label: 'Model'
        };
      }
    }
  };

  const currentInfo = getCurrentDisplayInfo();

  return (
    <div className="h-12 px-3 sm:px-4 bg-theme-background-secondary dark:bg-theme-background duration-300 flex items-center">
      <div className="flex items-center justify-between w-full gap-2 sm:gap-6">
        {/* 左侧：统一的模式选择器 */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <div className="relative w-60" ref={dropdownRef}>
            {/* 主选择按钮 */}
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="form-input-base flex items-center gap-3 text-left w-full h-9"
            >
              {/* 模式标签和名称 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-theme-foreground-muted font-medium">
                    {currentInfo.label}
                  </span>
                  {/* 图标 */}
                  {currentInfo.icon}
                  <span className="text-sm text-theme-foreground truncate">
                    {currentInfo.name}
                  </span>
                </div>
              </div>
              
              {/* 下拉箭头 */}
              <ChevronDown 
                className={`w-4 h-4 text-theme-foreground-muted transition-transform duration-200 flex-shrink-0 ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`} 
              />
            </button>

            {/* 下拉菜单 */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-theme-card rounded-lg shadow-lg z-50">
                {/* 模式切换区域 */}
                <div className="p-3 border-b border-theme-border bg-theme-background-secondary/50">
                  <div className="text-xs text-theme-foreground-muted mb-2 font-medium">{t('chat.header.selectMode')}</div>
                  <div className="flex items-center bg-theme-background-tertiary p-0.5 rounded-md">
                    <button 
                      onClick={() => handleModeChange('model')}
                      className={`flex-1 px-3 py-1.5 text-sm rounded-sm transition-all duration-200 ${
                        (chatMode === 'model' && !isAgentMode)
                          ? 'bg-theme-card shadow text-theme-foreground font-medium' 
                          : isAgentMode
                          ? 'text-theme-foreground-muted opacity-50 cursor-not-allowed'
                          : 'text-theme-foreground-muted hover:text-theme-foreground hover:bg-theme-background-secondary/50'
                      }`}
                      disabled={isAgentMode}
                      title={isAgentMode ? '当前处于智能体模式' : ''}
                    >
                      Model
                    </button>
                    <button
                      onClick={() => handleModeChange('agent')}
                      className={`flex-1 px-3 py-1.5 text-sm rounded-sm transition-all duration-200 ${
                        (chatMode === 'agent' || isAgentMode)
                          ? 'bg-theme-card shadow text-theme-foreground font-medium' 
                          : 'text-theme-foreground-muted hover:text-theme-foreground hover:bg-theme-background-secondary/50'
                      }`}
                    >
                      Agent
                    </button>
                  </div>
                </div>

                {/* 选项列表 */}
                <div className="max-h-60 overflow-y-auto scrollbar-thin">
                  {(isAgentMode || chatMode === 'agent') ? (
                    // Agent 选项
                    <>
                      {/* 无Agent选项 */}
                      <button
                        onClick={() => handleAgentSelect(null)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-theme-card-hover transition-colors duration-200 ${
                          !selectedAgent ? 'bg-theme-background-secondary' : ''
                        }`}
                      >
                        <div className="w-5 h-5 bg-gray-400 rounded-md flex items-center justify-center flex-shrink-0">
                          <Bot className="w-3 h-3 text-white" />
                        </div>
                        
                        <span className="flex-1 truncate text-theme-foreground-muted">
                          {t('chat.header.noAgent')}
                        </span>
                        
                        {!selectedAgent && (
                          <svg className="w-4 h-4 text-theme-primary" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                      
                      {/* Agent列表 */}
                      {adaptedAgents.map((agent) => {
                        const isSelected = agent.id === selectedAgent?.id;
                        
                        return (
                          <button
                            key={agent.id}
                            onClick={() => handleAgentSelect(agent.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-theme-card-hover transition-colors duration-200 ${
                              isSelected ? 'bg-theme-background-secondary' : ''
                            }`}
                          >
                            <AgentAvatar 
                              agent={agent} 
                              size="sm" 
                              className="rounded-md"
                            />
                            
                            <span className="flex-1 truncate text-theme-foreground">
                              {agent.name}
                            </span>
                            
                            {isSelected && (
                              <svg className="w-4 h-4 text-theme-primary" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </>
                  ) : (
                    // Model 选项
                    <>
                      {/* 请选择模型选项 */}
                      <button
                        onClick={() => handleModelSelect('')}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-theme-card-hover transition-colors duration-200 ${
                          !selectedModel ? 'bg-theme-background-secondary' : ''
                        }`}
                      >
                        <div className="w-5 h-5 bg-theme-background-secondary rounded-md flex-shrink-0 flex items-center justify-center">
                          <Brain className="w-4 h-4 text-theme-foreground-muted" />
                        </div>
                        
                        <span className="flex-1 truncate text-theme-foreground-muted">
                          {t('chat.header.pleaseSelectModel')}
                        </span>
                        
                        {!selectedModel && (
                          <svg className="w-4 h-4 text-theme-primary" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                      
                      {/* 分隔线 */}
                      {models.length > 0 && (
                        <div className="border-t border-theme-border my-1"></div>
                      )}
                      
                      {/* 模型列表 */}
                      {models.length > 0 ? models.map((model) => {
                        const customModel = adaptedCustomModels.find(m => m.base_model === model.base_model);
                        const displayName = customModel?.display_name || model.base_model;
                        const family = customModel?.family || model.family;
                        const isSelected = model.base_model === selectedModel;
                        
                        return (
                          <button
                            key={model.base_model}
                            onClick={() => handleModelSelect(model.base_model)}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-theme-card-hover transition-colors duration-200 ${
                              isSelected ? 'bg-theme-background-secondary' : ''
                            }`}
                          >
                            <ModelLogo
                              modelName={family}
                              size="sm"
                              containerSize={24}
                              imageSize={16}
                              className="bg-theme-background-secondary border-theme-border flex-shrink-0"
                            />
                            
                            <span className="flex-1 truncate text-theme-foreground">
                              {displayName}
                            </span>
                            
                            {isSelected && (
                              <svg className="w-4 h-4 text-theme-primary" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        );
                      }) : (
                        <div className="px-3 py-2 text-sm text-theme-foreground-muted">{t('chat.header.noModelsAvailable')}</div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* 右侧：对话标题 - 桌面端显示 */}
        <div className="hidden md:block flex-shrink-0">
          <h2 className="text-base lg:text-lg font-semibold text-theme-foreground text-right truncate max-w-xs">
            {title}
          </h2>
        </div>
        
        {/* 移动端和平板端：简化标题或菜单按钮 */}
        <div className="md:hidden flex-shrink-0">
          <button 
            className="p-2 text-theme-foreground-muted hover:text-theme-foreground transition-colors duration-200"
            title={title}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* 模式切换确认弹窗 */}
      <Modal
        open={showModeChangeModal}
        onClose={handleCancelModeChange}
        title={t('chat.header.modeSwitchTitle')}
        icon={<MessageSquare className="text-theme-primary" />}
        actions={[
          {
            label: t('chat.header.modeSwitchCancel'),
            onClick: handleCancelModeChange,
            variant: 'secondary',
          },
          {
            label: t('chat.header.modeSwitchConfirm'),
            onClick: handleConfirmModeChange,
            variant: 'primary',
            autoFocus: true,
          },
        ]}
      >
        {t('chat.header.modeSwitchContent').replace('{mode}', pendingMode === 'model' ? t('chat.header.modelMode') : t('chat.header.agentMode'))}
      </Modal>
    </div>
  );
}