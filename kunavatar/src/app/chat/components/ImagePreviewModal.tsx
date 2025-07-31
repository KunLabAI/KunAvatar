'use client';

import React from 'react';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageIndex: number;
  images: string[];
}

export default function ImagePreviewModal({
  isOpen,
  onClose,
  imageUrl,
  imageIndex,
  images
}: ImagePreviewModalProps) {
  const [scale, setScale] = React.useState(1);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const imageRef = React.useRef<HTMLImageElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const dragStart = React.useRef({ x: 0, y: 0 });
  const [currentIndex, setCurrentIndex] = React.useState(imageIndex);
  const [imageLoading, setImageLoading] = React.useState(true);
  const [imageError, setImageError] = React.useState(false);

  const totalImages = images.length;
  // 确保当前图片URL有正确的data前缀
  const currentImageUrl = (() => {
    const rawUrl = images[currentIndex] || imageUrl;
    return rawUrl.startsWith('data:') ? rawUrl : `data:image/jpeg;base64,${rawUrl}`;
  })();

  // 导航函数
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      resetTransform();
      setImageLoading(true);
      setImageError(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalImages - 1) {
      setCurrentIndex(currentIndex + 1);
      resetTransform();
      setImageLoading(true);
      setImageError(false);
    }
  };

  // 重置缩放
  const resetTransform = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // 缩放控制
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev * 1.5, 5));
    setPosition({ x: 0, y: 0 });
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev / 1.5, 0.5));
    setPosition({ x: 0, y: 0 });
  };

  // 下载图片
  const handleDownload = () => {
    try {
      // 检查是否是base64数据URL
      if (currentImageUrl.startsWith('data:')) {
        // 对于base64数据，直接使用数据URL
        const link = document.createElement('a');
        link.href = currentImageUrl;
        
        // 从数据URL中提取文件类型
        const mimeMatch = currentImageUrl.match(/data:image\/([^;]+)/);
        const extension = mimeMatch ? mimeMatch[1] : 'jpg';
        
        link.download = `image_${currentIndex + 1}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // 对于普通URL，使用fetch下载
        fetch(currentImageUrl)
          .then(response => response.blob())
          .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `image_${currentIndex + 1}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          })
          .catch(error => {
            console.error('下载图片失败:', error);
            alert('下载图片失败，请重试');
          });
      }
    } catch (error) {
      console.error('下载图片失败:', error);
      alert('下载图片失败，请重试');
    }
  };

  // 键盘事件处理
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (totalImages > 1) {
            handlePrevious();
          }
          break;
        case 'ArrowRight':
          if (totalImages > 1) {
            handleNext();
          }
          break;
        case '+':
        case '=':
          e.preventDefault();
          handleZoomIn();
          break;
        case '-':
          e.preventDefault();
          handleZoomOut();
          break;
        case '0':
          e.preventDefault();
          resetTransform();
          break;
      }
    };

    // 滚轮缩放事件处理 - 使用原生事件监听器以避免被动监听器问题
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // 为图片容器添加滚轮事件监听器，设置 passive: false
    const imageContainer = document.getElementById('image-preview-container');
    if (imageContainer) {
      imageContainer.addEventListener('wheel', handleWheel, { passive: false });
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (imageContainer) {
        imageContainer.removeEventListener('wheel', handleWheel);
      }
    };
  }, [isOpen, onClose, totalImages, currentIndex]);

  // 重置状态当模态框关闭时
  React.useEffect(() => {
    if (!isOpen) {
      resetTransform();
      setImageLoading(true);
      setImageError(false);
    }
  }, [isOpen]);

  // 图片加载处理
  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  const handlePointerMove = React.useCallback((e: PointerEvent) => {
    if (!isDragging) return;
    let newX = e.pageX - dragStart.current.x;
    let newY = e.pageY - dragStart.current.y;
    const imgRect = imageRef.current?.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (imgRect && containerRect) {
      const maxX = (imgRect.width - containerRect.width) / 2;
      const maxY = (imgRect.height - containerRect.height) / 2;
      newX = Math.max(-maxX, Math.min(newX, maxX));
      newY = Math.max(-maxY, Math.min(newY, maxY));
    }
    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handlePointerUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
      document.addEventListener('pointerleave', handlePointerUp);
      return () => {
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
        document.removeEventListener('pointerleave', handlePointerUp);
      };
    }
  }, [isDragging, handlePointerMove, handlePointerUp]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          {/* 工具栏 */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
            <div className="flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2">
              {/* 图片计数 */}
              {totalImages > 1 && (
                <span className="text-white text-sm">
                  {currentIndex + 1} / {totalImages}
                </span>
              )}
              
              {/* 缩放控制 */}
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleZoomOut();
                  }}
                  className="p-2 text-white hover:bg-white/20 rounded transition-colors"
                  title="缩小 (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                
                <span className="text-white text-sm min-w-[3rem] text-center">
                  {Math.round(scale * 100)}%
                </span>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleZoomIn();
                  }}
                  className="p-2 text-white hover:bg-white/20 rounded transition-colors"
                  title="放大 (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>

              {/* 下载按钮 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload();
                }}
                className="p-2 text-white hover:bg-white/20 rounded transition-colors"
                title="下载图片"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 关闭按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute top-4 right-4 z-20 p-2 text-white hover:bg-white/20 rounded-full transition-colors"
            title="关闭 (Esc)"
          >
            <X className="w-6 h-6" />
          </button>

          {/* 导航按钮 */}
          {totalImages > 1 && (
            <>
              {/* 上一张 */}
              {currentIndex > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevious();
                  }}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 p-3 text-white hover:bg-white/20 rounded-full transition-colors"
                  title="上一张 (←)"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}

              {/* 下一张 */}
              {currentIndex < totalImages - 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 p-3 text-white hover:bg-white/20 rounded-full transition-colors"
                  title="下一张 (→)"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </>
          )}

          {/* 图片容器 */}
          <div 
            id="image-preview-container"
            ref={containerRef}
            className="relative w-full h-full flex items-center justify-center p-8 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {imageError ? (
              // 错误状态
              <div className="text-center text-white">
                <div className="text-6xl mb-4">⚠️</div>
                <div className="text-lg mb-2">图片加载失败</div>
                <div className="text-sm opacity-70">请检查图片是否有效</div>
              </div>
            ) : (
              <>
                {/* 加载状态 */}
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                    <div className="text-white text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                      <div>加载中...</div>
                    </div>
                  </div>
                )}
                
                {/* 图片 */}
                <motion.img
                  ref={imageRef}
                  src={currentImageUrl}
                  alt={`预览图片 ${currentIndex + 1}`}
                  className={`max-w-full max-h-full object-contain select-none ${isDragging ? 'cursor-grabbing' : scale > 1 ? 'cursor-grab' : 'cursor-zoom-in'}`}
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transformOrigin: 'center',
                    transition: 'transform 0.2s ease-out'
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (scale === 1) {
                      handleZoomIn();
                    } else {
                      resetTransform();
                    }
                  }}
                  onPointerDown={(e) => {
                    if (scale <= 1) return;
                    e.preventDefault();
                    setIsDragging(true);
                    dragStart.current = {
                      x: e.pageX - position.x,
                      y: e.pageY - position.y
                    };
                  }}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  draggable={false}
                />
              </>
            )}
          </div>

          {/* 操作提示 */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
            <div className="bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 text-white text-sm text-center">
              <div className="flex items-center gap-4 text-xs opacity-70">
                <span>点击放大/还原</span>
                <span>滚轮缩放</span>
                {totalImages > 1 && <span>← → 切换</span>}
                <span>Esc 关闭</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}