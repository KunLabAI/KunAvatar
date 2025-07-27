import { db } from './connection';
import type { Conversation, CreateConversationData } from './types';
import { randomUUID } from 'crypto';

// 对话相关查询语句
export const conversationQueries = {
  // 创建新对话
  create: db.prepare(`
    INSERT INTO conversations (id, title, model, user_id, agent_id)
    VALUES (?, ?, ?, ?, ?)
  `),
  
  // 创建新对话（不包含agent_id）
  createWithoutAgent: db.prepare(`
    INSERT INTO conversations (id, title, model, user_id)
    VALUES (?, ?, ?, ?)
  `),

  // 获取用户的所有对话
  getAllByUserId: db.prepare(`
    SELECT * FROM conversations
    WHERE user_id = ?
    ORDER BY updated_at DESC
  `),

  // 根据ID和用户ID获取对话
  getByIdAndUserId: db.prepare(`
    SELECT * FROM conversations
    WHERE id = ? AND user_id = ?
  `),

  // 根据ID获取对话（不检查用户权限，仅用于内部操作）
  getById: db.prepare(`
    SELECT * FROM conversations
    WHERE id = ?
  `),

  // 更新对话标题（需要用户权限验证）
  updateTitleByUserAndId: db.prepare(`
    UPDATE conversations
    SET title = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `),

  // 更新对话标题（内部使用，不验证用户权限）
  updateTitleInternal: db.prepare(`
    UPDATE conversations
    SET title = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  // 更新对话的最后更新时间（内部使用，不需要用户验证）
  updateTimestamp: db.prepare(`
    UPDATE conversations
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  // 更新对话模型（需要用户权限验证）
  updateModel: db.prepare(`
    UPDATE conversations
    SET model = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `),

  // 更新对话智能体（需要用户权限验证）
  updateAgent: db.prepare(`
    UPDATE conversations
    SET agent_id = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `),

  // 删除对话（需要用户权限验证）
  deleteByUserAndId: db.prepare(`
    DELETE FROM conversations
    WHERE id = ? AND user_id = ?
  `),

  // 删除对话（内部使用，不需要用户验证）
  delete: db.prepare(`
    DELETE FROM conversations
    WHERE id = ?
  `),

  // 获取对话统计信息（普通消息）
  getStats: db.prepare(`
    SELECT 
      conversation_id,
      COUNT(*) as message_count,
      SUM(LENGTH(content)) as total_characters,
      SUM(COALESCE(prompt_eval_count, 0)) as total_prompt_tokens,
      SUM(COALESCE(eval_count, 0)) as total_completion_tokens,
      SUM(COALESCE(prompt_eval_count, 0) + COALESCE(eval_count, 0)) as total_tokens
    FROM messages 
    WHERE conversation_id = ?
    GROUP BY conversation_id
  `),

  // 获取对话统计信息（智能体消息）
  getAgentStats: db.prepare(`
    SELECT 
      conversation_id,
      COUNT(*) as message_count,
      SUM(LENGTH(content)) as total_characters,
      SUM(COALESCE(prompt_eval_count, 0)) as total_prompt_tokens,
      SUM(COALESCE(eval_count, 0)) as total_completion_tokens,
      SUM(COALESCE(prompt_eval_count, 0) + COALESCE(eval_count, 0)) as total_tokens
    FROM agent_messages 
    WHERE conversation_id = ?
    GROUP BY conversation_id
  `),
};

// 对话数据库操作函数
export const conversationOperations = {
  // 创建新对话
  create(data: CreateConversationData): string {
    const id = data.id || randomUUID();
    
    if (data.agent_id === null || data.agent_id === undefined) {
      // 不包含agent_id的插入
      conversationQueries.createWithoutAgent.run(id, data.title, data.model || null, data.user_id);
    } else {
      // 包含agent_id的插入
      conversationQueries.create.run(id, data.title, data.model || null, data.user_id, data.agent_id);
    }
    
    return id;
  },

  // 获取用户的所有对话
  getAllByUserId(userId: string): Conversation[] {
    return conversationQueries.getAllByUserId.all(userId) as Conversation[];
  },

  // 根据ID和用户ID获取对话（用于权限验证）
  getByIdAndUserId(id: string, userId: string): Conversation | undefined {
    return conversationQueries.getByIdAndUserId.get(id, userId) as Conversation | undefined;
  },

  // 根据ID获取对话（内部使用，不检查用户权限）
  getById(id: string): Conversation | undefined {
    return conversationQueries.getById.get(id) as Conversation | undefined;
  },

  // 更新对话标题（需要用户权限验证）
  updateTitleByUserAndId(id: string, userId: string, title: string): boolean {
    const result = conversationQueries.updateTitleByUserAndId.run(title, id, userId);
    return result.changes > 0;
  },

  // 更新对话标题（内部使用，不验证用户权限）
  updateTitleInternal(id: string, title: string): boolean {
    const result = conversationQueries.updateTitleInternal.run(title, id);
    return result.changes > 0;
  },

  // 更新对话时间戳（内部使用）
  updateTimestamp(id: string): void {
    conversationQueries.updateTimestamp.run(id);
  },

  // 删除对话（需要用户权限验证）
  deleteByUserAndId(id: string, userId: string): boolean {
    const result = conversationQueries.deleteByUserAndId.run(id, userId);
    return result.changes > 0;
  },

  // 删除对话（内部使用，不检查用户权限）
  delete(id: string): void {
    conversationQueries.delete.run(id);
  },

  // 获取对话统计信息
  getStats(id: string): {
    message_count: number;
    total_characters: number;
    total_prompt_tokens: number;
    total_completion_tokens: number;
    total_tokens: number;
  } | null {
    // 先获取对话信息，检查是否有agent_id
    const conversation = conversationQueries.getById.get(id) as any;
    
    if (!conversation) {
      return {
        message_count: 0,
        total_characters: 0,
        total_prompt_tokens: 0,
        total_completion_tokens: 0,
        total_tokens: 0
      };
    }

    // 根据是否有agent_id来决定查询哪个表
    const result = conversation.agent_id 
      ? conversationQueries.getAgentStats.get(id) as any
      : conversationQueries.getStats.get(id) as any;
      
    return result || {
      message_count: 0,
      total_characters: 0,
      total_prompt_tokens: 0,
      total_completion_tokens: 0,
      total_tokens: 0
    };
  },

  // 更新对话模型（需要用户权限验证）
  updateConversationModelByUserAndId(id: string, userId: string, model: string | null): boolean {
    const result = conversationQueries.updateModel.run(model, id, userId);
    return result.changes > 0;
  },

  // 更新对话智能体（需要用户权限验证）
  updateConversationAgentByUserAndId(id: string, userId: string, agentId: number | null): boolean {
    const result = conversationQueries.updateAgent.run(agentId, id, userId);
    return result.changes > 0;
  },
};