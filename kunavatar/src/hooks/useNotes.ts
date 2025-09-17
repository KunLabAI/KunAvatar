'use client';

import { useState, useEffect, useCallback } from 'react';
import { Note } from '@/lib/database/notes';
import { useAuth } from './useAuth';
import { useNotification } from '@/components/notification';

interface UseNotesOptions {
  page?: number;
  limit?: number;
  search?: string;
  tags?: string[];
  showPublic?: boolean;
  autoFetch?: boolean;
}

interface UseNotesReturn {
  notes: Note[];
  loading: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
  fetchNotes: () => Promise<void>;
  refreshNotes: () => Promise<void>;
  createNote: (noteData: { title: string; content: string; is_public?: boolean; tags?: string[] }) => Promise<Note | null>;
  updateNote: (noteId: number, updateData: { title?: string; content?: string; is_public?: boolean; tags?: string[] }) => Promise<Note | null>;
  deleteNote: (noteId: number) => Promise<boolean>;
}

export function useNotes(options: UseNotesOptions = {}): UseNotesReturn {
  const {
    page = 1,
    limit = 20,
    search = '',
    tags = [],
    showPublic = false,
    autoFetch = true
  } = options;

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  
  const { user } = useAuth();
  const notification = useNotification();

  const hasMore = notes.length < total;

  // 构建查询参数
  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', limit.toString());
    
    if (search) {
      params.set('search', search);
    }
    
    if (tags.length > 0) {
      params.set('tags', tags.join(','));
    }
    
    if (showPublic) {
      params.set('public', 'true');
    }
    
    return params.toString();
  }, [page, limit, search, tags, showPublic]);

  // 获取笔记列表
  const fetchNotes = useCallback(async () => {
    if (!user) {
      setError('用户未登录');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const endpoint = showPublic ? '/api/notes/public' : '/api/notes';
      const queryParams = buildQueryParams();
      const url = `${endpoint}?${queryParams}`;
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('认证令牌不存在');
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('权限不足');
        }
        throw new Error('获取笔记失败');
      }

      const data = await response.json();
      
      if (data.success) {
        setNotes(data.data || []);
        setTotal(data.pagination?.total || 0);
      } else {
        throw new Error(data.error || '获取笔记失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取笔记失败';
      setError(errorMessage);
      console.error('获取笔记失败:', err);
    } finally {
      setLoading(false);
    }
  }, [user, showPublic, buildQueryParams]);

  // 刷新笔记列表
  const refreshNotes = useCallback(async () => {
    await fetchNotes();
  }, [fetchNotes]);

  // 创建笔记
  const createNote = useCallback(async (noteData: { title: string; content: string; is_public?: boolean; tags?: string[] }): Promise<Note | null> => {
    if (!user) {
      notification.error('创建失败', '用户未登录');
      return null;
    }

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('认证令牌不存在');
      }

      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(noteData)
      });

      const data = await response.json();
      
      if (data.success) {
        notification.success('创建成功', '笔记已创建');
        await refreshNotes(); // 刷新列表
        return data.data;
      } else {
        throw new Error(data.error || '创建笔记失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '创建笔记失败';
      notification.error('创建失败', errorMessage);
      return null;
    }
  }, [user, notification, refreshNotes]);

  // 更新笔记
  const updateNote = useCallback(async (noteId: number, updateData: { title?: string; content?: string; is_public?: boolean; tags?: string[] }): Promise<Note | null> => {
    if (!user) {
      notification.error('更新失败', '用户未登录');
      return null;
    }

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('认证令牌不存在');
      }

      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();
      
      if (data.success) {
        notification.success('更新成功', '笔记已更新');
        await refreshNotes(); // 刷新列表
        return data.data;
      } else {
        throw new Error(data.error || '更新笔记失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新笔记失败';
      notification.error('更新失败', errorMessage);
      return null;
    }
  }, [user, notification, refreshNotes]);

  // 删除笔记
  const deleteNote = useCallback(async (noteId: number): Promise<boolean> => {
    if (!user) {
      notification.error('删除失败', '用户未登录');
      return false;
    }

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('认证令牌不存在');
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
        await refreshNotes(); // 刷新列表
        return true;
      } else {
        throw new Error(data.error || '删除笔记失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除笔记失败';
      notification.error('删除失败', errorMessage);
      return false;
    }
  }, [user, notification, refreshNotes]);

  // 自动获取数据
  useEffect(() => {
    if (autoFetch && user) {
      fetchNotes();
    }
  }, [autoFetch, user, fetchNotes]);

  return {
    notes,
    loading,
    error,
    total,
    hasMore,
    fetchNotes,
    refreshNotes,
    createNote,
    updateNote,
    deleteNote
  };
}

// 简化版本的hook，只获取笔记列表用于选择
export function useNotesForSelection() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchNotes = useCallback(async () => {
    if (!user) {
      setError('用户未登录');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('认证令牌不存在');
      }

      const response = await fetch('/api/notes?page=1&limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('权限不足');
        }
        throw new Error('获取笔记失败');
      }

      const data = await response.json();
      
      if (data.success) {
        setNotes(data.data || []);
      } else {
        throw new Error(data.error || '获取笔记失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取笔记失败';
      setError(errorMessage);
      console.error('获取笔记失败:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 只在组件挂载时获取一次数据
  useEffect(() => {
    if (user) {
      fetchNotes();
    }
  }, [user]); // 只依赖user，避免循环

  return {
    notes,
    loading,
    error,
    fetchNotes
  };
}