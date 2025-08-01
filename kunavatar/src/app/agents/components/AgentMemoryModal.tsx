'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Brain, Clock, Star, TrendingUp, ChevronRight, X, Edit3, Trash2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '@/components/Modal';
import { useNotification } from '@/components/notification/NotificationContext';
import { formatTime } from '@/lib/utils/time';

interface MemoryItem {
  id: number;
  conversation_id: number;
  agent_id: number | null;
  memory_type: 'summary' | 'context' | 'important';
  content: string;
  source_message_range: string | null;
  importance_score: number;
  tokens_saved: number;
  created_at: string;
  parsedContent: {
    summary: string;
    importantTopics: string[];
    keyFacts: string[];
    preferences: string[];
    context: string;
  };
}

interface MemoryStats {
  total_memories: number;
  total_tokens_saved: number;
  avg_importance: number;
}

interface AgentMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: number;
  agentName: string;
}

export function AgentMemoryModal({ isOpen, onClose, agentId, agentName }: AgentMemoryModalProps) {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMemoryId, setSelectedMemoryId] = useState<number | null>(null);
  const [editingMemoryId, setEditingMemoryId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [memoryToDelete, setMemoryToDelete] = useState<MemoryItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 使用通知系统
  const notification = useNotification();

  const loadMemories = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/agents/${agentId}/memories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMemories(data.memories || []);
          setStats(data.stats || null);
        } else {
          setError('获取记忆数据失败');
        }
      } else {
        setError(`请求失败 (${response.status})`);
      }
    } catch (err) {
      setError('网络错误');
      console.error('加载记忆失败:', err);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  // 加载记忆数据
  useEffect(() => {
    if (isOpen && agentId) {
      loadMemories();
    }
  }, [isOpen, agentId, loadMemories]);

  // 当记忆列表加载完成后，自动选择第一个记忆
  useEffect(() => {
    if (memories.length > 0 && !selectedMemoryId) {
      setSelectedMemoryId(memories[0].id);
    }
  }, [memories, selectedMemoryId]);

  // 当弹窗关闭时重置状态
  useEffect(() => {
    if (!isOpen) {
      setSelectedMemoryId(null);
      setEditingMemoryId(null);
      setEditingContent('');
    }
  }, [isOpen]);

  // 键盘ESC退出功能
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        // 如果正在编辑，先取消编辑状态
        if (editingMemoryId) {
          setEditingMemoryId(null);
          setEditingContent('');
        } else {
          // 否则关闭弹窗
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, editingMemoryId, onClose]);

  // 选择记忆
  const handleSelectMemory = (memoryId: number) => {
    setSelectedMemoryId(memoryId);
    // 如果正在编辑其他记忆，取消编辑状态
    if (editingMemoryId && editingMemoryId !== memoryId) {
      setEditingMemoryId(null);
      setEditingContent('');
    }
  };

  // 编辑记忆
  const handleEditMemory = async (memoryId: number) => {
    const memory = memories.find(m => m.id === memoryId);
    if (!memory) return;
    
    // 直接使用JSON格式进行编辑
    setEditingMemoryId(memoryId);
    setEditingContent(formatMemoryForDisplay(memory));
    setSelectedMemoryId(memoryId);
  };

  // 保存编辑
  const handleSaveEdit = async (memoryId: number) => {
    if (editingContent.trim() === '') {
      notification.error('记忆内容不能为空');
      return;
    }
    
    setIsProcessing(true);
    try {
      const memory = memories.find(m => m.id === memoryId);
      if (!memory) return;
      
      // 解析JSON数据
      let parsedData;
      try {
        parsedData = JSON.parse(editingContent);
      } catch (error) {
        notification.error('JSON格式错误，请检查格式');
        return;
      }
      
      const token = localStorage.getItem('accessToken');
      const updateResponse = await fetch(`/api/memories/${memoryId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: parsedData.summary || '',
          summary: parsedData.summary || '',
          importantTopics: parsedData.importantTopics || [],
          keyFacts: parsedData.keyFacts || [],
          preferences: parsedData.preferences || [],
          context: parsedData.context || '',
          importance_score: memory.importance_score,
          memory_type: memory.memory_type
        })
      });
      
      if (updateResponse.ok) {
        loadMemories();
        setEditingMemoryId(null);
        setEditingContent('');
        notification.success('记忆更新成功');
      } else {
        const errorData = await updateResponse.json();
        notification.error(`更新失败: ${errorData.error}`);
      }
      
    } catch (error) {
      console.error('更新记忆时发生错误:', error);
      notification.error('更新记忆失败，请稍后重试');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // 取消编辑
  const handleCancelEdit = () => {
    setEditingMemoryId(null);
    setEditingContent('');
  };

  // 处理删除记忆点击
  const handleDeleteMemory = (memory: MemoryItem) => {
    setMemoryToDelete(memory);
    setDeleteModalOpen(true);
  };

  // 确认删除记忆
  const confirmDeleteMemory = async () => {
    if (!memoryToDelete) return;
    
    try {
      setIsProcessing(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/memories/${memoryToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        // 如果删除的是当前选中的记忆，清除选中状态
        if (selectedMemoryId === memoryToDelete.id) {
          setSelectedMemoryId(null);
        }
        
        loadMemories();
        setDeleteModalOpen(false);
        setMemoryToDelete(null);
        
        notification.success('记忆删除成功');
      } else {
        const errorData = await response.json();
        notification.error(`删除失败: ${errorData.error}`);
      }
    } catch (error) {
      console.error('删除记忆时发生错误:', error);
      notification.error('删除记忆失败，请稍后重试');
    } finally {
      setIsProcessing(false);
    }
  };

  // 格式化记忆内容用于列表显示
  const formatMemoryContent = (content: string): string => {
    if (!content) return '无内容';
    
    // 如果内容太长，截取前100个字符
    if (content.length > 100) {
      return content.substring(0, 100) + '...';
    }
    
    return content;
  };

  // 清理和格式化JSON内容
  const cleanJsonContent = (obj: any): any => {
    if (typeof obj === 'string') {
      // 尝试解析嵌套的JSON字符串
      if (obj.startsWith('```json\n') && obj.endsWith('\n```')) {
        try {
          const jsonStr = obj.slice(8, -4); // 移除 ```json\n 和 \n```
          return JSON.parse(jsonStr);
        } catch {
          return obj.replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }
      }
      // 处理普通的转义字符
      return obj.replace(/\\n/g, '\n').replace(/\\"/g, '"');
    }
    
    if (Array.isArray(obj)) {
      return obj.map(cleanJsonContent);
    }
    
    if (obj && typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        cleaned[key] = cleanJsonContent(value);
      }
      return cleaned;
    }
    
    return obj;
  };

  // 简单的JSON格式化显示
  const formatMemoryForDisplay = (memory: MemoryItem) => {
    // 构建优化的数据结构，避免重复显示
    const rawData: any = {};
    
    // 优先显示 summary 对象中的内容（如果存在且有意义）
    if (memory.parsedContent.summary && typeof memory.parsedContent.summary === 'object') {
      rawData.summary = memory.parsedContent.summary;
    } else if (memory.parsedContent.summary) {
      rawData.summary = memory.parsedContent.summary;
    }
    
    // 只有当这些字段有内容时才显示
    if (memory.parsedContent.importantTopics && memory.parsedContent.importantTopics.length > 0) {
      rawData.importantTopics = memory.parsedContent.importantTopics;
    }
    
    if (memory.parsedContent.keyFacts && memory.parsedContent.keyFacts.length > 0) {
      rawData.keyFacts = memory.parsedContent.keyFacts;
    }
    
    if (memory.parsedContent.preferences && memory.parsedContent.preferences.length > 0) {
      rawData.preferences = memory.parsedContent.preferences;
    }
    
    // 只有当 context 与 summary 不同时才显示
    if (memory.parsedContent.context && 
        JSON.stringify(memory.parsedContent.context) !== JSON.stringify(memory.parsedContent.summary)) {
      rawData.context = memory.parsedContent.context;
    }
    
    // 始终显示元数据
    rawData.metadata = {
      conversation_id: memory.conversation_id,
      agent_id: memory.agent_id,
      memory_type: memory.memory_type,
      importance_score: memory.importance_score,
      tokens_saved: memory.tokens_saved,
      source_message_range: memory.source_message_range,
      created_at: memory.created_at
    };
    
    // 清理数据中的转义字符和嵌套JSON
    const cleanedData = cleanJsonContent(rawData);
    
    return JSON.stringify(cleanedData, null, 2);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div 
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div 
              className="bg-theme-background rounded-2xl shadow-xl w-full max-w-6xl max-h-[85vh] flex flex-col overflow-hidden border border-theme-border"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 头部 */}
              <div className="flex items-center justify-between p-8 pb-6 border-b border-theme-border">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-theme-primary to-theme-accent flex items-center justify-center">
                    <Brain className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="page-title text-theme-foreground">
                      {agentName} 的记忆
                    </h2>
                    {stats && (
                      <p className="text-theme-foreground-muted text-sm">
                        共 {stats.total_memories} 条记忆，节省 {stats.total_tokens_saved} tokens
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-theme-card hover:bg-theme-card-hover flex items-center justify-center text-theme-foreground-muted hover:text-theme-foreground transition-all duration-200 border border-theme-border"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 记忆内容区域 - 左右布局 */}
              <div className="flex-1 overflow-hidden flex">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16 w-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-primary mb-4"></div>
                    <p className="text-theme-foreground-muted">加载记忆中...</p>
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center py-16 w-full">
                    <div className="w-16 h-16 rounded-xl bg-theme-error/10 flex items-center justify-center mb-4">
                      <Brain className="w-8 h-8 text-theme-error" />
                    </div>
                    <h3 className="text-lg font-medium text-theme-foreground mb-2">加载失败</h3>
                    <p className="text-theme-error text-center max-w-md">{error}</p>
                  </div>
                ) : memories.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 w-full">
                    <div className="w-16 h-16 rounded-xl bg-theme-primary/10 flex items-center justify-center mb-4">
                      <Brain className="w-8 h-8 text-theme-primary" />
                    </div>
                    <h3 className="text-lg font-medium text-theme-foreground mb-2">暂无记忆</h3>
                  </div>
                ) : (
                  <>
                    {/* 左侧：记忆简述列表 */}
                    <div className="w-1/3 border-r border-theme-border flex flex-col">
                      <div className="p-6 border-b border-theme-border">
                        <h3 className="text-lg font-medium text-theme-foreground">记忆列表</h3>
                      </div>
                      <div className="flex-1 overflow-y-auto scrollbar-thin">
                        <div className="p-4 space-y-2">
                          {memories.map((memory) => (
                            <div 
                              key={memory.id} 
                              className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-sm ${
                                selectedMemoryId === memory.id 
                                  ? 'bg-theme-primary/10 border-theme-primary text-theme-primary shadow-sm' 
                                  : 'bg-theme-card border-theme-border hover:bg-theme-card-hover text-theme-foreground hover:border-theme-primary/30'
                              }`}
                              onClick={() => handleSelectMemory(memory.id)}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium line-clamp-2 text-sm mb-2">
                                    {formatMemoryContent(memory.parsedContent.summary)}
                                  </p>
                                  <div className="flex items-center gap-4 text-xs opacity-75">
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 flex-shrink-0" />
                                      <span className="truncate">{formatTime(memory.created_at)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Star className="w-3 h-3 flex-shrink-0" />
                                      <span>{memory.importance_score.toFixed(1)}</span>
                                    </div>
                                  </div>
                                </div>
                                {selectedMemoryId === memory.id && (
                                  <ChevronRight className="w-4 h-4 flex-shrink-0" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 右侧：记忆详细内容 */}
                    <div className="flex-1 flex flex-col">
                      {selectedMemoryId ? (() => {
                        const selectedMemory = memories.find(m => m.id === selectedMemoryId);
                        if (!selectedMemory) return null;
                        
                        return (
                          <div className="h-full flex flex-col p-6">
                            {/* 标题和操作按钮 */}
                            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                              <h4 className="text-lg font-medium text-theme-foreground">
                                {editingMemoryId === selectedMemory.id ? '编辑记忆' : '记忆内容'}
                              </h4>
                              <div className="flex items-center gap-2">
                                {editingMemoryId === selectedMemory.id ? (
                                  <>
                                    <button
                                      onClick={() => handleSaveEdit(selectedMemory.id)}
                                      className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary/90 transition-colors duration-200 font-medium text-sm"
                                    >
                                      保存
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      className="px-4 py-2 bg-theme-background border border-theme-border text-theme-foreground rounded-lg hover:bg-theme-card transition-colors duration-200 text-sm"
                                    >
                                      取消
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleEditMemory(selectedMemory.id)}
                                      className="w-9 h-9 rounded-lg bg-theme-background hover:bg-theme-primary/10 flex items-center justify-center text-theme-foreground-muted hover:text-theme-primary transition-all duration-200 border border-theme-border"
                                      title="编辑记忆"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMemory(selectedMemory)}
                                      className="w-9 h-9 rounded-lg bg-theme-background hover:bg-theme-error/10 flex items-center justify-center text-theme-foreground-muted hover:text-theme-error transition-all duration-200 border border-theme-border"
                                      title="删除记忆"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            {/* 记忆内容显示/编辑区域 - 统一高度80vh */}
                            <div className="bg-theme-background border border-theme-border rounded-xl overflow-hidden" style={{ height: '80vh' }}>
                              {editingMemoryId === selectedMemory.id ? (
                                /* 编辑模式 */
                                <textarea
                                  value={editingContent}
                                  onChange={(e) => setEditingContent(e.target.value)}
                                  className="w-full h-full p-4 text-sm bg-transparent border-none resize-none focus:outline-none font-mono text-theme-foreground"
                                  placeholder="请输入JSON格式的记忆内容..."
                                  autoFocus
                                />
                              ) : (
                                /* 查看模式 - JSON格式显示 */
                                <pre className="p-4 text-sm text-theme-foreground leading-relaxed h-full overflow-y-auto scrollbar-thin whitespace-pre-wrap break-words">
                                  {formatMemoryForDisplay(selectedMemory)}
                                </pre>
                              )}
                            </div>
                          </div>
                        );
                      })() : null}
                    </div>
                  </>
                )}
              </div>
              
              {/* 处理状态指示器 */}
              {isProcessing && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-theme-card border border-theme-border rounded-lg px-4 py-2 shadow-lg">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-theme-primary"></div>
                      <span className="text-sm text-theme-foreground">处理中...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
          
          {/* 删除确认弹窗 */}
          <Modal
            open={deleteModalOpen}
            onClose={() => { setDeleteModalOpen(false); setMemoryToDelete(null); }}
            title="确认删除记忆"
            icon={<AlertTriangle className="w-6 h-6 text-theme-warning" />}
            actions={[
              {
                label: '取消',
                onClick: () => { setDeleteModalOpen(false); setMemoryToDelete(null); },
                variant: 'secondary',
              },
              {
                label: '确认删除',
                onClick: confirmDeleteMemory,
                variant: 'danger',
                autoFocus: true,
                disabled: isProcessing,
              },
            ]}
            width={380}
          >
            {memoryToDelete && (
              <span>
                确定要删除这条记忆吗？此操作不可撤销。
                <br />
                <span className="text-theme-foreground-muted text-sm mt-2 block">
                  记忆内容：{formatMemoryContent(memoryToDelete.parsedContent.summary).slice(0, 50)}...
                </span>
              </span>
            )}
          </Modal>
        </>
      )}
    </AnimatePresence>
  );
}

export default AgentMemoryModal;