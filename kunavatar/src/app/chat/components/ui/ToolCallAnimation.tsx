'use client';

import React from 'react';

interface ToolCallAnimationProps {
  isVisible: boolean;
  className?: string;
  variant?: 'ring';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * 统一的工具调用动画组件
 * 提供多种视觉效果，与头像更好地融合
 */
export const ToolCallAnimation: React.FC<ToolCallAnimationProps> = ({
  isVisible,
  className = '',
  variant = 'ring',
  size = 'md'
}) => {
  if (!isVisible) return null;

  // 圆环模式：发光旋转动画效果
  if (variant === 'ring') {
    const sizeMap = {
      sm: { outer: 26, inner: 22 },  // 对应 w-6 h-6 (24px)
      md: { outer: 34, inner: 30 },  // 对应 w-8 h-8 (32px)
      lg: { outer: 42, inner: 38 },  // 对应 w-10 h-10 (40px)
      xl: { outer: 50, inner: 46 }   // 对应 w-12 h-12 (48px)
    };
    
    const sizes = sizeMap[size];
    
    return (
      <div className={`absolute inset-0 flex items-center justify-center ${className}`}>
        {/* 外层发光旋转圆环 */}
        <div
          style={{
            backgroundImage: 'linear-gradient(rgb(255, 0, 179) 35%, rgb(0, 247, 255))',
            width: `${sizes.outer}px`,
            height: `${sizes.outer}px`,
            animation: 'spinning82341 1.7s linear infinite, fadeIn82341 0.3s ease-out',
            borderRadius: '50%',
            filter: 'blur(1px)',
            position: 'absolute'
          }}
        />
        
        {/* 内层遮罩圆环 */}
        <div
          style={{
            backgroundColor: 'rgb(36, 36, 36)',
            width: `${sizes.inner}px`,
            height: `${sizes.inner}px`,
            borderRadius: '50%',
            filter: 'blur(3px)',
            position: 'absolute',
            animation: 'fadeIn82341 0.3s ease-out'
          }}
        />
        
        <style jsx>{`
          @keyframes spinning82341 {
            to {
              transform: rotate(360deg);
            }
          }
          @keyframes fadeIn82341 {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
        `}</style>
      </div>
    );
  }

  return null;
};

export default ToolCallAnimation;