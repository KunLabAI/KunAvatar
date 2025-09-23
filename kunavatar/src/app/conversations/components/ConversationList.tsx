import React from 'react';
import { MessageSquare, Trash2, Calendar, Clock, Bot, CheckSquare, Square, Hash, Type, Edit3, MoreVertical, Check } from 'lucide-react';
import { formatTime, formatDate as formatDateOnly } from '@/lib/utils/time';
import { motion } from 'framer-motion';
import { Conversation } from '@/lib/database';
import { useI18n } from '@/contexts/I18nContext';

interface ConversationListProps {
  conversations: Conversation[];
  onEnterConversation: (conversationId: string) => void;
  onDeleteConversation: (conversation: Conversation) => void;
  isSelectionMode?: boolean;
  selectedConversations?: Set<string>;
  onToggleSelection?: (conversationId: string) => void;
}

export function ConversationList({
  conversations,
  onEnterConversation,
  onDeleteConversation,
  isSelectionMode = false,
  selectedConversations = new Set(),
  onToggleSelection,
}: ConversationListProps) {
  const { t } = useI18n();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      {conversations.map((conversation, index) => (
        <motion.div
          key={conversation.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
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
                {/* 对话标题和图标 */}
                <div className="flex items-center" style={{ gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                  <div style={{
                    padding: 'var(--spacing-xs)',
                    backgroundColor: 'rgba(var(--color-primary-rgb), 0.1)',
                    borderRadius: 'var(--radius-lg)'
                  }}>
                    <MessageSquare className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <h3 className="card-title truncate">
                    {conversation.title}
                  </h3>
                </div>

                {/* 模型信息 */}
                <div className="flex items-center" style={{ gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-sm)' }}>
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
                      <span>{t('conversations.stats.messages').replace('{count}', conversation.stats.message_count.toString())}</span>
                    </div>
                    <div className="flex items-center" style={{ gap: 'var(--spacing-xs)' }}>
                      <Hash className="w-4 h-4" />
                      <span>{t('conversations.stats.tokens').replace('{count}', conversation.stats.total_tokens.toLocaleString())}</span>
                    </div>
                    <div className="flex items-center" style={{ gap: 'var(--spacing-xs)' }}>
                      <Type className="w-4 h-4" />
                      <span>{t('conversations.stats.characters').replace('{count}', conversation.stats.total_characters.toLocaleString())}</span>
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
                    <span>{t('conversations.stats.createdAt').replace('{date}', formatDateOnly(conversation.created_at))}</span>
                  </div>
                  <div className="flex items-center" style={{ gap: 'var(--spacing-xs)' }}>
                    <Clock className="w-4 h-4" />
                    <span>{t('conversations.stats.updatedAt').replace('{time}', formatTime(conversation.updated_at))}</span>
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
                  title={t('conversations.hints.deleteConversation')}
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
                {isSelectionMode ? t('conversations.hints.clickToSelect') : t('conversations.hints.clickToEnter')} →
              </p>
            </div>
        </motion.div>
      ))}
    </div>
  );
}