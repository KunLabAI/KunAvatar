'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Unlock, Lock, AlertTriangle } from 'lucide-react';
import { useNotification } from '@/components/notification';
import VditorEditor from '@/components/notes/VditorEditor';
import { Sidebar } from '@/app/Sidebar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Modal from '@/components/Modal';
import { useI18n } from '@/contexts/I18nContext';

// FormInput组件，与ModelfileForm保持一致的样式
const FormInput = ({ 
  label, 
  required = false, 
  error,
  hint,
  children
}: { 
  label: string; 
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    <label className="text-sm font-medium text-theme-foreground block">
      {label}
      {required && <span className="text-theme-error ml-1">*</span>}
    </label>
    {children}
    {error && (
      <p className="text-sm text-theme-error">{error}</p>
    )}
    {hint && !error && (
      <p className="text-xs text-theme-foreground-muted">{hint}</p>
    )}
  </div>
);

const NewNotePage = () => {
  const router = useRouter();
  const notification = useNotification();
  const { t } = useI18n(); // 多语言支持
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);




  // 添加标签
  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 6) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  // 删除标签
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // 处理标签输入键盘事件
  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // 保存笔记
  const handleSave = async () => {
    if (!title.trim()) {
      notification.error(t('notes.validation.titleRequired'), t('notes.validation.titleEmpty'));
      return;
    }

    if (!content.trim()) {
      notification.error(t('notes.validation.contentRequired'), t('notes.validation.contentEmpty'));
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        notification.error(t('notes.messages.authFailed'), t('notes.messages.authFailedDesc'));
        router.push('/login');
        return;
      }

      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          is_public: isPublished,
          tags: tags.length > 0 ? tags : undefined
        })
      });

      if (response.status === 401) {
        // 认证失败，清除token并跳转到登录页面
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        notification.error(t('notes.messages.authFailed'), t('notes.messages.authFailedDesc'));
        router.push('/login');
        return;
      }

      const data = await response.json();

      if (data.success) {
        notification.success(t('notes.messages.createSuccess'), t('notes.messages.createSuccessDesc'));
        router.push('/notes');
      } else {
        notification.error(t('notes.messages.createFailed'), data.error || t('notes.messages.createFailedUnknown'));
      }
    } catch (error) {
      notification.error(t('notes.messages.createFailed'), t('notes.messages.createFailedDesc'));
    } finally {
      setSaving(false);
    }
  };

  // 返回按钮处理
  const handleBack = () => {
    if (title.trim() || content.trim()) {
      setConfirmModalOpen(true);
    } else {
      router.back();
    }
  };

  // 确认离开
  const confirmLeave = () => {
    setConfirmModalOpen(false);
    router.back();
  };

  return (
    <div className="flex h-screen bg-theme-background">
      {/* 侧边栏 */}
      <Sidebar conversations={[]} />
      
      {/* 主内容区域 */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        <div className="min-h-screen bg-theme-background transition-all duration-300">
          {/* 页面头部 - 标题+操作区 */}
          <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <div className="mb-8">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                  <div>
                    <h1 className="page-title">
                      {t('notes.create.title')}
                    </h1>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                      onClick={() => setIsPublished(!isPublished)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 font-medium ${
                        isPublished 
                          ? 'bg-theme-primary text-theme-primary-foreground border border-theme-primary hover:bg-theme-primary-hover' 
                          : 'bg-theme-card border border-theme-border text-theme-foreground hover:bg-theme-card-hover'
                      }`}
                    >
                      {isPublished ? (
                        <>
                          <Unlock className="w-4 h-4" />
                          {t('notes.create.publicNote')}
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          {t('notes.create.privateNote')}
                        </>
                      )}
                    </button>
                    <button 
                      onClick={handleBack} 
                      className="inline-flex items-center gap-2 px-4 py-2 bg-theme-card border border-theme-border text-theme-foreground rounded-lg hover:bg-theme-card-hover transition-colors duration-200 font-medium"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      {t('notes.actions.back')}
                    </button>

                    <button 
                      onClick={handleSave} 
                      disabled={saving} 
                      className="inline-flex items-center gap-2 px-4 py-2 bg-theme-primary text-theme-primary-foreground rounded-lg hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? t('notes.create.savingButton') : t('notes.create.saveButton')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* 笔记标题和标签管理 - 同一行布局 */}
                <div className="mb-6">
                  <div className="flex gap-6">
                    {/* 笔记标题 */}
                    <div className="flex-1">
                      <FormInput label={t('notes.create.titleField')} required>
                        <input
                          type="text"
                          placeholder={t('notes.create.titlePlaceholder')}
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="form-input-base"
                          maxLength={200}
                        />
                      </FormInput>
                    </div>

                    {/* 标签管理 */}
                    <div className="flex-1">
                      <FormInput label={t('notes.create.tagsField')}>
                        <div className="relative">
                          <div className="form-input-base min-h-[42px] flex flex-wrap items-center gap-1 p-2">
                            {tags.map((tag, index) => (
                              <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-theme-primary text-theme-primary-foreground rounded text-xs">
                                {tag}
                                <button
                                  onClick={() => handleRemoveTag(tag)}
                                  className="hover:bg-theme-primary-hover rounded-full w-4 h-4 flex items-center justify-center transition-colors"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                            <input
                              type="text"
                              placeholder={tags.length === 0 ? t('notes.create.tagsPlaceholder') : t('notes.create.tagsAddPlaceholder')}
                              value={tagInput}
                              onChange={(e) => setTagInput(e.target.value)}
                              onKeyDown={handleTagInputKeyDown}
                              onBlur={handleAddTag}
                              maxLength={20}
                              className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-theme-foreground placeholder-theme-foreground-muted"
                            />
                          </div>
                        </div>
                      </FormInput>
                    </div>
                  </div>
                </div>

                {/* Markdown编辑器 */}
                <div className="bg-theme-card border border-theme-border rounded-lg">

                  <div>
                    <VditorEditor
                      value={content}
                      onChange={setContent}
                      placeholder={t('notes.create.contentPlaceholder')}
                      height="calc(100vh - 288px)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* 确认离开Modal */}
       <Modal
         open={confirmModalOpen}
         onClose={() => setConfirmModalOpen(false)}
         title={t('notes.confirmModal.leaveTitle')}
         icon={<AlertTriangle className="w-6 h-6 text-theme-warning" />}
         actions={[
           {
             label: t('notes.confirmModal.cancel'),
             onClick: () => setConfirmModalOpen(false),
             variant: 'secondary',
           },
           {
             label: t('notes.confirmModal.confirmLeave'),
             onClick: confirmLeave,
             variant: 'danger',
             autoFocus: true,
           },
         ]}
         width={380}
       >
         <span>
           {t('notes.confirmModal.unsavedContent')}
         </span>
       </Modal>
    </div>
  );
};

export default function NewNotePageWrapper() {
  return (
    <ProtectedRoute requiredPermission="notes:create">
      <NewNotePage />
    </ProtectedRoute>
  );
}