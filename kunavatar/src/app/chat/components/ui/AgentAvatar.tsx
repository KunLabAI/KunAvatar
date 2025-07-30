'use client';

import React from 'react';
import Image from 'next/image';
import { Bot } from 'lucide-react';

interface AgentAvatarProps {
  agent?: {
    name: string;
    avatar?: string | null;
  } | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showFallback?: boolean;
}

const sizeClasses = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
  xl: 'w-12 h-12 text-lg'
};

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
  xl: 'w-6 h-6'
};

export const AgentAvatar: React.FC<AgentAvatarProps> = ({ 
  agent, 
  size = 'md', 
  className = '',
  showFallback = true
}) => {
  const sizeClass = sizeClasses[size];
  const iconSize = iconSizes[size];
  
  // 如果有上传的头像，显示图片
  if (agent?.avatar) {
    return (
      <div className={`${sizeClass} rounded-xl overflow-hidden flex-shrink-0 ${className}`}>
        <Image 
          src={agent.avatar} 
          alt={agent.name}
          width={48}
          height={48}
          className="w-full h-full object-cover"
          onError={(e) => {
            // 如果图片加载失败，隐藏图片元素，让父组件显示fallback
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    );
  }
  
  // 如果有智能体名字，显示首字母头像
  if (agent?.name) {
    const firstChar = agent.name.charAt(0).toUpperCase();
    return (
      <div className={`${sizeClass} rounded-xl bg-gradient-to-br from-theme-primary to-theme-accent flex items-center justify-center text-white font-medium flex-shrink-0 ${className}`}>
        {firstChar}
      </div>
    );
  }
  
  // 默认显示机器人图标
  if (showFallback) {
    return (
      <div className={`${sizeClass} rounded-xl bg-gradient-to-br from-theme-primary to-theme-accent flex items-center justify-center text-white flex-shrink-0 ${className}`}>
        <Bot className={iconSize} />
      </div>
    );
  }
  
  return null;
};