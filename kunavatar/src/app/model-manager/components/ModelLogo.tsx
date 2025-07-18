'use client';

import { useState } from 'react';
import Image from 'next/image';
import { getModelLogoPath, getModelFamilyInitial } from '../../../lib/modelLogo';

interface ModelLogoProps {
  modelName: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  containerSize?: number;
  imageSize?: number;
  className?: string;
  showFallback?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12', 
  lg: 'w-16 h-16',
  xl: 'w-20 h-20'
};

const imageSizes = {
  sm: 20,
  md: 24,
  lg: 32,
  xl: 40
};

/**
 * 模型Logo组件
 * 统一处理模型图标显示，包含错误处理和备用方案
 */
export default function ModelLogo({ 
  modelName, 
  size = 'xl', 
  containerSize: customContainerSize,
  imageSize: customImageSize,
  className = '',
  showFallback = true 
}: ModelLogoProps) {
  const [hasError, setHasError] = useState(false);
  
  const logoPath = getModelLogoPath(modelName);
  const fallbackText = getModelFamilyInitial(modelName);
  
  // 处理尺寸，优先使用自定义尺寸
  const containerSizeClass = customContainerSize 
    ? `w-[${customContainerSize}px] h-[${customContainerSize}px]`
    : (typeof size === 'number' ? `w-[${size}px] h-[${size}px]` : sizeClasses[size]);
    
  const finalImageSize = customImageSize 
    ? customImageSize
    : (typeof size === 'number' ? size * 1 : imageSizes[size]);
    
  const innerImageSize = finalImageSize;

  return (
    <div className={`
      ${containerSizeClass} 
      rounded-xl 
      bg-theme-background-tertiary 
      border 
      border-theme-border 
      flex 
      items-center 
      justify-center 
      group-hover:border-theme-primary/30 
      transition-all 
      duration-300
      overflow-hidden
      ${className}
    `}>
      {hasError && showFallback ? (
        // 显示文字缩写作为备用方案
        <span className={`
          font-bold 
          text-theme-primary
          ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-base'}
        `}>
          {fallbackText}
        </span>
      ) : (
        <div className={`relative flex items-center justify-center ${
          typeof size === 'number' 
            ? `w-[${innerImageSize}px] h-[${innerImageSize}px]`
            : size === 'sm' ? 'w-5 h-5' : 
              size === 'md' ? 'w-6 h-6' : 
              size === 'lg' ? 'w-8 h-8' : 
              'w-10 h-10'
        }`}>
          <Image
            src={logoPath}
            alt={`${modelName} logo`}
            width={Math.round(innerImageSize)}
            height={Math.round(innerImageSize)}
            className="object-contain filter transition-all duration-300 max-w-full max-h-full"
            onError={() => {
              if (showFallback) {
                setHasError(true);
              }
            }}
            onLoad={() => {
              setHasError(false);
            }}
          />
        </div>
      )}
    </div>
  );
}