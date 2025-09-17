'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Unlock, Lock } from 'lucide-react';
import { useNotification } from '@/components/notification';
import VditorEditor from '@/components/notes/VditorEditor';
import { Sidebar } from '@/app/Sidebar';
import { ProtectedRoute } from '@/components/ProtectedRoute';

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
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);




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
      notification.error('请输入标题', '标题不能为空');
      return;
    }

    if (!content.trim()) {
      notification.error('请输入内容', '笔记内容不能为空');
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        notification.error('认证失败', '请重新登录');
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
        notification.error('认证失败', '请重新登录');
        router.push('/login');
        return;
      }

      const data = await response.json();

      if (data.success) {
        notification.success('笔记创建成功', '正在跳转到笔记管理页面');
        router.push('/notes');
      } else {
        notification.error('创建失败', data.error || '未知错误');
      }
    } catch (error) {
      notification.error('创建失败', '网络错误，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  // 返回笔记列表
  const handleBack = () => {
    if (title.trim() || content.trim()) {
      if (confirm('确定要离开吗？未保存的内容将丢失。')) {
        router.push('/notes');
      }
    } else {
      router.push('/notes');
    }
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
                      新建笔记
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
                          公开笔记
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          我的笔记
                        </>
                      )}
                    </button>
                    <button 
                      onClick={handleBack} 
                      className="inline-flex items-center gap-2 px-4 py-2 bg-theme-card border border-theme-border text-theme-foreground rounded-lg hover:bg-theme-card-hover transition-colors duration-200 font-medium"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      返回
                    </button>

                    <button 
                      onClick={handleSave} 
                      disabled={saving} 
                      className="inline-flex items-center gap-2 px-4 py-2 bg-theme-primary text-theme-primary-foreground rounded-lg hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? '保存中...' : '创建'}
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
                      <FormInput label="笔记标题" required>
                        <input
                          type="text"
                          placeholder="输入笔记标题..."
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="form-input-base"
                          maxLength={200}
                        />
                      </FormInput>
                    </div>

                    {/* 标签管理 */}
                    <div className="flex-1">
                      <FormInput label="标签">
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
                              placeholder={tags.length === 0 ? "按回车或逗号添加标签，最多6个" : "添加标签..."}
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
                      placeholder="开始编写你的笔记内容..."
                      height="calc(90vh - 400px)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
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