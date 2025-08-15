'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Bot } from 'lucide-react';
import { ToolCallAnimation } from './ToolCallAnimation';

interface AgentAvatarProps {
  agent?: {
    name: string;
    avatar?: string | null;
  } | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showFallback?: boolean;
  hasActiveToolCall?: boolean;
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
  showFallback = true,
  hasActiveToolCall = false
}) => {
  const sizeClass = sizeClasses[size];
  const iconSize = iconSizes[size];
  const [imageError, setImageError] = useState(false);
  
  // 根据头像类型选择合适的动画效果
  const getAnimationVariant = () => {
    if (agent?.avatar && !imageError) {
      // 真实头像使用覆盖模式，保持头像清晰可见
      return 'overlay';
    } else if (agent?.name) {
      // 首字母头像使用发光模式，增强视觉效果
      return 'glow';
    } else {
      // 默认机器人图标使用边框模式
      return 'border';
    }
  };
  
  // 如果有上传的头像且图片未出错，显示图片
  if (agent?.avatar && !imageError) {
    return (
      <div className={`${sizeClass} rounded-xl overflow-hidden flex-shrink-0 relative ${className}`}>
        <Image 
          src={agent.avatar} 
          alt={agent.name}
          width={48}
          height={48}
          className="w-full h-full object-cover"
          onError={() => {
            console.warn('头像加载失败，切换到fallback:', agent.avatar);
            setImageError(true);
          }}
        />
        <ToolCallAnimation 
          isVisible={hasActiveToolCall} 
          size={size}
        />
      </div>
    );
  }
  
  // 如果有智能体名字，显示首字母头像
  if (agent?.name) {
    const firstChar = agent.name.charAt(0).toUpperCase();
    return (
      <div className={`${sizeClass} rounded-xl bg-gradient-to-br from-theme-primary to-theme-accent flex items-center justify-center text-white font-medium flex-shrink-0 relative ${className}`}>
        {firstChar}
        <ToolCallAnimation 
          isVisible={hasActiveToolCall} 
          size={size}
        />
      </div>
    );
  }
  
  // 默认显示机器人图标
  if (showFallback) {
    return (
      <div className={`${sizeClass} rounded-xl bg-gradient-to-br from-theme-primary to-theme-accent flex items-center justify-center text-white flex-shrink-0 relative ${className}`}>
        <Bot className={iconSize} />
        <ToolCallAnimation 
          isVisible={hasActiveToolCall} 
          size={size}
        />
      </div>
    );
  }
  
  return null;
};