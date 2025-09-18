'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Edit, Share2, Trash2, Tag, Calendar, User, Copy, Check, AlertTriangle, EyeOff } from 'lucide-react';
import { useNotification } from '@/components/notification/NotificationContext';
import VditorPreview from '@/components/notes/VditorPreview';
import { Note } from '@/lib/database/notes';
import { Sidebar } from '@/app/Sidebar';
import { formatTime } from '@/lib/utils/time';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Modal from '@/components/Modal';

const NoteDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const notification = useNotification();
  const noteId = params.id as string;
  
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  
  // 分享状态
  const [shareUrl, setShareUrl] = useState('');
  const [isOwner, setIsOwner] = useState(false);

  // 获取笔记详情
  const fetchNote = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        notification.error('认证失败', '请重新登录');
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/notes/${noteId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setNote(data.data);
        setIsOwner(data.data.is_owner);
        
        // 如果是公开笔记，设置分享链接
        if (data.data.is_public) {
          setShareUrl(`${window.location.origin}/notes/${noteId}`);
        }
      } else {
        notification.error('获取失败', data.message || '无法获取笔记详情');
        router.push('/notes');
      }
    } catch (error) {
      console.error('获取笔记详情失败:', error);
      notification.error('获取失败', '网络错误，请稍后重试');
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

  // 解析标签
  const parseTags = (tagsString: string | null): string[] => {
    if (!tagsString) return [];
    try {
      return JSON.parse(tagsString);
    } catch {
      return [];
    }
  };

  // 格式化日期 - 使用工具函数确保正确的时区处理
  const formatDate = (dateString: string) => {
    return formatTime(dateString);
  };



  // 删除笔记
  const handleDelete = async () => {
    try {
      setDeleting(true);
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        notification.error('认证失败', '请重新登录');
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        notification.success('删除成功', '笔记已删除');
        router.push('/notes');
      } else {
        notification.error('删除失败', data.message || '删除笔记时出错');
      }
    } catch (err) {
      console.error('删除笔记失败:', err);
      notification.error('删除失败', '网络错误，请稍后重试');
    } finally {
      setDeleting(false);
    }
  };

  // 分享笔记
  const handleShare = async () => {
    try {
      setSharing(true);
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        notification.error('认证失败', '请重新登录');
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/notes/${noteId}/share`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setShareUrl(data.shareUrl);
        notification.success('分享成功', '笔记已设为公开');
      } else {
        notification.error('分享失败', data.message || '分享笔记时出错');
      }
    } catch (err) {
      console.error('分享笔记失败:', err);
      notification.error('分享失败', '网络错误，请稍后重试');
    } finally {
      setSharing(false);
    }
  };

  // 复制分享链接
  const handleCopyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      notification.success('复制成功', '分享链接已复制到剪贴板');
    } catch (err) {
      console.error('复制失败:', err);
      notification.error('复制失败', '请手动复制链接');
    }
  };

  // 使用通知系统
  const { success, error, warning } = useNotification();
 
  // 返回笔记列表
  const handleBack = () => {
    router.push('/notes');
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

  const tags = parseTags(note.tags);

  return (
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
                      笔记详情
                    </h1>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {!note.is_public && (
                      <button
                        onClick={handleShare}
                        disabled={sharing}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-theme-card border border-theme-border text-theme-foreground rounded-lg hover:bg-theme-card-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
                      >
                        <Share2 className="w-4 h-4" />
                        {sharing ? '分享中...' : '分享'}
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteModalOpen(true)}
                      disabled={deleting}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-theme-card border border-theme-border text-theme-foreground rounded-lg hover:bg-theme-card-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      {deleting ? '删除中...' : '删除'}
                    </button>
                    <button
                      onClick={handleBack}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-theme-card border border-theme-border text-theme-foreground rounded-lg hover:bg-theme-card-hover transition-colors duration-200 font-medium"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      返回
                    </button>
                    
                    {isOwner && (
                      <>
                        <button
                          onClick={() => router.push(`/notes/${noteId}/edit`)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-theme-primary text-theme-primary-foreground rounded-lg hover:bg-theme-primary-hover transition-colors duration-200 font-medium"
                        >
                          <Edit className="w-4 h-4" />
                          编辑
                        </button>                        
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {/* 主布局 */}
              <div className="grid gap-8 lg:grid-cols-1">
                {/* 主内容区 */}
                <div className="space-y-6 lg:col-span-1">

                      {/* 查看模式 */}
                      {/* 笔记信息条 */}
                      <div className="p-1">
                        <div className="flex justify-between items-center text-sm text-theme-muted">
                          {/* 左侧：标签 */}
                          <div className="flex items-center">
                            {tags.length > 0 && (
                              <div className="flex items-center gap-2">
                                <div className="flex flex-wrap gap-1">
                                  {tags.map((tag, index) => (
                                     <span
                                       key={index}
                                       className="px-2 py-1 bg-theme-primary text-theme-primary-foreground rounded text-xs font-medium"
                                     >
                                       {tag}
                                     </span>
                                   ))}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* 右侧：时间信息、私人笔记 */}
                          <div className="flex items-center gap-4 text-theme-foreground-muted">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {note.created_at === note.updated_at 
                                  ? `创建于 ${formatDate(note.created_at)}`
                                  : `更新于 ${formatDate(note.updated_at)}`
                                }
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <span>{note.author_name || '未知作者'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-theme-card border border-theme-border rounded-xl shadow-sm overflow-hidden">
                        {/* 标题区域 */}
                        <div className="px-6 py-4 border-b border-theme-border bg-theme-background-secondary">
                          <h2 className="text-2xl font-bold text-theme-foreground mb-0">
                            {note.title}
                          </h2>
                        </div>
                        
                        {/* 内容区域 - 模拟编辑器的内容区域样式 */}
                        <div className="vditor-content-area">
                          <VditorPreview 
                            value={note.content || ''}
                            className="vditor-preview-content"
                          />
                        </div>
                      </div>
                      
                      {/* 分享链接显示 */}
                      {shareUrl && (
                        <div className="bg-theme-card border border-theme-border rounded-xl p-6 shadow-sm">
                          <h3 className="text-lg font-semibold text-theme-foreground mb-4">分享链接</h3>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={shareUrl}
                              readOnly
                              className="flex-1 px-3 py-2 bg-theme-background border border-theme-border rounded-lg text-theme-foreground text-sm"
                            />
                            <button
                              onClick={handleCopyShareUrl}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-theme-primary text-theme-primary-foreground rounded-lg hover:bg-theme-primary-hover transition-colors duration-200 font-medium"
                            >
                              {copied ? (
                                <>
                                  <Check className="w-4 h-4" />
                                  已复制
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  复制
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                </div>
                

              </div>
            </div>
          </main>
        </div>
      </div>
      
      {/* 删除确认Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="删除笔记"
        actions={[
          {
            label: '取消',
            onClick: () => setDeleteModalOpen(false),
            variant: 'secondary'
          },
          {
            label: '确定删除',
            onClick: () => {
              setDeleteModalOpen(false);
              handleDelete();
            },
            variant: 'danger'
          }
        ]}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <p className="text-theme-foreground mb-2">
              此操作不可撤销。确定要删除这篇笔记吗？
            </p>
            <p className="text-sm text-theme-foreground-muted">
              笔记标题：{note?.title}
            </p>
          </div>
        </div>
      </Modal>
     </div>
   );
};

export default function NoteDetailPageWrapper() {
  return (
    <ProtectedRoute requiredPermission="notes:read">
      <NoteDetailPage />
    </ProtectedRoute>
  );
}