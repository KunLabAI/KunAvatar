import { MessageSquare, Trash2, Calendar, Clock, Bot, CheckSquare, Square, Hash, Type, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { Conversation } from '@/lib/database';
import { Agent } from '@/lib/database/agents';
import { formatTime, formatDate as formatDateOnly } from '@/lib/utils/time';

interface DateGroupedConversationListProps {
  conversations: Conversation[];
  agents: Agent[];
  onEnterConversation: (conversationId: string) => void;
  onDeleteConversation: (conversation: Conversation) => void;
  isSelectionMode?: boolean;
  selectedConversations?: Set<string>;
  onToggleSelection?: (conversationId: string) => void;
}

interface DateGroup {
  label: string;
  actualDate: string;
  conversations: Conversation[];
}

export function DateGroupedConversationList({
  conversations,
  agents,
  onEnterConversation,
  onDeleteConversation,
  isSelectionMode = false,
  selectedConversations = new Set(),
  onToggleSelection,
}: DateGroupedConversationListProps) {
  // 根据agent_id查找agent信息
  const getAgentById = (agentId: number | null | undefined): Agent | null => {
    if (!agentId) return null;
    return agents.find(agent => agent.id === agentId) || null;
  };

  const getDateLabel = (dateString: string): { label: string; actualDate: string } => {
    // SQLite DATETIME 是 UTC 时间，需要正确解析
    const date = new Date(dateString + 'Z'); // 添加 Z 表示 UTC 时间
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const conversationDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const actualDateStr = conversationDate.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    if (conversationDate.getTime() === today.getTime()) {
      return { label: '今天', actualDate: actualDateStr };
    } else if (conversationDate.getTime() === yesterday.getTime()) {
      return { label: '昨天', actualDate: actualDateStr };
    } else if (conversationDate >= threeDaysAgo) {
      return { label: '三天前', actualDate: actualDateStr };
    } else if (conversationDate >= oneWeekAgo) {
      return { label: '过去一周', actualDate: actualDateStr };
    } else {
      return { label: '更久以前', actualDate: actualDateStr };
    }
  };

  const groupConversationsByDate = (conversations: Conversation[]): DateGroup[] => {
    const groups: { [key: string]: DateGroup } = {};
    
    conversations.forEach(conversation => {
      const { label, actualDate } = getDateLabel(conversation.updated_at);
      const key = label; // 使用标签作为key，这样同一类别的对话会被归为一组
      
      if (!groups[key]) {
        groups[key] = {
          label,
          actualDate,
          conversations: []
        };
      }
      groups[key].conversations.push(conversation);
    });

    // 为每个分组计算正确的日期范围显示
    Object.values(groups).forEach(group => {
      if (group.label === '过去一周' || group.label === '更久以前') {
        // 获取该分组中最新和最旧的日期
        const dates = group.conversations.map(c => new Date(c.updated_at + 'Z')).sort((a, b) => b.getTime() - a.getTime());
        const newest = dates[0];
        const oldest = dates[dates.length - 1];
        
        if (dates.length > 1) {
          const newestStr = newest.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
          const oldestStr = oldest.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
          group.actualDate = `${oldestStr} ~ ${newestStr}`;
        }
      }
    });

    // 按时间顺序排序分组
    const sortedGroups = Object.values(groups).sort((a, b) => {
      const order = ['今天', '昨天', '三天前', '过去一周', '更久以前'];
      const aIndex = order.indexOf(a.label);
      const bIndex = order.indexOf(b.label);
      return aIndex - bIndex;
    });

    // 对每个分组内的对话按更新时间倒序排列
    sortedGroups.forEach(group => {
      group.conversations.sort((a, b) => 
        new Date(b.updated_at + 'Z').getTime() - new Date(a.updated_at + 'Z').getTime()
      );
    });

    return sortedGroups;
  };

  const dateGroups = groupConversationsByDate(conversations);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {dateGroups.map((group, groupIndex) => (
        <div key={`${group.label}-${group.actualDate}`}>
          {/* 日期分组标题 */}
          <div 
            className="flex items-center" 
            style={{ 
              marginBottom: 'var(--spacing-md)',
              paddingLeft: 'var(--spacing-sm)',
              gap: 'var(--spacing-md)'
            }}
          >
            <h2 style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: '600',
              color: 'var(--color-foreground)',
              margin: 0
            }}>
              {group.label}
            </h2>
            <span style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-foreground-muted)',
              padding: `var(--spacing-xs) var(--spacing-sm)`,
              flex: 1,
              textAlign: 'left'
            }}>
              {group.actualDate}
            </span>
          </div>

          {/* 该分组下的对话列表 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {group.conversations.map((conversation, index) => (
              <motion.div
                key={conversation.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (groupIndex * 0.1) + (index * 0.05), duration: 0.3 }}
                className="group transition-all duration-300 cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-card)',
                  border: `1px solid ${
                    isSelectionMode && selectedConversations.has(conversation.id) 
                      ? 'var(--color-primary)' 
                      : 'var(--color-border)'
                  }`,
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--spacing-md)',
                  boxShadow: isSelectionMode && selectedConversations.has(conversation.id) 
                    ? `0 0 0 2px rgba(var(--color-primary-rgb), 0.1)` 
                    : 'var(--shadow-sm)'
                }}
                onMouseEnter={(e) => {
                  if (!isSelectionMode || !selectedConversations.has(conversation.id)) {
                    e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                    e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb), 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (isSelectionMode && selectedConversations.has(conversation.id)) {
                    e.currentTarget.style.boxShadow = `0 0 0 2px rgba(var(--color-primary-rgb), 0.1)`;
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                  } else {
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                  }
                }}
                onClick={() => onEnterConversation(conversation.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start" style={{ gap: 'var(--spacing-sm)', flex: 1, minWidth: 0 }}>
                    {/* 选择框 */}
                    {isSelectionMode && (
                      <div 
                        className="flex-shrink-0 transition-colors duration-200"
                        style={{ marginTop: 'var(--spacing-xs)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSelection?.(conversation.id);
                        }}
                      >
                        {selectedConversations.has(conversation.id) ? (
                          <CheckSquare 
                            className="w-5 h-5 cursor-pointer" 
                            style={{ color: 'var(--color-primary)' }}
                          />
                        ) : (
                          <Square 
                            className="w-5 h-5 cursor-pointer" 
                            style={{ color: 'var(--color-foreground-muted)' }}
                          />
                        )}
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      {/* 对话标题 - 移除图标 */}
                      <div className="flex items-center" style={{ gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                        <h3 className="card-title truncate">
                          {conversation.title}
                        </h3>
                      </div>

                      {/* 模型和智能体信息 */}
                      <div className="flex items-center flex-wrap" style={{ gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                        {/* 模型信息 */}
                        {conversation.model && (
                          <div className="flex items-center" style={{ gap: 'var(--spacing-xs)' }}>
                            <Bot className="w-4 h-4" style={{ color: 'var(--color-foreground-muted)' }} />
                            <span style={{
                              fontSize: 'var(--font-size-sm)',
                              color: 'var(--color-foreground-muted)',
                              backgroundColor: 'var(--color-background)',
                              padding: `var(--spacing-xs) var(--spacing-xs)`,
                              borderRadius: 'var(--radius-md)'
                            }}>
                              {conversation.model}
                            </span>
                          </div>
                        )}
                        
                        {/* 智能体信息 */}
                        {(() => {
                          const agent = getAgentById(conversation.agent_id);
                          return agent ? (
                            <div className="flex items-center" style={{ gap: 'var(--spacing-xs)' }}>
                              <User className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                              <span style={{
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--color-primary)',
                                backgroundColor: 'rgba(var(--color-primary-rgb), 0.1)',
                                padding: `var(--spacing-xs) var(--spacing-xs)`,
                                borderRadius: 'var(--radius-md)',
                                fontWeight: '500'
                              }}>
                                {agent.name}
                              </span>
                            </div>
                          ) : null;
                        })()}
                      </div>

                      {/* 统计信息 */}
                      {conversation.stats && (
                        <div className="flex items-center flex-wrap" style={{ 
                          gap: 'var(--spacing-md)', 
                          fontSize: 'var(--font-size-sm)', 
                          color: 'var(--color-foreground-muted)',
                          marginBottom: 'var(--spacing-sm)'
                        }}>
                          <div className="flex items-center" style={{ gap: 'var(--spacing-xs)' }}>
                            <MessageSquare className="w-4 h-4" />
                            <span>{conversation.stats.message_count} 条消息</span>
                          </div>
                          <div className="flex items-center" style={{ gap: 'var(--spacing-xs)' }}>
                            <Hash className="w-4 h-4" />
                            <span>{conversation.stats.total_tokens.toLocaleString()} tokens</span>
                          </div>
                          <div className="flex items-center" style={{ gap: 'var(--spacing-xs)' }}>
                            <Type className="w-4 h-4" />
                            <span>{conversation.stats.total_characters.toLocaleString()} 字符</span>
                          </div>
                        </div>
                      )}

                      {/* 时间信息 */}
                      <div className="flex items-center" style={{ 
                        gap: 'var(--spacing-md)', 
                        fontSize: 'var(--font-size-sm)', 
                        color: 'var(--color-foreground-muted)' 
                      }}>
                        <div className="flex items-center" style={{ gap: 'var(--spacing-xs)' }}>
                          <Calendar className="w-4 h-4" />
                          <span>创建于 {formatDateOnly(conversation.created_at)}</span>
                        </div>
                        <div className="flex items-center" style={{ gap: 'var(--spacing-xs)' }}>
                          <Clock className="w-4 h-4" />
                          <span>更新于 {formatTime(conversation.updated_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  {!isSelectionMode && (
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ gap: 'var(--spacing-xs)' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(conversation);
                        }}
                        className="transition-all duration-200"
                        style={{
                          padding: 'var(--spacing-xs)',
                          color: 'var(--color-foreground-muted)',
                          borderRadius: 'var(--radius-lg)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'var(--color-error)';
                          e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--color-foreground-muted)';
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        title="删除对话"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* 进入对话提示 */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{
                  marginTop: 'var(--spacing-sm)',
                  paddingTop: 'var(--spacing-sm)',
                  borderTop: `1px solid var(--color-border)`
                }}>
                  <p style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-primary)',
                    fontWeight: '500'
                  }}>
                    {isSelectionMode ? '点击选择对话' : '点击进入对话'} →
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}