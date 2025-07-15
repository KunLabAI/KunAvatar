'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Brain, Clock, Star, TrendingUp, ChevronRight, X, Edit3, Trash2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '@/components/Modal';
import { useNotification } from '@/components/notification/NotificationContext';

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
      const response = await fetch(`/api/agents/${agentId}/memories`);
      
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
    try {
      const response = await fetch(`/api/memories/${memoryId}`);
      if (!response.ok) {
        throw new Error('获取记忆详情失败');
      }
      
      const data = await response.json();
      const memory = data.memory;
      
      // 使用格式化后的内容进行编辑
      setEditingMemoryId(memoryId);
      setEditingContent(formatMemoryForDisplay(memory));
      
      // 确保选中当前记忆
      setSelectedMemoryId(memoryId);
      
    } catch (error) {
      console.error('获取记忆详情时发生错误:', error);
      notification.error('获取记忆详情失败，请稍后重试');
    }
  };
  
  // 解析格式化文本为结构化数据
  const parseFormattedContent = (formattedText: string) => {
    const lines = formattedText.split('\n');
    const result = {
      summary: '',
      importantTopics: [] as string[],
      keyFacts: [] as string[],
      preferences: [] as string[],
      context: ''
    };
    
    let currentSection = '';
    let currentContent = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('**摘要：**')) {
        currentSection = 'summary';
        currentContent = '';
      } else if (trimmedLine.startsWith('**重要话题：**')) {
        if (currentSection === 'summary') {
          result.summary = currentContent.trim();
        }
        currentSection = 'importantTopics';
        currentContent = '';
      } else if (trimmedLine.startsWith('**关键事实：**')) {
        if (currentSection === 'importantTopics') {
          result.importantTopics = currentContent.split('\n').filter(item => item.trim().startsWith('•')).map(item => item.replace(/^•\s*/, '').trim()).filter(Boolean);
        }
        currentSection = 'keyFacts';
        currentContent = '';
      } else if (trimmedLine.startsWith('**用户偏好：**')) {
        if (currentSection === 'keyFacts') {
          result.keyFacts = currentContent.split('\n').filter(item => item.trim().startsWith('•')).map(item => item.replace(/^•\s*/, '').trim()).filter(Boolean);
        }
        currentSection = 'preferences';
        currentContent = '';
      } else if (trimmedLine.startsWith('**上下文：**')) {
        if (currentSection === 'preferences') {
          result.preferences = currentContent.split('\n').filter(item => item.trim().startsWith('•')).map(item => item.replace(/^•\s*/, '').trim()).filter(Boolean);
        }
        currentSection = 'context';
        currentContent = '';
      } else if (trimmedLine.startsWith('**元数据：**')) {
        if (currentSection === 'context') {
          result.context = currentContent.trim();
        }
        break; // 元数据部分不需要解析，保持原有值
      } else if (currentSection && trimmedLine) {
        currentContent += (currentContent ? '\n' : '') + line;
      }
    }
    
    // 处理最后一个section
    if (currentSection === 'summary') {
      result.summary = currentContent.trim();
    } else if (currentSection === 'importantTopics') {
      result.importantTopics = currentContent.split('\n').filter(item => item.trim().startsWith('•')).map(item => item.replace(/^•\s*/, '').trim()).filter(Boolean);
    } else if (currentSection === 'keyFacts') {
      result.keyFacts = currentContent.split('\n').filter(item => item.trim().startsWith('•')).map(item => item.replace(/^•\s*/, '').trim()).filter(Boolean);
    } else if (currentSection === 'preferences') {
      result.preferences = currentContent.split('\n').filter(item => item.trim().startsWith('•')).map(item => item.replace(/^•\s*/, '').trim()).filter(Boolean);
    } else if (currentSection === 'context') {
      result.context = currentContent.trim();
    }
    
    return result;
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
      
      // 解析格式化文本
      const parsedData = parseFormattedContent(editingContent);
      
      const updateResponse = await fetch(`/api/memories/${memoryId}`, {
        method: 'PUT',
        headers: {
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
      const response = await fetch(`/api/memories/${memoryToDelete.id}`, {
        method: 'DELETE'
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

  // 格式化记忆内容
  const formatMemoryContent = (content: string): string => {
    if (!content) return '';
    
    try {
      const parsed = JSON.parse(content);
      if (typeof parsed === 'object' && parsed.summary) {
        return parsed.summary;
      }
      return content;
    } catch {
      return content;
    }
  };

  // 格式化记忆数据为可读格式
  const formatMemoryForDisplay = (memory: MemoryItem) => {
    const data = {
      summary: memory.parsedContent.summary || '',
      importantTopics: memory.parsedContent.importantTopics || [],
      keyFacts: memory.parsedContent.keyFacts || [],
      preferences: memory.parsedContent.preferences || [],
      context: memory.parsedContent.context || '',
      metadata: {
        conversation_id: memory.conversation_id,
        agent_id: memory.agent_id,
        memory_type: memory.memory_type,
        importance_score: memory.importance_score,
        tokens_saved: memory.tokens_saved,
        source_message_range: memory.source_message_range,
        created_at: memory.created_at
      }
    };
    
    let formatted = '';
    
    if (data.summary) {
      formatted += `**摘要：**\n${data.summary}\n\n`;
    }
    
    if (data.importantTopics.length > 0) {
      formatted += `**重要话题：**\n${data.importantTopics.map(topic => `• ${topic}`).join('\n')}\n\n`;
    }
    
    if (data.keyFacts.length > 0) {
      formatted += `**关键事实：**\n${data.keyFacts.map(fact => `• ${fact}`).join('\n')}\n\n`;
    }
    
    if (data.preferences.length > 0) {
      formatted += `**用户偏好：**\n${data.preferences.map(pref => `• ${pref}`).join('\n')}\n\n`;
    }
    
    return formatted;
  };

  // 格式化日期
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
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
                                      <span className="truncate">{formatDate(memory.created_at)}</span>
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
                        
                        // 构建完整的JSON数据
                        const memoryJsonData = {
                          id: selectedMemory.id,
                          summary: selectedMemory.parsedContent.summary || '',
                          content: selectedMemory.content || '',
                          importantTopics: selectedMemory.parsedContent.importantTopics || [],
                          keyFacts: selectedMemory.parsedContent.keyFacts || [],
                          preferences: selectedMemory.parsedContent.preferences || [],
                          context: selectedMemory.parsedContent.context || '',
                          metadata: {
                            conversation_id: selectedMemory.conversation_id,
                            agent_id: selectedMemory.agent_id,
                            memory_type: selectedMemory.memory_type,
                            importance_score: selectedMemory.importance_score,
                            tokens_saved: selectedMemory.tokens_saved,
                            source_message_range: selectedMemory.source_message_range,
                            created_at: selectedMemory.created_at
                          }
                        };
                        
                        return (
                          <div className="h-full flex flex-col">
                            {/* 统一的记忆内容区域 */}
                            <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
                              <div className="space-y-4">
                                {/* 标题和操作按钮 */}
                                <div className="flex items-center justify-between">
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
                                
                                {/* 记忆内容显示/编辑区域 */}
                                <div className="bg-theme-background border border-theme-border rounded-xl overflow-hidden h-[768px]">
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
                                    /* 查看模式 - 格式化显示 */
                                    <div className="p-4 text-sm text-theme-foreground leading-relaxed whitespace-pre-wrap break-words h-full overflow-y-auto scrollbar-thin">
                                      {formatMemoryForDisplay(selectedMemory)}
                                    </div>
                                  )}
                                </div>
                              </div>
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