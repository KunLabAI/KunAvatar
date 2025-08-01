'use client';

import React from 'react';
import { X } from 'lucide-react';

interface ImagePreviewProps {
  images: string[];
  onRemoveImage: (index: number) => void;
  disabled?: boolean;
}

export function ImagePreview({ images, onRemoveImage, disabled = false }: ImagePreviewProps) {
  if (images.length === 0) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pb-2">
      <div className="flex flex-wrap gap-2">
        {images.map((image, index) => (
          <div
            key={index}
            className="relative group bg-theme-card border border-theme-border rounded-lg overflow-hidden shadow-sm"
            style={{ height: '64px', width: '64px' }}
          >
            {/* 图片预览 */}
            <img
              src={`data:image/jpeg;base64,${image}`}
              alt={`上传的图片 ${index + 1}`}
              className="w-full h-full object-cover"
            />
            
            {/* 删除按钮 */}
            {!disabled && (
              <button
                onClick={() => onRemoveImage(index)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm"
                title="删除图片"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            
            {/* 图片序号 */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-0.5">
              {index + 1}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}