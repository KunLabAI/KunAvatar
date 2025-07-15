'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect } from 'react';

interface ModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl';
  showCloseButton?: boolean;
  icon?: React.ReactNode;
}

export default function ModalWrapper({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = '2xl',
  showCloseButton = true,
  icon
}: ModalWrapperProps) {
  // 添加ESC键退出弹窗功能
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md', 
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl'
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className={`bg-theme-background rounded-2xl w-full ${maxWidthClasses[maxWidth]} max-h-[90vh] flex flex-col border border-theme-border shadow-xl`}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: -10 }}
        >
          {/* 头部 */}
          <div className="p-8 pb-6 border-b border-theme-border">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {icon && (
                  <div>
                    {icon}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="page-title text-theme-foreground">
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="text-theme-foreground-muted text-sm mt-1">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-theme-card hover:bg-theme-card-hover flex items-center justify-center text-theme-foreground-muted hover:text-theme-foreground transition-all duration-200 flex-shrink-0 border border-theme-border"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 flex flex-col min-h-0">
            {children}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}