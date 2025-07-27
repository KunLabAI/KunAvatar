'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AgentWithRelations } from '@/app/agents/types';
import { Bot, X } from 'lucide-react';
import { AgentAvatar } from   '../app/chat/components/ui/AgentAvatar';
import Modal from '@/components/Modal';

interface AgentSelectorProps {
  agents: AgentWithRelations[];
  selectedAgentId: number | null;
  onAgentChange: (agentId: number | null) => void;
  disabled?: boolean;
  className?: string;
  currentConversationId?: string | null; // 新增：当前对话ID
  onCreateNewConversation?: () => Promise<void>;
}

export function AgentSelector({
  agents,
  selectedAgentId,
  onAgentChange,
  disabled = false,
  className = '',
  currentConversationId = null,
  onCreateNewConversation,
}: AgentSelectorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAgentId, setPendingAgentId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const currentAgent = selectedAgentId ? agents.find(a => a.id === selectedAgentId) : null;

  // 处理智能体选择的确认逻辑
  const handleAgentSelection = (agentId: number | null) => {
    // 如果有当前对话ID，显示确认弹窗
    if (currentConversationId) {
      setPendingAgentId(agentId);
      setShowConfirmModal(true);
    } else {
      // 没有对话ID，直接执行选择
      onAgentChange(agentId);
    }
    
    setIsDropdownOpen(false);
  };

  // 确认切换智能体
  const handleConfirmSwitch = async () => {
    setShowConfirmModal(false);
    
    // 如果有创建新对话的回调，先创建新对话
    if (onCreateNewConversation) {
      await onCreateNewConversation();
    }
    
    // 然后切换智能体
    onAgentChange(pendingAgentId);
    setPendingAgentId(null);
  };

  // 取消切换
  const handleCancelSwitch = () => {
    setShowConfirmModal(false);
    setPendingAgentId(null);
  };

  // 获取待选择的智能体信息
  const getPendingAgentName = () => {
    if (pendingAgentId === null) return '无Agent';
    const agent = agents.find(a => a.id === pendingAgentId);
    return agent ? agent.name : '未知智能体';
  };

  return (
    <>
      <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => !disabled && setIsDropdownOpen(!isDropdownOpen)}
        className={`form-input-base flex items-center gap-3 text-left ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        disabled={disabled}
      >
        {currentAgent ? (
          <AgentAvatar 
            agent={currentAgent} 
            size="sm" 
            className="rounded-md"
          />
        ) : (
          <div className="w-5 h-5 bg-theme-background-secondary rounded-md border border-theme-border flex-shrink-0 flex items-center justify-center">
            <Bot className="w-4 h-4 text-theme-foreground-muted" />
          </div>
        )}
        
        <span className="flex-1 text-left truncate">
          {currentAgent?.name || '请选择Agent'}
        </span>
        
        <svg
          className={`w-4 h-4 text-theme-foreground-muted transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isDropdownOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-theme-card border border-theme-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto scrollbar-thin">
          {/* 无Agent选项 */}
          <button
            onClick={() => handleAgentSelection(null)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-theme-card-hover transition-colors duration-200 ${
              !selectedAgentId ? 'bg-theme-background-secondary' : ''
            }`}
          >
            <div className="w-5 h-5 bg-gray-400 rounded-md flex items-center justify-center flex-shrink-0">
              <X className="w-3 h-3 text-white" />
            </div>
            
            <span className="flex-1 truncate text-theme-foreground-muted">
              无Agent
            </span>
            
            {!selectedAgentId && (
              <svg className="w-4 h-4 text-theme-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          
          {/* Agent列表 */}
          {agents.length > 0 ? agents.map((agent) => {
            const isSelected = agent.id === selectedAgentId;
            
            return (
              <button
                key={agent.id}
                onClick={() => handleAgentSelection(agent.id)}
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
          }) : (
            <div className="px-3 py-2 text-sm text-theme-foreground-muted">没有可用Agent</div>
          )}
        </div>
      )}
    </div>

    {/* 确认切换智能体的Modal */}
    <Modal
      open={showConfirmModal}
      onClose={handleCancelSwitch}
      title="切换智能体"
      icon="🤖"
      actions={[
        {
          label: '取消',
          onClick: handleCancelSwitch,
          variant: 'secondary'
        },
        {
          label: '确定',
          onClick: handleConfirmSwitch,
          variant: 'primary',
          autoFocus: true
        }
      ]}
    >
      <p>确定要切换到「{getPendingAgentName()}」吗？这将开始一个新的对话。</p>
    </Modal>
  </>
  );
}