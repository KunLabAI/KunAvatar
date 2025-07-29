import { db } from './connection';
import { conversationOperations } from './conversations';
import type { Message, CreateMessageData } from './types';

// 智能体消息相关查询语句
export const agentMessageQueries = {
  // 创建新智能体消息
  create: db.prepare(`
    INSERT INTO agent_messages (
      conversation_id, role, content, agent_id, user_id, sequence_number, timestamp,
      total_duration, load_duration, prompt_eval_count, prompt_eval_duration,
      eval_count, eval_duration
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  // 获取对话的所有智能体消息（需要用户权限验证）
  getByConversationIdAndUserId: db.prepare(`
    SELECT * FROM agent_messages
    WHERE conversation_id = ? AND user_id = ?
    ORDER BY id ASC
  `),

  // 获取对话的所有智能体消息（内部使用，不需要用户权限验证）
  getByConversationId: db.prepare(`
    SELECT * FROM agent_messages
    WHERE conversation_id = ?
    ORDER BY id ASC
  `),

  // 删除对话的所有智能体消息
  deleteByConversationId: db.prepare(`
    DELETE FROM agent_messages WHERE conversation_id = ?
  `),

  // 删除单个智能体消息
  deleteById: db.prepare(`
    DELETE FROM agent_messages WHERE id = ?
  `),

  // 删除单个智能体消息（需要用户权限验证）
  deleteByIdAndUserId: db.prepare(`
    DELETE FROM agent_messages WHERE id = ? AND user_id = ?
  `),

  // 获取智能体消息的工具调用记录（需要用户权限验证）
  getToolCallsByConversationIdAndUserId: db.prepare(`
    SELECT
      id,
      conversation_id,
      agent_id,
      tool_name,
      tool_args,
      tool_result,
      tool_status,
      tool_execution_time,
      tool_error,
      created_at,
      timestamp
    FROM agent_messages
    WHERE conversation_id = ? AND user_id = ? AND tool_name IS NOT NULL AND tool_result IS NOT NULL
    ORDER BY id ASC
  `),

  // 获取对话的工具调用记录（内部使用）
  getToolCallsByConversationId: db.prepare(`
    SELECT
      id,
      conversation_id,
      agent_id,
      tool_name,
      tool_args,
      tool_result,
      tool_status,
      tool_execution_time,
      tool_error,
      created_at,
      timestamp
    FROM agent_messages
    WHERE conversation_id = ? AND tool_name IS NOT NULL AND tool_result IS NOT NULL
    ORDER BY id ASC
  `),

  // 创建工具调用消息
  createToolCall: db.prepare(`
    INSERT INTO agent_messages (
      conversation_id, role, content, agent_id, user_id, tool_name, tool_args,
      tool_result, tool_status, tool_execution_time, tool_error, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  // 更新工具调用结果
  updateToolCallResult: db.prepare(`
    UPDATE agent_messages
    SET tool_result = ?, tool_status = ?, tool_execution_time = ?, tool_error = ?
    WHERE id = ?
  `),

  // 获取最近的智能体消息数量
  getRecentCount: db.prepare(`
    SELECT COUNT(*) as count FROM agent_messages
    WHERE conversation_id = ? AND role IN ('user', 'assistant')
    ORDER BY id DESC
    LIMIT ?
  `),
};

// 智能体消息数据库操作类
export class AgentMessageOperations {
  // 创建新智能体消息
  create(data: CreateMessageData & { agent_id: number }): number {
    // 生成时间戳（毫秒级）
    const timestamp = Date.now();

    const result = agentMessageQueries.create.run(
      data.conversation_id,
      data.role,
      data.content,
      data.agent_id,
      data.user_id,
      data.sequence_number || 0,
      timestamp,
      data.total_duration || null,
      data.load_duration || null,
      data.prompt_eval_count || null,
      data.prompt_eval_duration || null,
      data.eval_count || null,
      data.eval_duration || null
    );

    // 更新对话的最后活动时间
    conversationOperations.updateTimestamp(data.conversation_id);

    return result.lastInsertRowid as number;
  }

  // 获取对话的所有智能体消息（需要用户权限验证）
  getByConversationIdAndUserId(conversationId: string, userId: string): Message[] {
    return agentMessageQueries.getByConversationIdAndUserId.all(conversationId, userId) as Message[];
  }

  // 获取对话的所有智能体消息（内部使用）
  getByConversationId(conversationId: string): Message[] {
    return agentMessageQueries.getByConversationId.all(conversationId) as Message[];
  }

  // 删除对话的所有智能体消息
  deleteByConversationId(conversationId: string): void {
    agentMessageQueries.deleteByConversationId.run(conversationId);
  }

  // 删除单个智能体消息
  deleteById(messageId: number): void {
    agentMessageQueries.deleteById.run(messageId);
  }

  // 删除单个智能体消息（需要用户权限验证）
  deleteByIdAndUserId(messageId: string, userId: string): boolean {
    const result = agentMessageQueries.deleteByIdAndUserId.run(messageId, userId);
    return result.changes > 0;
  }

  // 创建工具调用消息
  createToolCall(data: {
    conversation_id: string;
    user_id: string;
    agent_id: number;
    tool_name: string;
    tool_args?: string;
    tool_result?: string;
    tool_status?: string;
    tool_execution_time?: number;
    tool_error?: string;
  }): number {
    const timestamp = Date.now();
    
    const result = agentMessageQueries.createToolCall.run(
      data.conversation_id,
      'tool', // role - 统一使用 'tool'
      data.tool_result || '', // content
      data.agent_id,
      data.user_id,
      data.tool_name,
      data.tool_args || null,
      data.tool_result || null,
      data.tool_status || 'executing',
      data.tool_execution_time || null,
      data.tool_error || null,
      timestamp
    );

    return result.lastInsertRowid as number;
  }

  // 更新工具调用结果
  updateToolCallResult(messageId: number, result: string, status: string, executionTime?: number, error?: string): void {
    agentMessageQueries.updateToolCallResult.run(result, status, executionTime || null, error || null, messageId);
  }

  // 获取对话的工具调用记录（需要用户权限验证）
  getToolCallsByConversationIdAndUserId(conversationId: string, userId: string): any[] {
    return agentMessageQueries.getToolCallsByConversationIdAndUserId.all(conversationId, userId);
  }

  // 获取对话的工具调用记录（内部使用）
  getToolCallsByConversationId(conversationId: string): any[] {
    return agentMessageQueries.getToolCallsByConversationId.all(conversationId);
  }

  // 获取最近的智能体消息数量
  getRecentCount(conversationId: string, limit: number = 50): number {
    const result = agentMessageQueries.getRecentCount.get(conversationId, limit) as { count: number };
    return result.count;
  }

  /**
   * 更新对话的最后活动时间
   */
  static updateConversationTimestamp(conversationId: string): void {
    try {
      conversationOperations.updateTimestamp(conversationId);
    } catch (error) {
      console.error('更新对话时间戳失败:', error);
      // 不抛出错误，因为这不是关键操作
    }
  }
}

// 导出智能体消息操作实例
export const agentMessageOperations = new AgentMessageOperations();