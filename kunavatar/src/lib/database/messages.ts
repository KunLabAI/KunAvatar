import { db } from './connection';
import { conversationOperations } from './conversations';
import type { Message, CreateMessageData } from './types';

// 消息相关查询语句
export const messageQueries = {
  // 创建新消息
  create: db.prepare(`
    INSERT INTO messages (
      conversation_id, role, content, model, user_id, agent_id, sequence_number, timestamp,
      total_duration, load_duration, prompt_eval_count, prompt_eval_duration,
      eval_count, eval_duration
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  // 获取对话的所有消息（需要用户权限验证）
  getByConversationIdAndUserId: db.prepare(`
    SELECT * FROM messages
    WHERE conversation_id = ? AND user_id = ?
    ORDER BY timestamp ASC, id ASC
  `),

  // 获取对话的所有消息（内部使用，不检查用户权限）
  getByConversationId: db.prepare(`
    SELECT * FROM messages
    WHERE conversation_id = ?
    ORDER BY timestamp ASC, id ASC
  `),

  // 删除对话的所有消息（内部使用）
  deleteByConversationId: db.prepare(`
    DELETE FROM messages WHERE conversation_id = ?
  `),

  // 获取对话的工具调用记录（需要用户权限验证）
  getToolCallsByConversationIdAndUserId: db.prepare(`
    SELECT
      id,
      conversation_id,
      tool_name,
      tool_args,
      tool_result,
      tool_status,
      tool_execution_time,
      tool_error,
      created_at,
      timestamp
    FROM messages
    WHERE conversation_id = ? AND user_id = ? AND tool_name IS NOT NULL
    ORDER BY id ASC
  `),

  // 获取对话的工具调用记录（内部使用）
  getToolCallsByConversationId: db.prepare(`
    SELECT
      id,
      conversation_id,
      tool_name,
      tool_args,
      tool_result,
      tool_status,
      tool_execution_time,
      tool_error,
      created_at,
      timestamp
    FROM messages
    WHERE conversation_id = ? AND tool_name IS NOT NULL
    ORDER BY id ASC
  `),

  // 获取对话中最后使用的模型（内部使用）
  getLastModelByConversationId: db.prepare(`
    SELECT model FROM messages
    WHERE conversation_id = ? AND model IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1
  `),

  // 获取对话中下一个可用的序列号（内部使用）
  getNextSequenceNumber: db.prepare(`
    SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_sequence
    FROM messages
    WHERE conversation_id = ?
  `),
};

// 消息数据库操作函数
export const messageOperations = {
  // 创建新消息
  create(data: CreateMessageData): number {
    // 简化：不再使用sequence_number，只依赖自增ID
    // 生成时间戳（毫秒级）
    const timestamp = Date.now();

    const result = messageQueries.create.run(
      data.conversation_id,
      data.role,
      data.content,
      data.model || null,
      data.user_id,
      data.agent_id || null,
      0, // sequence_number 设为0，不再使用
      timestamp,
      data.total_duration || null,
      data.load_duration || null,
      data.prompt_eval_count || null,
      data.prompt_eval_duration || null,
      data.eval_count || null,
      data.eval_duration || null
    );
    // 更新对话的时间戳
    conversationOperations.updateTimestamp(data.conversation_id);
    return result.lastInsertRowid as number;
  },

  // 获取对话的所有消息（需要用户权限验证）
  getByConversationIdAndUserId(conversationId: string, userId: string): Message[] {
    return messageQueries.getByConversationIdAndUserId.all(conversationId, userId) as Message[];
  },

  // 获取对话的所有消息（内部使用，不检查用户权限）
  getByConversationId(conversationId: string): Message[] {
    return messageQueries.getByConversationId.all(conversationId) as Message[];
  },

  // 删除对话的所有消息
  deleteByConversationId(conversationId: string): void {
    messageQueries.deleteByConversationId.run(conversationId);
  },

  // 获取对话的工具调用记录（需要用户权限验证）
  getToolCallsByConversationIdAndUserId(conversationId: string, userId: string): any[] {
    return messageQueries.getToolCallsByConversationIdAndUserId.all(conversationId, userId);
  },

  // 获取对话的工具调用记录（内部使用）
  getToolCallsByConversationId(conversationId: string): any[] {
    return messageQueries.getToolCallsByConversationId.all(conversationId);
  },

  // 获取对话中最后使用的模型
  getLastModelByConversationId(conversationId: string): string | null {
    const result = messageQueries.getLastModelByConversationId.get(conversationId) as { model: string } | undefined;
    return result?.model || null;
  },

  // 获取对话中下一个可用的序列号（已废弃，保留兼容性）
  getNextSequenceNumber(conversationId: string): number {
    const result = messageQueries.getNextSequenceNumber.get(conversationId) as { next_sequence: number } | undefined;
    return result?.next_sequence || 1;
  },

  // 创建工具调用消息
  createToolCall(data: {
    conversation_id: string;
    user_id: string;
    agent_id?: number;
    tool_name: string;
    tool_args: any;
    tool_status: 'executing' | 'completed' | 'error';
    tool_result?: any;
    tool_execution_time?: number;
    tool_error?: string;
  }): number {
    const timestamp = Date.now();

    const result = messageQueries.create.run(
      data.conversation_id,
      'tool_call', // 使用新的role类型
      `工具调用: ${data.tool_name}`, // 基本内容描述
      null, // model
      data.user_id,
      data.agent_id || null, // agent_id
      0, // sequence_number
      timestamp,
      null, null, null, null, null, null // 统计信息字段
    );

    // 更新工具相关字段
    if (result.lastInsertRowid) {
      const updateToolFields = db.prepare(`
        UPDATE messages SET
          tool_name = ?,
          tool_args = ?,
          tool_result = ?,
          tool_status = ?,
          tool_execution_time = ?,
          tool_error = ?
        WHERE id = ?
      `);

      updateToolFields.run(
        data.tool_name,
        JSON.stringify(data.tool_args),
        data.tool_result ? JSON.stringify(data.tool_result) : null,
        data.tool_status,
        data.tool_execution_time || null,
        data.tool_error || null,
        result.lastInsertRowid
      );
    }

    conversationOperations.updateTimestamp(data.conversation_id);
    return result.lastInsertRowid as number;
  },
};