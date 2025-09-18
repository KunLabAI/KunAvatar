'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import VditorEditor from '@/components/notes/VditorEditor';
import { useNotes } from '@/hooks/useNotes';
import Modal from '@/components/Modal';

interface QuickNotePanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText?: string;
  className?: string;
}

const QuickNotePanel: React.FC<QuickNotePanelProps> = ({
  isOpen,
  onClose,
  selectedText = '',
  className = ''
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showTitleModal, setShowTitleModal] = useState(false);
  
  // 使用笔记管理hook
  const { createNote } = useNotes({ autoFetch: false });

  // 当面板打开且有选中文字时，自动填充到内容中
  useEffect(() => {
    if (isOpen && selectedText) {
      // 延迟设置内容，确保VditorEditor完全初始化
      const timer = setTimeout(() => {
        setContent(prev => {
          // 如果内容为空，直接设置选中文字
          if (!prev.trim()) {
            return selectedText;
          }
          // 如果已有内容，在末尾添加选中文字
          return prev + '\n\n' + selectedText;
        });
      }, 200); // 延迟200ms确保编辑器初始化完成
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, selectedText]);

  // 重置表单
  const resetForm = () => {
    setTitle('');
    setContent('');
    setIsSaving(false);
  };

  // 关闭面板
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // 保存笔记
  const handleSave = async () => {
    if (!title.trim()) {
      setShowTitleModal(true);
      return;
    }
    
    setIsSaving(true);
    try {
      const noteData = {
        title: title.trim(),
        content: content,
        is_public: false, // 快速笔记默认为私有
        tags: [] // 可以后续扩展标签功能
      };
      
      const savedNote = await createNote(noteData);
      
      if (savedNote) {
        // 保存成功后重置表单并关闭面板
        resetForm();
        onClose();
      }
    } catch (error) {
      console.error('保存笔记失败:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 处理键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen) {
        // Ctrl+S 或 Cmd+S 保存
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault();
          handleSave();
        }
        // Escape 关闭
        if (e.key === 'Escape') {
          e.preventDefault();
          handleClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, title, content]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* 快速笔记面板 */}
      <div className={`absolute right-0 top-0 h-full bg-theme-background border-l border-theme-border transform transition-all duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      } w-1/2 ${className}`}>
        {/* 头部 */}
        <div className="flex items-center justify-between p-3 border-b border-theme-border bg-theme-muted/30">
          <h2 className="text-lg font-semibold text-theme-foreground">快速笔记</h2>
        </div>

        {/* 内容区域 */}
        <div className="flex flex-col h-[calc(100%-73px)]">
          {/* 标题和编辑器区域 */}
          <div className="flex-1 flex flex-col p-4 gap-4 min-h-0">
            {/* 标题输入框 */}
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请输入笔记标题..."
                className="form-input-base w-full"
              />
            </div>

            {/* 内容编辑器 */}
            <div className="flex-1 min-h-0">
              <VditorEditor
                value={content}
                onChange={setContent}
                placeholder="开始记录你的想法..."
                height="100%"
                className="h-full"
              />
            </div>
          </div>

          {/* 操作区域 - 固定在底部 */}
          <div className="flex-shrink-0 flex items-center justify-end gap-3 p-4 pt-4 border-t border-theme-border bg-theme-background">
            <button
              onClick={handleClose}
              className="inline-flex items-center gap-2 px-4 py-2 bg-theme-card border border-theme-border text-theme-foreground rounded-lg hover:bg-theme-card-hover transition-colors duration-200 font-medium"
            >
              <X className="w-4 h-4" />
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || (!title.trim() && !content.trim())}
              className="inline-flex items-center gap-2 px-4 py-2 bg-theme-primary text-theme-primary-foreground rounded-lg hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
            >
              <Save className="w-4 h-4" />
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>

      {/* 标题验证弹窗 */}
      <Modal
        open={showTitleModal}
        onClose={() => setShowTitleModal(false)}
        title="请输入标题"
        icon={<AlertTriangle className="w-6 h-6 text-theme-warning" />}
        actions={[
          {
            label: '确定',
            onClick: () => setShowTitleModal(false),
            variant: 'primary',
            autoFocus: true,
          },
        ]}
        width={380}
      >
        <span>
          笔记标题不能为空，请输入标题后再保存。
        </span>
      </Modal>
    </>
  );
};

export default QuickNotePanel;