'use client';

import React, { useRef, useState } from 'react';
import { X, Upload } from 'lucide-react';

interface ImageUploadProps {
  images?: string[]; // 当前图片数组
  onImagesChange: (images: string[]) => void;
  disabled?: boolean;
  maxImages?: number;
  maxFileSize?: number; // 以字节为单位，默认5MB
  className?: string;
}

interface UploadedImage {
  id: string;
  base64: string;
  fileName: string;
  size: number;
}

export function ImageUpload({
  images = [],
  onImagesChange,
  disabled = false,
  maxImages = 5,
  maxFileSize = 5 * 1024 * 1024, // 5MB
  className = ''
}: ImageUploadProps) {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 将文件转换为base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // 移除data:image/...;base64,前缀，只保留base64数据
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 验证文件类型和大小
  const validateFile = (file: File): string | null => {
    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      return '只能上传图片文件';
    }

    // 检查文件大小
    if (file.size > maxFileSize) {
      const maxSizeMB = maxFileSize / (1024 * 1024);
      return `文件大小不能超过 ${maxSizeMB}MB`;
    }

    return null;
  };

  // 处理文件上传
  const handleFiles = async (files: FileList) => {
    if (disabled) return;

    const fileArray = Array.from(files);
    const remainingSlots = maxImages - uploadedImages.length;
    
    if (fileArray.length > remainingSlots) {
      alert(`最多只能上传 ${maxImages} 张图片，当前还可以上传 ${remainingSlots} 张`);
      return;
    }

    const newImages: UploadedImage[] = [];

    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        alert(`文件 "${file.name}" ${error}`);
        continue;
      }

      try {
        const base64 = await fileToBase64(file);
        newImages.push({
          id: `${Date.now()}-${Math.random()}`,
          base64,
          fileName: file.name,
          size: file.size
        });
      } catch (error) {
        console.error('文件转换失败:', error);
        alert(`文件 "${file.name}" 转换失败`);
      }
    }

    if (newImages.length > 0) {
      const updatedImages = [...uploadedImages, ...newImages];
      setUploadedImages(updatedImages);
      onImagesChange(updatedImages.map(img => img.base64));
    }
  };

  // 删除图片
  const removeImage = (imageId: string) => {
    const updatedImages = uploadedImages.filter(img => img.id !== imageId);
    setUploadedImages(updatedImages);
    onImagesChange(updatedImages.map(img => img.base64));
  };

  // 处理点击上传
  const handleUploadClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 上传区域 */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer
          border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onClick={handleUploadClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          disabled={disabled}
        />
        
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          <Upload className="w-8 h-8 text-gray-400" />
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium text-blue-600 dark:text-blue-400">点击上传图片</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500">
            支持 JPG、PNG、GIF 等格式，单个文件不超过 {formatFileSize(maxFileSize)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500">
            最多上传 {maxImages} 张图片 ({uploadedImages.length}/{maxImages})
          </div>
        </div>
      </div>

      {/* 已上传的图片预览 */}
      {uploadedImages.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            已上传的图片 ({uploadedImages.length})
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {uploadedImages.map((image) => (
              <div
                key={image.id}
                className="relative group bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden aspect-square"
              >
                <img
                  src={`data:image/jpeg;base64,${image.base64}`}
                  alt={image.fileName}
                  className="w-full h-full object-cover"
                />
                
                {/* 删除按钮 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(image.id);
                  }}
                  className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={disabled}
                >
                  <X className="w-3 h-3" />
                </button>
                
                {/* 文件信息 */}
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="truncate">{image.fileName}</div>
                  <div>{formatFileSize(image.size)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}