import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Brain, X, Clock, Star, TrendingUp, ChevronRight, ChevronDown, Edit3, Trash2, GripVertical } from 'lucide-react';
import { InlineLoading } from '@/components/Loading';
import { formatTime } from '@/lib/utils/time';
import { authenticatedFetch, useAuthErrorHandler } from '@/lib/utils/auth-utils';
import { useI18n } from '@/contexts/I18nContext';

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

interface MemoryPanelProps {
  conversationId: string | null;
  agentId?: number | null;
  isVisible: boolean;
  onToggle: () => void;
}

export function MemoryPanel({ conversationId, agentId, isVisible, onToggle }: MemoryPanelProps) {
  const { t } = useI18n();
  
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);// 展开的记忆ID集合
  const [expandedMemories, setExpandedMemories] = useState<Set<number>>(new Set());
  // 编辑状态管理
  const [editingMemoryId, setEditingMemoryId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  
  // 认证错误处理
  const { handleAuthError } = useAuthErrorHandler();
  
  // 拖拽相关状态
  const [panelHeight, setPanelHeight] = useState(300);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  // 拖拽处理函数
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartHeight.current = panelHeight;
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - dragStartY.current;
      // 修正拖拽方向：向上拖拽(deltaY < 0)扩大，向下拖拽(deltaY > 0)缩小
      const newHeight = Math.max(200, Math.min(800, dragStartHeight.current - deltaY));
      setPanelHeight(newHeight);
      
      // 计算拖拽进度 (0-1)
      const progress = Math.abs(deltaY) / 200;
      setDragProgress(Math.min(1, progress));
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      setDragProgress(0);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [panelHeight]);

  // 加载记忆数据
  const loadMemories = useCallback(async () => {
    if (!conversationId && !agentId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let response;
      
      // 优先使用agentId获取Agent的所有记忆，否则使用conversationId获取对话记忆
      if (agentId) {
        response = await authenticatedFetch(`/api/agents/${agentId}/memories`);
      } else if (conversationId) {
        response = await authenticatedFetch(`/api/conversations/${conversationId}/memories`);
      } else {
        return;
      }
      
      // 检查认证错误
      if (response.status === 401) {
        handleAuthError();
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMemories(data.memories || []);
          setStats(data.stats || null);
        } else {
          setError(t('chat.tools.memory.errors.loadFailed'));
        }
      } else {
        setError(t('chat.tools.memory.errors.requestFailed').replace('{status}', response.status.toString()));
      }
    } catch (err) {
      setError(t('chat.tools.memory.errors.networkError'));
      console.error(t('chat.tools.memory.errors.loadFailed'), err);
    } finally {
      setLoading(false);
    }
  }, [conversationId, agentId, handleAuthError, t]);

  useEffect(() => {
    if ((conversationId || agentId) && isVisible) {
      loadMemories();
    }
  }, [conversationId, agentId, isVisible, loadMemories]);

  const toggleMemoryExpansion = (memoryId: number) => {
    const newExpanded = new Set(expandedMemories);
    if (newExpanded.has(memoryId)) {
      newExpanded.delete(memoryId);
    } else {
      newExpanded.add(memoryId);
    }
    setExpandedMemories(newExpanded);
  };

  // 编辑记忆
  const handleEditMemory = async (memoryId: number) => {
    try {
      // 获取记忆详情
      const response = await authenticatedFetch(`/api/memories/${memoryId}`);
      
      // 检查认证错误
      if (response.status === 401) {
        handleAuthError();
        return;
      }
      
      if (!response.ok) {
        throw new Error(t('chat.tools.memory.errors.getDetailsFailed'));
      }
      
      const data = await response.json();
      const memory = data.memory;
      
      // 启动内联编辑模式
      setEditingMemoryId(memoryId);
      setEditingContent(
        typeof memory.parsedContent === 'object' 
          ? memory.parsedContent.summary || memory.content
          : memory.content
      );
      
      // 确保记忆是展开状态
      if (!expandedMemories.has(memoryId)) {
        toggleMemoryExpansion(memoryId);
      }
      
    } catch (error) {
      console.error(t('chat.tools.memory.errors.getDetailsFailed'), error);
      alert(t('chat.tools.memory.errors.getDetailsError'));
    }
  };
  
  // 保存编辑
  const handleSaveEdit = async (memoryId: number) => {
    if (editingContent.trim() === '') {
      alert(t('chat.tools.memory.errors.contentEmpty'));
      return;
    }
    
    try {
      const memory = memories.find(m => m.id === memoryId);
      if (!memory) return;
      
      const updateResponse = await authenticatedFetch(`/api/memories/${memoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: editingContent,
          importance_score: memory.importance_score,
          memory_type: memory.memory_type
        })
      });
      
      // 检查认证错误
      if (updateResponse.status === 401) {
        handleAuthError();
        return;
      }
      
      if (updateResponse.ok) {
        // 重新加载记忆列表
        loadMemories();
        setEditingMemoryId(null);
        setEditingContent('');
        console.log('✏️ 记忆更新成功');
      } else {
        const errorData = await updateResponse.json();
        alert(t('chat.tools.memory.errors.updateFailed') + ': ' + (errorData.error || ''));
      }
      
    } catch (error) {
      console.error(t('chat.tools.memory.errors.updateError'), error);
      alert(t('chat.tools.memory.errors.updateError'));
    }
  };
  
  // 取消编辑
  const handleCancelEdit = () => {
    setEditingMemoryId(null);
    setEditingContent('');
  };

  // 删除记忆
  const handleDeleteMemory = async (memoryId: number) => {
    if (!confirm(t('chat.tools.memory.confirmDelete'))) {
      return;
    }
    
    try {
      const response = await authenticatedFetch(`/api/memories/${memoryId}`, {
        method: 'DELETE'
      });
      
      // 检查认证错误
      if (response.status === 401) {
        handleAuthError();
        return;
      }
      
      if (response.ok) {
        // 重新加载记忆列表
        loadMemories();
      } else {
        alert(t('chat.tools.memory.errors.deleteFailed'));
      }
    } catch (err) {
      console.error(t('chat.tools.memory.errors.deleteFailed') + ':', err);
      alert(t('chat.tools.memory.errors.deleteFailed'));
    }
  };

  // 格式化记忆内容，去除JSON格式
  const formatMemoryContent = (content: string) => {
    if (typeof content === 'string') {
      return content;
    } else if (typeof content === 'object') {
      return JSON.stringify(content);
    } else {
      return content;
    }
  };

  const getImportanceColor = (score: number) => {
    if (score >= 0.8) return 'text-red-500';
    if (score >= 0.6) return 'text-orange-500';
    if (score >= 0.4) return 'text-yellow-500';
    return 'text-gray-500';
  };

  if (!conversationId && !agentId) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-theme-background/50 rounded-lg border border-theme-border">
        <Brain className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-400">{t('chat.tools.memory.noMemoryData')}</span>
      </div>
    );
  }

  return (
    <div 
      ref={panelRef}
      className="w-full bg-theme-card border border-theme-border rounded-xl shadow-lg overflow-hidden flex flex-col"
      style={{ height: `${panelHeight}px` }}
    >
      {/* 拖拽手柄 */}
      <div 
        className={`relative flex items-center justify-center h-2 bg-theme-background-secondary border-b border-theme-border cursor-ns-resize select-none transition-all duration-200 ${
          isDragging 
            ? 'bg-theme-primary/15' 
            : isHovering 
            ? 'bg-theme-card-hover' 
            : 'hover:bg-theme-card-hover'
        }`}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        title={t('chat.tools.memory.dragToResize')}
        style={{ userSelect: 'none' }}
      >
        {/* 拖拽进度指示器 */}
        <div 
          className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-theme-primary to-theme-primary/60 transition-all duration-200"
          style={{ 
            width: `${dragProgress * 100}%`,
            opacity: isDragging || isHovering ? 1 : 0
          }}
        />
        
        {/* 简化的拖拽图标 */}
        <GripVertical className={`w-3 h-3 transition-colors duration-200 ${
          isDragging 
            ? 'text-theme-primary' 
            : isHovering 
            ? 'text-theme-foreground'
            : 'text-theme-foreground-muted'
        }`} />
      </div>
      
      <div className="p-4 flex-1 flex flex-col min-h-0">
        {/* 记忆面板头部 */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-theme-primary" />
              <span className="text-sm font-medium text-theme-foreground">
                {agentId ? t('chat.tools.memory.agentTitle') : t('chat.tools.memory.title')}
              </span>
            </div>
            {stats && (
              <div className="text-xs text-theme-foreground-muted ml-6">
                {t('chat.tools.memory.stats').replace('{count}', stats.total_memories.toString()).replace('{tokens}', stats.total_tokens_saved.toString())}
              </div>
            )}
          </div>
          <div className="flex items-center">
            <button
              onClick={onToggle}
              className="p-1 hover:bg-theme-card-hover rounded-lg transition-colors"
              title={t('chat.tools.memory.closePanel')}
            >
              <X className="w-4 h-4 text-theme-foreground-muted hover:text-theme-foreground transition-colors" />
            </button>
          </div>
        </div>

        {/* 记忆内容区域 */}
        <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <InlineLoading 
                text={t('chat.tools.memory.loading')} 
                size="small"
              />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          ) : memories.length === 0 ? (
            <div className="text-center py-8">
              <Brain className="w-8 h-8 text-theme-foreground-muted mx-auto mb-2" />
              <p className="text-sm text-theme-foreground-muted">
                {agentId ? t('chat.tools.memory.noAgentMemory') : t('chat.tools.memory.noConversationMemory')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {memories.map((memory) => (
                <div key={memory.id} className="border border-theme-border rounded-lg p-3 bg-theme-background-secondary/30">
                   <div className="flex items-start justify-between">
                     <div 
                       className="flex-1 min-w-0 cursor-pointer"
                       onClick={() => toggleMemoryExpansion(memory.id)}
                     >
                       <div className="flex items-center gap-2 mb-1">
                         {expandedMemories.has(memory.id) ? (
                           <ChevronDown className="w-4 h-4 text-theme-foreground-muted flex-shrink-0" />
                         ) : (
                           <ChevronRight className="w-4 h-4 text-theme-foreground-muted flex-shrink-0" />
                         )}
                         <p className="text-sm text-theme-foreground font-medium line-clamp-1">
                           {formatMemoryContent(memory.parsedContent.summary)}
                         </p>
                       </div>
                       <div className="flex items-center gap-4 text-xs text-theme-foreground-muted ml-6">
                         <div className="flex items-center gap-1">
                           <Clock className="w-3 h-3" />
                           <span>{formatTime(memory.created_at)}</span>
                         </div>
                         <div className="flex items-center gap-1">
                           <Star className="w-3 h-3" />
                           <span>{t('chat.tools.memory.importance').replace('{score}', memory.importance_score.toFixed(1))}</span>
                         </div>
                         <div className="flex items-center gap-1">
                           <TrendingUp className="w-3 h-3" />
                           <span>{t('chat.tools.memory.tokensSaved').replace('{tokens}', memory.tokens_saved.toString())}</span>
                         </div>
                       </div>
                     </div>
                     
                     {/* 操作按钮 */}
                     <div className="flex items-center gap-1 ml-2">
                       <button
                         onClick={(e) => {
                           e.stopPropagation();
                           handleEditMemory(memory.id);
                         }}
                         className="p-1 hover:bg-theme-card-hover rounded-lg transition-colors"
                         title={t('chat.tools.memory.editMemory')}
                       >
                         <Edit3 className="w-3 h-3 text-theme-foreground-muted hover:text-theme-primary transition-colors" />
                       </button>
                       <button
                         onClick={(e) => {
                           e.stopPropagation();
                           handleDeleteMemory(memory.id);
                         }}
                         className="p-1 hover:bg-theme-card-hover rounded-lg transition-colors"
                         title={t('chat.tools.memory.deleteMemory')}
                       >
                         <Trash2 className="w-3 h-3 text-theme-foreground-muted hover:text-red-500 transition-colors" />
                       </button>
                     </div>
                   </div>
                  
                  {expandedMemories.has(memory.id) && (
                    <div className="mt-3 pt-3 border-t border-theme-border space-y-2">
                      {/* 编辑模式 */}
                      {editingMemoryId === memory.id ? (
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-xs font-medium text-theme-foreground-muted mb-2">{t('chat.tools.memory.editContent')}</h4>
                            <textarea
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              className="w-full h-32 p-3 text-sm bg-theme-background border border-theme-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary"
                              placeholder={t('chat.tools.memory.contentPlaceholder')}
                              autoFocus
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSaveEdit(memory.id)}
                              className="px-3 py-1.5 bg-theme-primary text-white text-xs rounded-lg hover:bg-theme-primary/90 transition-colors"
                            >
                              {t('chat.tools.memory.save')}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-3 py-1.5 bg-theme-background-secondary text-theme-foreground-muted text-xs rounded-lg hover:bg-theme-card-hover transition-colors"
                            >
                              {t('chat.tools.memory.cancel')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* 查看模式 - 只显示详细内容，不显示摘要 */
                        <>
                          {/* 原始内容 */}
                          {memory.content && (
                            <div>
                              <h4 className="text-xs font-medium text-theme-foreground-muted mb-1">{t('chat.tools.memory.content')}</h4>
                              <p className="text-sm text-theme-foreground leading-relaxed whitespace-pre-wrap">{formatMemoryContent(memory.content)}</p>
                            </div>
                          )}
                          
                          {memory.parsedContent.importantTopics && memory.parsedContent.importantTopics.length > 0 && (
                            <div>
                              <h4 className="text-xs font-medium text-theme-foreground-muted mb-1">{t('chat.tools.memory.importantTopics')}</h4>
                              <div className="flex flex-wrap gap-1">
                                {memory.parsedContent.importantTopics.map((topic, index) => (
                                  <span key={index} className="px-2 py-1 bg-theme-primary/10 text-theme-primary text-xs rounded">
                                    {formatMemoryContent(topic)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {memory.parsedContent.keyFacts && memory.parsedContent.keyFacts.length > 0 && (
                            <div>
                              <h4 className="text-xs font-medium text-theme-foreground-muted mb-1">{t('chat.tools.memory.keyFacts')}</h4>
                              <ul className="text-sm text-theme-foreground space-y-1">
                                {memory.parsedContent.keyFacts.map((fact, index) => (
                                  <li key={index} className="flex items-start gap-2">
                                    <span className="w-1 h-1 bg-theme-foreground-muted rounded-full mt-2 flex-shrink-0"></span>
                                    <span>{formatMemoryContent(fact)}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {memory.parsedContent.preferences && memory.parsedContent.preferences.length > 0 && (
                            <div>
                              <h4 className="text-xs font-medium text-theme-foreground-muted mb-1">{t('chat.tools.memory.userPreferences')}</h4>
                              <ul className="text-sm text-theme-foreground space-y-1">
                                {memory.parsedContent.preferences.map((pref, index) => (
                                  <li key={index} className="flex items-start gap-2">
                                    <span className="w-1 h-1 bg-theme-foreground-muted rounded-full mt-2 flex-shrink-0"></span>
                                    <span>{formatMemoryContent(pref)}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="pt-2 border-t border-theme-border">
                            <div className="flex items-center justify-between text-xs text-theme-foreground-muted">
                              <span>{t('chat.tools.memory.memoryId').replace('{id}', memory.id.toString())}</span>
                              <span>{t('chat.tools.memory.messageRange').replace('{range}', memory.source_message_range || 'N/A')}</span>
                              <span>{t('chat.tools.memory.tokensSaved').replace('{tokens}', memory.tokens_saved.toString())}</span>
                            </div>
                            <div className="mt-1 text-xs text-theme-foreground-muted">
                              {t('chat.tools.memory.memoryType').replace('{type}', memory.memory_type)} | {t('chat.tools.memory.createdAt').replace('{time}', formatTime(memory.created_at))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}