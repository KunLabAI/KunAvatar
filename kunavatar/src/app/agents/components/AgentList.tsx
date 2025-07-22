'use client';

import React from 'react';
import Image from 'next/image';
import { AgentWithRelations } from '../types';
import { 
  Eye, 
  Trash2, 
  Cpu, 
  Server, 
  Bot, 
  Axe,
  Pencil,
  MessageCircle,
  Brain,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface AgentListProps {
  agents: AgentWithRelations[];
  isLoading?: boolean;
  onEdit: (agent: AgentWithRelations) => void;
  onDelete: (agentId: number) => void;
  onShowDetails?: (agent: AgentWithRelations) => void;
  onStartChat?: (agent: AgentWithRelations) => void;
  onShowMemory?: (agent: AgentWithRelations) => void;
}

const AgentList: React.FC<AgentListProps> = ({ 
  agents, 
  isLoading = false, 
  onEdit, 
  onDelete, 
  onShowDetails,
  onStartChat,
  onShowMemory 
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="spinner mb-4">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <p className="text-theme-foreground-muted">正在加载智能体...</p>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="steam-empty-state flex flex-col items-center justify-center py-16">
        <div className="steam-empty-icon w-16 h-16 flex items-center justify-center mb-4">
          <Bot className="w-8 h-8 text-theme-primary" />
        </div>
        <h3 className="text-lg font-medium text-theme-foreground mb-2">未找到任何智能体</h3>
        <p className="text-theme-foreground-muted text-center max-w-md">
          还没有创建任何智能体。点击上方的&ldquo;创建智能体&rdquo;按钮开始创建您的第一个智能体。
        </p>
      </div>
    );
  }

  return (
    <motion.div 
      className="steam-grid"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {agents.map((agent, index) => (
        <motion.div 
          key={agent.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="steam-card flex flex-col overflow-hidden group"
        >
          <div className="steam-card-glow" />
          {/* 卡片头部 */}
          <div className="p-6 flex-grow">
            {/* 智能体头像和基本信息 */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14">
                {agent.avatar ? (
                  <Image 
                    src={agent.avatar} 
                    alt={agent.name}
                    width={56}
                    height={56}
                    className="w-full h-full rounded-xl object-cover"
                  />
                ) : (
                  <span className="text-xl font-bold text-white">{agent.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-theme-foreground truncate group-hover:text-theme-primary transition-colors duration-300">
                  {agent.name}
                </h3>
                <p className="text-sm text-theme-foreground-muted mt-1 truncate" title={agent.model.display_name}>
                  {agent.model.display_name}
                </p>
              </div>
            </div>
            
            {/* 描述 */}
            <div className="mb-4">
              <p className="text-sm text-theme-foreground-secondary line-clamp-2 min-h-[2.5rem]">
                {agent.description || '暂无描述'}
              </p>
            </div>
            
            {/* 统计信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="steam-stat-card text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Server className="w-4 h-4 text-theme-primary" />
                  <span className="text-lg font-bold text-theme-foreground">
                    {agent.servers?.length || 0}
                  </span>
                </div>
              </div>
              <div className="steam-stat-card text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Axe className="w-4 h-4 text-theme-primary" />
                  <span className="text-lg font-bold text-theme-foreground">
                    {agent.tools?.length || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* 卡片底部操作区 - 悬停显示 */}
          <div className="bg-theme-background-secondary/50 px-2 pb-5 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out">

            <div className="flex items-center justify-evenly">
              {/* 开始对话按钮 */}
              {onStartChat && (
                <button
                  onClick={() => onStartChat(agent)}
                  className="flex items-center justify-center w-10 h-10 rounded-lg text-theme-foreground-muted hover:text-theme-success transition-all duration-300"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(156, 163, 175, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '';
                  }}
                  title="开始对话"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
              )}
              
              {/* 查看记忆按钮 */}
              {onShowMemory && (
                <button
                  onClick={() => onShowMemory(agent)}
                  className="flex items-center justify-center w-10 h-10 rounded-lg text-theme-foreground-muted hover:text-theme-info transition-all duration-300"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(156, 163, 175, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '';
                  }}
                  title="查看记忆"
                >
                  <Brain className="w-5 h-5" />
                </button>
              )}
              
              {/* 查看详情按钮 */}
              {onShowDetails && (
                <button
                  onClick={() => onShowDetails(agent)}
                  className="flex items-center justify-center w-10 h-10 rounded-lg text-theme-foreground-muted hover:text-theme-primary transition-all duration-300"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(156, 163, 175, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '';
                  }}
                  title="查看详情"
                >
                  <Eye className="w-5 h-5" />
                </button>
              )}
              
              {/* 编辑按钮 */}
              <button
                onClick={() => onEdit(agent)}
                className="flex items-center justify-center w-10 h-10 rounded-lg text-theme-foreground-muted hover:text-theme-warning transition-all duration-300"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(156, 163, 175, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '';
                }}
                title="编辑"
              >
                <Pencil className="w-5 h-5" />
              </button>
              
              {/* 删除按钮 */}
              <button
                onClick={() => onDelete(agent.id)}
                className="flex items-center justify-center w-10 h-10 rounded-lg text-theme-foreground-muted hover:text-theme-error transition-all duration-300"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(156, 163, 175, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '';
                }}
                title="删除"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default AgentList;