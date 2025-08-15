'use client';

import React, { useRef } from 'react';
import { ImageIcon } from 'lucide-react';
import { BaseControlButton } from './BaseControlButton';

interface ImageUploadControlProps {
  onImagesSelected: (files: FileList) => void;
  disabled?: boolean;
  hasImages?: boolean;
  imageCount?: number;
  maxImages?: number;
  tooltip?: string;
  
  // 模型验证相关
  isCheckingModel?: boolean;
  modelSupportsVision?: boolean | null;
  onValidationError?: (title: string, message: string) => void;
}

export function ImageUploadControl({
  onImagesSelected,
  disabled = false,
  hasImages = false,
  imageCount = 0,
  maxImages = 5,
  tooltip = '上传图片',
  isCheckingModel = false,
  modelSupportsVision = null,
  onValidationError
}: ImageUploadControlProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    // 如果模型不支持多模态，显示错误提示
    if (modelSupportsVision === false) {
      onValidationError?.(
        '图片上传不可用', 
        '当前模型不支持多模态功能，请选择支持图片识别的模型（如 llava、bakllava 等）。'
      );
      return;
    }
    
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onImagesSelected(files);
    }
    // 清空input值，允许重复选择同一文件
    e.target.value = '';
  };

  // 判断按钮是否应该被禁用
  const isDisabled = disabled || isCheckingModel || modelSupportsVision === false;

  // 确定工具提示文本
  const getTooltip = () => {
    if (isCheckingModel) {
      return '正在检测模型多模态支持...';
    }
    if (modelSupportsVision === false) {
      return '当前模型不支持图片识别';
    }
    return tooltip;
  };



  // 确定徽章
  const getBadge = () => {
    if (!hasImages || imageCount === 0) return undefined;
    
    return {
      count: imageCount,
      position: 'top-left' as const,
      color: 'blue' as const,
    };
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={isDisabled}
      />
      
      <BaseControlButton
        onClick={handleClick}
        disabled={isDisabled}
        active={hasImages && (modelSupportsVision === true || modelSupportsVision === null)}
        loading={isCheckingModel}
        tooltip={getTooltip()}
        badge={getBadge()}
      >
        <ImageIcon className="w-5 h-5" />
      </BaseControlButton>
    </>
  );
}