import React, { ReactNode, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ModalAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  autoFocus?: boolean;
  disabled?: boolean;
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  actions?: ModalAction[];
  width?: string | number;
  closeOnEsc?: boolean;
  closeOnBackdrop?: boolean;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  icon,
  actions = [],
  width = 400,
  closeOnEsc = true,
  closeOnBackdrop = true,
}: ModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  // esc关闭
  useEffect(() => {
    if (!open || !closeOnEsc) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, closeOnEsc, onClose]);

  // 自动聚焦第一个按钮
  useEffect(() => {
    if (open && firstButtonRef.current) {
      firstButtonRef.current.focus();
    }
  }, [open]);

  // 遮罩点击关闭
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdrop && e.target === backdropRef.current) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={backdropRef}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={handleBackdropClick}
        >
          <motion.div
            className="bg-theme-card border border-theme-border rounded-xl shadow-2xl p-6 flex flex-col gap-4 relative"
            style={{ width: typeof width === 'number' ? `${width}px` : width, maxWidth: '90vw' }}
            initial={{ scale: 0.96, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
          >
            {/* 关闭按钮 */}
            <button
              className="absolute top-3 right-3 p-2 rounded-lg text-theme-foreground-muted hover:bg-theme-background-tertiary transition-colors"
              onClick={onClose}
              aria-label="关闭弹窗"
              tabIndex={0}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M6 6l8 8M6 14L14 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
            {/* 图标+标题 */}
            {(icon || title) && (
              <div className="flex items-center gap-3 mb-1">
                {icon && <span className="text-2xl">{icon}</span>}
                {title && <h3 className="text-lg font-semibold text-theme-foreground flex-1">{title}</h3>}
              </div>
            )}
            {/* 内容 */}
            {children && (
              <div className="text-theme-foreground-secondary text-sm">
                {children}
              </div>
            )}
            {/* 操作按钮 */}
            {actions.length > 0 && (
              <div className="flex gap-3 justify-end mt-2">
                {actions.map((action, idx) => (
                  <button
                    key={action.label}
                    ref={idx === 0 ? firstButtonRef : undefined}
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border
                      ${action.variant === 'primary'
                        ? 'bg-theme-primary text-white border-theme-primary hover:bg-theme-primary-hover'
                        : action.variant === 'danger'
                        ? 'bg-red-500 text-white border-red-500 hover:bg-red-600'
                        : 'bg-theme-background-tertiary text-theme-foreground border-theme-border hover:bg-theme-card-hover'}
                      ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    tabIndex={0}
                    autoFocus={!!action.autoFocus}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 