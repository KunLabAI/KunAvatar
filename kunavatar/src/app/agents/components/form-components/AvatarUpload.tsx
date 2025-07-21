'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Bot, Camera, X } from 'lucide-react';

interface AvatarUploadProps {
  currentAvatar: string | null;
  onAvatarChange: (avatar: string | null) => void;
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({ 
  currentAvatar, 
  onAvatarChange 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatar);

  // 当currentAvatar变化时更新previewUrl
  useEffect(() => {
    setPreviewUrl(currentAvatar);
  }, [currentAvatar]);

  // 图片压缩函数
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new (window as any).Image(); // 使用原生 HTML Image 构造函数
      
      img.onload = () => {
        // 设置最大尺寸
        const maxSize = 200;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        // 压缩质量
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(compressedDataUrl);
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }
    
    // 验证文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('图片文件不能超过5MB');
      return;
    }
    
    setIsUploading(true);
    
    try {
      const compressedImage = await compressImage(file);
      
      // 上传到服务器
      const formData = new FormData();
      
      // 将base64转换为blob
      const response = await fetch(compressedImage);
      const blob = await response.blob();
      formData.append('avatar', blob, `avatar_${Date.now()}.jpg`);
      
      const uploadResponse = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error('上传失败');
      }
      
      const { url } = await uploadResponse.json();
      setPreviewUrl(url);
      onAvatarChange(url);
    } catch (error) {
      console.error('头像上传失败:', error);
      alert('头像上传失败，请重试');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = () => {
    setPreviewUrl(null);
    onAvatarChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-theme-primary to-theme-accent flex items-center justify-center overflow-hidden border-2 border-theme-border">
          {previewUrl ? (
            <Image 
              src={previewUrl} 
              alt="头像预览" 
              width={80}
              height={80}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error('头像预览加载失败:', previewUrl);
                console.log('错误详情:', e);
              }}
            />
          ) : (
            <Bot className="w-10 h-10 text-white" />
          )}
        </div>
        {previewUrl && (
          <button
            type="button"
            onClick={handleRemoveAvatar}
            className="absolute -top-2 -right-2 w-6 h-6 bg-theme-error text-white rounded-full flex items-center justify-center text-xs hover:bg-theme-error/80 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      
      <div className="flex-1">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="btn-base btn-secondary flex items-center gap-2 text-sm"
        >
          {isUploading ? (
            <>
              <div className="w-4 h-4 border-2 border-theme-primary border-t-transparent rounded-full animate-spin" />
              上传中...
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" />
              {previewUrl ? '更换头像' : '上传头像'}
            </>
          )}
        </button>
        <p className="text-xs text-theme-foreground-muted mt-1">
          支持 JPG、PNG 格式，建议尺寸 200x200px，最大 5MB
        </p>
      </div>
    </div>
  );
};