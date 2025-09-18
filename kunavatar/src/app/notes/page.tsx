'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FileText, Calendar, User, Eye, Lock, Unlock, Edit, Share2, Trash2, MoreVertical, Search, SortAsc, SortDesc, AlertTriangle } from 'lucide-react';
import { useNotification } from '@/components/notification';
import { Note } from '@/lib/database/notes';
import { Sidebar } from '../Sidebar';
import { PageLoading } from '@/components/Loading';
import { useConversations } from '@/hooks/useConversations';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { authenticatedFetch } from '@/lib/utils/auth-utils';
import { formatTime } from '@/lib/utils/time';
import Modal from '@/components/Modal';

function NotesPageContent() {
  const router = useRouter();
  const notification = useNotification();
  const { conversations } = useConversations();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotesLoading, setIsNotesLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at' | 'title'>('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState<'private' | 'public'>('private');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

  // 过滤和排序笔记
  const filteredAndSortedNotes = React.useMemo(() => {
    let filtered = notes;
    
    // 搜索过滤
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = notes.filter(note => 
        note.title.toLowerCase().includes(term) || 
        note.content.toLowerCase().includes(term)
      );
    }
    
    // 排序
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'updated_at':
        default:
          aValue = new Date(a.updated_at).getTime();
          bValue = new Date(b.updated_at).getTime();
          break;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    return filtered;
  }, [notes, searchTerm, sortBy, sortOrder]);

  // 获取笔记数据
  const fetchNotes = async (isTabSwitch = false) => {
    try {
      if (isTabSwitch) {
        setIsNotesLoading(true);
      } else {
        setIsLoading(true);
      }
      
      const endpoint = activeTab === 'private' ? '/api/notes' : '/api/notes/public';
      const response = await authenticatedFetch(endpoint);
      
      if (!response.ok) {
        throw new Error('获取笔记失败');
      }
      
      const data = await response.json();
      if (data.success) {
        setNotes(data.data);
      } else {
        throw new Error(data.error || '获取笔记失败');
      }
    } catch (error) {
      console.error('获取笔记失败:', error);
      notification.error('获取笔记失败', '请稍后重试');
    } finally {
      if (isTabSwitch) {
        setIsNotesLoading(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  // 监听activeTab变化，切换时使用局部加载
  useEffect(() => {
    // 跳过初始渲染，只在标签切换时重新获取数据
    if (!isLoading) {
      fetchNotes(true);
    }
  }, [activeTab]);

  // 解析标签
  const parseTags = (tags: string | null): string[] => {
    if (!tags) return [];
    try {
      return JSON.parse(tags);
    } catch {
      return [];
    }
  };

  // 获取内容预览
  const getContentPreview = (content: string) => {
    return content.replace(/[#*`]/g, '').substring(0, 150) + (content.length > 150 ? '...' : '');
  };

  // 创建新笔记
  const handleCreateNote = () => {
    router.push('/notes/new');
  };

  // 编辑笔记
  const handleEditNote = (e: React.MouseEvent, noteId: number) => {
    e.stopPropagation();
    router.push(`/notes/${noteId}/edit`);
  };

  // 分享笔记
  const handleShareNote = async (e: React.MouseEvent, noteId: number) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        notification.error('认证失败', '请重新登录');
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/notes/${noteId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });

      const data = await response.json();

      if (data.success) {
        const url = `${window.location.origin}/notes/shared/${data.data.share_token}`;
        await navigator.clipboard.writeText(url);
        notification.success('分享链接已复制', '可以将链接分享给其他人');
      } else {
        notification.error('分享失败', data.error || '未知错误');
      }
    } catch (error) {
      notification.error('分享失败', '网络错误，请稍后重试');
    }
  };

  // 删除笔记
  const handleDeleteNote = (e: React.MouseEvent, noteId: number) => {
    e.stopPropagation();
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    setNoteToDelete(note);
    setDeleteModalOpen(true);
  };

  // 确认删除笔记
  const confirmDeleteNote = async () => {
    if (!noteToDelete) return;
    
    // 立即关闭Modal
    setDeleteModalOpen(false);
    
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        notification.error('认证失败', '请重新登录');
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/notes/${noteToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        notification.success('删除成功', '笔记已删除');
        // 重新获取笔记列表，使用局部刷新
        fetchNotes(true);
      } else {
        notification.error('删除失败', data.error || '未知错误');
      }
    } catch (error) {
      notification.error('删除失败', '网络错误，请稍后重试');
    } finally {
      setNoteToDelete(null);
    }
  };

  // 查看笔记详情
  const handleViewNote = (noteId: number) => {
    router.push(`/notes/${noteId}`);
  };



  if (isLoading) {
    return (
      <div className="flex h-screen bg-theme-background">
        <Sidebar conversations={conversations} />
        <div className="flex-1 overflow-auto scrollbar-thin">
          <PageLoading 
            text="loading..." 
            fullScreen={true}
          />
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-theme-background">
        {/* 侧边栏 */}
        <Sidebar conversations={conversations} />
        
        {/* 主内容区域 */}
        <div className="flex-1 overflow-auto scrollbar-thin">
          <div className="min-h-screen bg-theme-background transition-all duration-300">
            {/* 页面头部 - 主标题副标题+操作区 */}
            <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
              <div className="px-4 py-6 sm:px-0">
                <div className="mb-8">
                  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                    <div>
                      <h1 className="page-title">
                        笔记管理
                      </h1>
                      <p className="page-subtitle mt-2">
                        {activeTab === 'private' 
                          ? `记录想法，整理知识，分享见解 · 共 ${filteredAndSortedNotes.length} 个我的笔记`
                          : `发现精彩内容，学习他人见解 · 共 ${filteredAndSortedNotes.length} 个公开笔记`
                        }
                      </p>
                    </div>
                    {activeTab === 'private' && (
                      <div className="flex-shrink-0">
                        <button
                          onClick={handleCreateNote}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-colors duration-200 font-medium"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="hidden sm:inline">创建笔记</span>
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* 标签导航 */}
                  <div className="mb-6 mt-2">
                    <div className="border-b border-theme-border">
                      <nav className="-mb-px flex space-x-8">
                        {[
                          { key: 'private', label: '我的笔记', icon: Lock },
                          { key: 'public', label: '公开笔记', icon: Unlock }
                        ].map((tab) => {
                          const IconComponent = tab.icon;
                          return (
                            <button
                              key={tab.key}
                              onClick={() => setActiveTab(tab.key as 'private' | 'public')}
                              className={`${
                                activeTab === tab.key
                                  ? 'border-theme-primary text-theme-primary'
                                  : 'border-transparent text-theme-foreground-muted hover:text-theme-foreground hover:border-theme-border-secondary'
                              } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors duration-200 focus:outline-none`}
                            >
                              <IconComponent className="w-4 h-4" />
                              <span>{tab.label}</span>
                            </button>
                          );
                        })}
                      </nav>
                    </div>
                  </div>
                  
                  {/* 搜索和排序功能 */}
                  <div className="flex flex-col sm:flex-row gap-4 mt-6 mb-6">
                    {/* 搜索框 */}
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-theme-foreground-muted" />
                      <input
                        type="text"
                        placeholder="搜索笔记标题或内容..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-theme-card border border-theme-border rounded-lg focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent text-theme-foreground placeholder-theme-foreground-muted"
                      />
                    </div>
                    
                    {/* 排序选择 */}
                    <div className="flex gap-2">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'created_at' | 'updated_at' | 'title')}
                        className="px-3 py-2 bg-theme-card border border-theme-border rounded-lg focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent text-theme-foreground"
                      >
                        <option value="updated_at">更新时间</option>
                        <option value="created_at">创建时间</option>
                        <option value="title">标题</option>
                      </select>
                      
                      <button
                        onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                        className="px-3 py-2 bg-theme-card border border-theme-border rounded-lg hover:bg-theme-background-secondary transition-colors duration-200 text-theme-foreground"
                        title={sortOrder === 'desc' ? '降序排列' : '升序排列'}
                      >
                        {sortOrder === 'desc' ? <SortDesc className="w-4 h-4" /> : <SortAsc className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  
                {/* 笔记列表 */}
                <div className="space-y-6">
                  {isNotesLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-primary"></div>
                        <p className="text-theme-foreground-muted text-sm">加载中...</p>
                      </div>
                    </div>
                  ) : filteredAndSortedNotes.length === 0 ? (
                     searchTerm.trim() ? (
                       <div className="flex flex-col items-center justify-center py-16 text-center">
                         <div className="w-16 h-16 bg-theme-card rounded-full flex items-center justify-center mb-6">
                           <Search className="w-8 h-8 text-theme-foreground-muted" />
                         </div>
                         <h3 className="text-xl font-semibold text-theme-foreground mb-3">
                           未找到匹配的笔记
                         </h3>
                         <p className="text-theme-foreground-muted mb-8 max-w-md">
                           尝试使用不同的关键词搜索
                         </p>
                         <button 
                           onClick={() => setSearchTerm('')}
                           className="inline-flex items-center gap-2 px-6 py-3 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-colors duration-200 font-medium shadow-sm"
                         >
                           清除搜索
                         </button>
                       </div>
                     ) : (
                       <div className="flex flex-col items-center justify-center py-16 text-center">
                         <div className="w-16 h-16 bg-theme-card rounded-full flex items-center justify-center mb-6">
                           <FileText className="w-8 h-8 text-theme-foreground-muted" />
                         </div>
                         <h3 className="text-xl font-semibold text-theme-foreground mb-3">
                           还没有笔记
                         </h3>
                         <p className="text-theme-foreground-muted mb-8 max-w-md">
                           开始创建您的第一个笔记，记录想法、整理知识、分享见解
                         </p>

                       </div>
                     )
                   ) : (
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-4 xl:gap-5">
                       {filteredAndSortedNotes.map((note) => {
                         const tags = parseTags(note.tags);
                         return (
                           <div 
                             key={note.id}
                             className="rounded-xl hover:border-theme-primary/30 hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden group"
                             style={{ backgroundColor: 'var(--color-card)' }}
                           >
                             {/* 卡片头部 */}
                             <div className="p-5 xl:p-4 flex-grow">
                               {/* 笔记标题和状态 */}
                                <div className="mb-4 xl:mb-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-lg xl:text-base font-bold text-theme-foreground truncate group-hover:text-theme-primary transition-colors duration-300">
                                      {note.title}
                                    </h3>
                                    {note.is_public ? (
                                      <div className="flex items-center justify-center w-6 h-6 bg-green-100 text-green-700 rounded-full flex-shrink-0">
                                        <Unlock className="w-3 h-3" />
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-center w-6 h-6 bg-theme-background-tertiary text-theme-foreground-muted rounded-full flex-shrink-0">
                                        <Lock className="w-3 h-3" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                               
                               {/* 内容预览 */}
                               <p className="text-sm xl:text-xs text-theme-foreground-muted mb-4 xl:mb-3 line-clamp-3">
                                 {getContentPreview(note.content)}
                               </p>
                               
                               {/* 标签 */}
                               <div className="mb-4 xl:mb-3">
                                 <div className="flex gap-2 overflow-hidden">
                                   {tags.length > 0 ? (
                                     <>
                                       {tags.slice(0, 2).map((tag, index) => (
                                         <span 
                                           key={index}
                                           className="px-2 py-1 bg-theme-primary text-theme-primary-foreground text-xs rounded transition-colors duration-300 flex-shrink-0"
                                         >
                                           {tag}
                                         </span>
                                       ))}
                                       {tags.length > 2 && (
                                         <span className="px-2 py-1 bg-theme-background-tertiary text-theme-foreground-muted text-xs rounded flex-shrink-0">
                                           +{tags.length - 2}
                                         </span>
                                       )}
                                     </>
                                   ) : (
                                     <span className="px-2 py-1 bg-theme-background-tertiary text-theme-foreground-muted text-xs rounded flex items-center flex-shrink-0">
                                       <FileText className="w-3 h-3 mr-1"/>
                                       无标签
                                     </span>
                                   )}
                                 </div>
                               </div>
                               
                               {/* 时间信息 */}
                               <div className="flex items-center gap-4 text-xs text-theme-foreground-muted">
                                 <span className="flex items-center gap-1">
                                   <Calendar className="w-3 h-3" />
                                   {note.created_at === note.updated_at 
                                     ? `创建于 ${formatTime(note.created_at)}`
                                     : `更新于 ${formatTime(note.updated_at)}`
                                   }
                                 </span>
                                 <span className="flex items-center gap-1">
                                   <User className="w-3 h-3" />
                                   {note.author_name || '未知作者'}
                                 </span>
                               </div>
                             </div>
                             
                             {/* 卡片底部操作区 - 悬停显示 */}
                             <div className="bg-theme-background-secondary/50 px-2 pb-4 xl:pb-3 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out">
                               <div className="flex items-center justify-evenly">
                                 {/* 查看详情按钮 */}
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     handleViewNote(note.id);
                                   }}
                                   className="flex items-center justify-center w-10 h-10 rounded-lg text-theme-foreground-muted hover:text-theme-info transition-all duration-300"
                                   onMouseEnter={(e) => {
                                     e.currentTarget.style.backgroundColor = 'rgba(156, 163, 175, 0.1)';
                                   }}
                                   onMouseLeave={(e) => {
                                     e.currentTarget.style.backgroundColor = '';
                                   }}
                                   title="查看详情"
                                 >
                                   <Eye className="w-5 h-5" />
                                 </button>
                                 
                                 {/* 编辑按钮 */}
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     handleEditNote(e, note.id);
                                   }}
                                   className="flex items-center justify-center w-10 h-10 rounded-lg text-theme-foreground-muted hover:text-theme-warning transition-all duration-300"
                                   onMouseEnter={(e) => {
                                     e.currentTarget.style.backgroundColor = 'rgba(156, 163, 175, 0.1)';
                                   }}
                                   onMouseLeave={(e) => {
                                     e.currentTarget.style.backgroundColor = '';
                                   }}
                                   title="编辑"
                                 >
                                   <Edit className="w-5 h-5" />
                                 </button>
                                 
                                 {/* 分享按钮 */}
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     handleShareNote(e, note.id);
                                   }}
                                   className="flex items-center justify-center w-10 h-10 rounded-lg text-theme-foreground-muted hover:text-blue-600 transition-all duration-300"
                                   onMouseEnter={(e) => {
                                     e.currentTarget.style.backgroundColor = 'rgba(156, 163, 175, 0.1)';
                                   }}
                                   onMouseLeave={(e) => {
                                     e.currentTarget.style.backgroundColor = '';
                                   }}
                                   title="分享笔记"
                                 >
                                   <Share2 className="w-5 h-5" />
                                 </button>
                                 
                                 {/* 删除按钮 */}
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     handleDeleteNote(e, note.id);
                                   }}
                                   className="flex items-center justify-center w-10 h-10 rounded-lg text-theme-foreground-muted hover:text-theme-error transition-all duration-300"
                                   onMouseEnter={(e) => {
                                     e.currentTarget.style.backgroundColor = 'rgba(156, 163, 175, 0.1)';
                                   }}
                                   onMouseLeave={(e) => {
                                     e.currentTarget.style.backgroundColor = '';
                                   }}
                                   title="删除"
                                 >
                                   <Trash2 className="w-5 h-5" />
                                 </button>
                               </div>
                             </div>
                           </div>
                         );
                       })}
                     </div>
                   )}
                </div>
                </div>
              </div>
            </main>
          </div>
        </div>
        
        {/* 删除确认弹窗 */}
        <Modal
          open={deleteModalOpen}
          onClose={() => { setDeleteModalOpen(false); setNoteToDelete(null); }}
          title="确认删除笔记"
          icon={<AlertTriangle className="w-6 h-6 text-theme-warning" />}
          actions={[
            {
              label: '取消',
              onClick: () => { setDeleteModalOpen(false); setNoteToDelete(null); },
              variant: 'secondary',
            },
            {
              label: '确认删除',
              onClick: confirmDeleteNote,
              variant: 'danger',
              autoFocus: true,
            },
          ]}
          width={380}
        >
          {noteToDelete && (
            <span>
              确定要删除笔记「<b>{noteToDelete.title}</b>」吗？此操作不可撤销。
            </span>
          )}
        </Modal>
      </div>
    </ProtectedRoute>
  );
};

export default function NotesPage() {
  return (
    <ProtectedRoute requiredPermission="notes:read">
      <NotesPageContent />
    </ProtectedRoute>
  );
}