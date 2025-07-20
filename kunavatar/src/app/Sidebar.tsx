'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Settings, 
  PanelLeft, 
  PanelRight,
  PanelLeftClose,
  Server,
  BrainCircuit,
  Bot,
  MessageSquareText,
  History
} from 'lucide-react';
import { Conversation } from '@/lib/database';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';

interface SidebarProps {
  conversations: Conversation[];
}

// 侧边栏状态管理
function useSidebarState() {
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleSidebar = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-sidebar-state', newState ? 'expanded' : 'collapsed');
      localStorage.setItem('sidebar-expanded', JSON.stringify(newState));
    }
  };

  // 初始化状态
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-expanded');
      const initialState = saved ? JSON.parse(saved) : true;
      setIsExpanded(initialState);
      document.documentElement.setAttribute('data-sidebar-state', initialState ? 'expanded' : 'collapsed');
    }
  }, []);

  return { isExpanded, toggleSidebar };
}

export function Sidebar({ conversations }: SidebarProps) {
  const { isExpanded, toggleSidebar } = useSidebarState();
  const pathname = usePathname();
  const router = useRouter();

  // 处理创建新对话的逻辑
  const handleNewConversation = () => {
    router.push('/simple-chat?new=true');
  };

  // 处理开始对话按钮 - 进入最近一次对话或新建对话
  const handleStartChat = () => {
    // 获取最新的对话（按updated_at排序，第一个就是最新的）
    const latestConversation = conversations && conversations.length > 0 ? conversations[0] : null;
    
    if (latestConversation) {
      // 有对话历史，进入最新对话
      router.push(`/simple-chat?id=${latestConversation.id}`);
    } else {
      // 没有对话历史，新建对话
      router.push('/simple-chat?new=true');
    }
  };

  return (
    <>
      {/* 移动端触发区域 */}
      <div className="fixed left-0 top-0 w-5 h-full z-[999] bg-transparent md:hidden" />
      
      <div className="sidebar-container bg-theme-card border-r border-theme-border flex flex-col h-full">
        {/* 顶部区域 */}
        <div className="group p-4 border-b border-theme-border flex items-center relative">
          <Image
            src="/assets/logo@64.svg"
            alt="Kun Avatar Logo"
            width={32}
            height={32}
            className="w-8 h-8 flex-shrink-0"
          />
          <h1 className="sidebar-text text-xl font-bold text-theme-foreground tracking-tight">
            Kun Avatar
          </h1>
        {/* 展开/收缩按钮 */}
        <button
          onClick={toggleSidebar}
          className={`absolute -right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg text-theme-foreground-muted hover:text-theme-foreground hover:bg-theme-card-hover bg-theme-card z-10 ${
            isExpanded ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
          }`}
          title={isExpanded ? "收起侧边栏" : "展开侧边栏"}
        >
          {isExpanded ? (
            <PanelLeft className="w-4 h-4" />
          ) : (
            <PanelRight className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* 新建对话区域 */}
      <div className="p-3">
        <button
          onClick={handleNewConversation}
          className="sidebar-button group relative w-full flex items-center gap-3 p-3 rounded-lg bg-theme-primary text-white"
        >
          <Plus className="w-5 h-5 flex-shrink-0" />
          <span className="sidebar-text text-sm font-semibold">新建对话</span>
          <span className="sidebar-tooltip absolute left-full px-2 py-1 rounded-md text-sm bg-theme-card-hover text-theme-foreground opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
            新建对话
          </span>
        </button>
      </div>
      
      {/* 导航菜单区域 */}
      <div className="flex-1 p-3">
        <nav className="space-y-1">
          <button
            onClick={handleStartChat}
            className={`sidebar-nav-item sidebar-button group relative flex items-center gap-3 p-3 rounded-lg w-full text-left ${
              pathname === '/simple-chat' 
                ? 'text-theme-primary' 
                : 'text-theme-foreground-muted hover:text-theme-foreground'
            }`}
          >
            <div className="sidebar-icon-container">
              <MessageSquareText className={`w-5 h-5 flex-shrink-0 ${
                pathname === '/simple-chat' ? 'text-theme-primary' : ''
              }`} />
            </div>
            <span className="sidebar-text text-sm">开始对话</span>
            <span className="sidebar-tooltip absolute left-full px-2 py-1 rounded-md text-sm bg-theme-card-hover text-theme-foreground opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
              {conversations && conversations.length > 0 ? '进入最近对话' : '开始新对话'}
            </span>
          </button>

          <Link
            href="/mcp-config"
            className={`sidebar-nav-item sidebar-button group relative flex items-center gap-3 p-3 rounded-lg ${
              pathname === '/mcp-config' 
                ? 'text-theme-primary' 
                : 'text-theme-foreground-muted hover:text-theme-foreground'
            }`}
          >
            <div className="sidebar-icon-container">
              <Server className={`w-5 h-5 flex-shrink-0 ${
                pathname === '/mcp-config' ? 'text-theme-primary' : ''
              }`} />
            </div>
            <span className="sidebar-text text-sm">MCP配置</span>
            <span className="sidebar-tooltip absolute left-full px-2 py-1 rounded-md text-sm bg-theme-card-hover text-theme-foreground opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
              MCP配置
            </span>
          </Link>
          
          <Link
            href="/model-manager"
            className={`sidebar-nav-item sidebar-button group relative flex items-center gap-3 p-3 rounded-lg ${
              pathname === '/model-manager' 
                ? 'text-theme-primary' 
                : 'text-theme-foreground-muted hover:text-theme-foreground'
            }`}
          >
            <div className="sidebar-icon-container">
              <BrainCircuit className={`w-5 h-5 flex-shrink-0 ${
                pathname === '/model-manager' ? 'text-theme-primary' : ''
              }`} />
            </div>
            <span className="sidebar-text text-sm">模型管理</span>
            <span className="sidebar-tooltip absolute left-full px-2 py-1 rounded-md text-sm bg-theme-card-hover text-theme-foreground opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
              模型管理
            </span>
          </Link>
          
          <Link
            href="/agents"
            className={`sidebar-nav-item sidebar-button group relative flex items-center gap-3 p-3 rounded-lg ${
              pathname === '/agents' 
                ? 'text-theme-primary' 
                : 'text-theme-foreground-muted hover:text-theme-foreground'
            }`}
          >
            <div className="sidebar-icon-container">
              <Bot className={`w-5 h-5 flex-shrink-0 ${
                pathname === '/agents' ? 'text-theme-primary' : ''
              }`} />
            </div>
            <span className="sidebar-text text-sm">智能体管理</span>
            <span className="sidebar-tooltip absolute left-full px-2 py-1 rounded-md text-sm bg-theme-card-hover text-theme-foreground opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
              智能体管理
            </span>
          </Link>
        </nav>
      </div>

      {/* 底部区域 */}
      <div className="border-t border-theme-border">
        <div className="p-3 space-y-1">
          <Link
            href="/conversations"
            className={`sidebar-button sidebar-nav-item group relative w-full flex items-center gap-3 p-3 rounded-lg ${
              pathname === '/conversations'
                ? 'text-theme-primary'
                : 'text-theme-foreground-muted hover:text-theme-foreground'
            }`}
          >
            <div className="sidebar-icon-container">
              <History className={`w-5 h-5 flex-shrink-0 ${
                pathname === '/conversations' ? 'text-theme-primary' : ''
              }`} />
            </div>
            <span className="sidebar-text text-sm">对话历史</span>
            <span className="sidebar-tooltip absolute left-full px-2 py-1 rounded-md text-sm bg-theme-card-hover text-theme-foreground opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
              对话历史
            </span>
          </Link>
          
          <Link
            href="/settings"
            className={`sidebar-button sidebar-nav-item group relative w-full flex items-center gap-3 p-3 rounded-lg ${
              pathname === '/settings'
                ? 'text-theme-primary'
                : 'text-theme-foreground-muted hover:text-theme-foreground'
            }`}
          >
            <div className="sidebar-icon-container">
              <Settings className={`w-5 h-5 flex-shrink-0 ${
                pathname === '/settings' ? 'text-theme-primary' : ''
              }`} />
            </div>
            <span className="sidebar-text text-sm">设置</span>
            <span className="sidebar-tooltip absolute left-full px-2 py-1 rounded-md text-sm bg-theme-card-hover text-theme-foreground opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
              设置
            </span>
          </Link>
        </div>
      </div>
      </div>
    </>
  );
}