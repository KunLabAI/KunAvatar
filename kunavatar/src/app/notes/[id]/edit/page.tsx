'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Unlock, Lock, Tag, X } from 'lucide-react';
import { useNotification } from '@/components/notification';
import VditorEditor from '@/components/notes/VditorEditor';
import Modal from '@/components/Modal';
import { Sidebar } from '@/app/Sidebar';
import { Conversation } from '@/lib/database';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// FormInput 组件
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

interface Note {
  id: number;
  title: string;
  content: string;
  is_public: boolean;
  tags: string | null;
  created_at: string;
  updated_at: string;
  is_owner: boolean;
}

const EditNotePage = () => {
  const router = useRouter();
  const params = useParams();
  const noteId = params.id as string;
  const { success, error } = useNotification();

  // 状态管理
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);


  // 解析标签
  const parseTags = (tagsString: string | null): string[] => {
    if (!tagsString) return [];
    try {
      return JSON.parse(tagsString);
    } catch {
      return [];
    }
  };

  // 获取笔记详情
  const fetchNote = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        error('认证失败', '请重新登录');
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/notes/${noteId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (data.success) {
        const noteData = data.data;
        setNote(noteData);
        
        // 检查是否为笔记所有者
        if (!noteData.is_owner) {
          error('无权限', '只有笔记作者可以编辑');
          router.push(`/notes/${noteId}`);
          return;
        }
        
        // 初始化表单数据
        setTitle(noteData.title);
        setContent(noteData.content);
        setIsPublished(noteData.is_public);
        setTags(parseTags(noteData.tags));
      } else {
        error('获取笔记失败', data.error);
        router.push('/notes');
      }
    } catch (err) {
      error('获取笔记失败', '网络错误，请稍后重试');
      router.push('/notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (noteId) {
      fetchNote();
    }
  }, [noteId]);



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
      error('请输入标题', '标题不能为空');
      return;
    }

    if (!content.trim()) {
      error('请输入内容', '笔记内容不能为空');
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        error('认证失败', '请重新登录');
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          is_public: isPublished,
          tags: tags.length > 0 ? tags : []
        })
      });

      if (response.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        error('认证失败', '请重新登录');
        router.push('/login');
        return;
      }

      const data = await response.json();

      if (data.success) {
        success('笔记更新成功', '正在跳转到笔记列表页面');
        router.push('/notes');
      } else {
        error('更新失败', data.error || '未知错误');
      }
    } catch (err) {
      error('更新失败', '网络错误，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  // 返回笔记管理页面
  const handleBack = () => {
    if (note && (title !== note.title || content !== note.content || isPublished !== note.is_public || JSON.stringify(tags) !== note.tags)) {
      setShowConfirmModal(true);
    } else {
      router.push('/notes');
    }
  };

  // 确认离开
  const handleConfirmLeave = () => {
    setShowConfirmModal(false);
    router.push('/notes');
  };

  // 取消离开
  const handleCancelLeave = () => {
    setShowConfirmModal(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-8 w-16 bg-muted rounded"></div>
            <div className="h-6 w-32 bg-muted rounded"></div>
          </div>
          <div className="h-8 w-3/4 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">笔记不存在</h3>
          <p className="text-muted-foreground mb-4">
            请检查链接是否正确
          </p>
          <button 
            onClick={() => router.push('/notes')}
            className="px-4 py-2 bg-theme-accent text-white rounded-md hover:bg-theme-accent-hover transition-colors"
          >
            返回笔记列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="flex h-screen bg-theme-background">
      {/* 侧边导航栏 */}
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
                      编辑笔记
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
                      {saving ? '保存中...' : '保存笔记'}
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
                      height="calc(100vh - 400px)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>

    {/* 确认离开弹窗 */}
    <Modal
      open={showConfirmModal}
      onClose={handleCancelLeave}
      title="确认离开"
      icon="⚠️"
      actions={[
        {
          label: '取消',
          onClick: handleCancelLeave,
          variant: 'secondary'
        },
        {
          label: '确定离开',
          onClick: handleConfirmLeave,
          variant: 'primary',
          autoFocus: true
        }
      ]}
    >
      <p>确定要离开吗？未保存的更改将丢失。</p>
    </Modal>
    </>
  );
};

export default function EditNotePageWrapper() {
  return (
    <ProtectedRoute requiredPermission="notes:update">
      <EditNotePage />
    </ProtectedRoute>
  );
}