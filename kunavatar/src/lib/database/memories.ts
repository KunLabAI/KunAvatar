import { db } from './connection';
import type { Agent } from './agents';

// 记忆相关类型定义
export interface ConversationMemory {
  id: number;
  conversation_id: string;
  agent_id: number | null;
  memory_type: 'summary' | 'context' | 'important';
  content: string; // JSON格式的记忆内容
  source_message_range: string | null;
  importance_score: number;
  tokens_saved: number;
  created_at: string;
  expires_at: string | null;
}

export interface CreateMemoryData {
  conversation_id: string;
  agent_id?: number | null;
  memory_type?: 'summary' | 'context' | 'important';
  content: string;
  source_message_range?: string | null;
  importance_score?: number;
  tokens_saved?: number;
  expires_at?: string | null;
}

// 记忆查询语句
export const memoryQueries = {
  // 对话记忆操作
  createMemory: db.prepare(`
    INSERT INTO conversation_memories (
      conversation_id, agent_id, memory_type, content, 
      source_message_range, importance_score, tokens_saved, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),

  getMemoriesByConversation: db.prepare(`
    SELECT * FROM conversation_memories
    WHERE conversation_id = ?
    ORDER BY importance_score DESC, created_at DESC
  `),

  getMemoriesByAgent: db.prepare(`
    SELECT * FROM conversation_memories
    WHERE agent_id = ?
    ORDER BY importance_score DESC, created_at DESC
  `),

  getActiveMemories: db.prepare(`
    SELECT * FROM conversation_memories
    WHERE conversation_id = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
    ORDER BY importance_score DESC, created_at DESC
  `),

  getMemoryById: db.prepare(`
    SELECT * FROM conversation_memories WHERE id = ?
  `),

  updateMemory: db.prepare(`
    UPDATE conversation_memories 
    SET content = ?, importance_score = ?, memory_type = ?
    WHERE id = ?
  `),

  deleteMemory: db.prepare(`
    DELETE FROM conversation_memories WHERE id = ?
  `),

  deleteMemoriesByConversation: db.prepare(`
    DELETE FROM conversation_memories WHERE conversation_id = ?
  `),

  cleanupExpiredMemories: db.prepare(`
    DELETE FROM conversation_memories 
    WHERE expires_at IS NOT NULL AND expires_at <= datetime('now')
  `),



  // 统计查询
  getMemoryStats: db.prepare(`
    SELECT 
      COUNT(*) as total_memories,
      SUM(tokens_saved) as total_tokens_saved,
      AVG(importance_score) as avg_importance,
      memory_type,
      COUNT(*) as type_count
    FROM conversation_memories 
    WHERE conversation_id = ?
    GROUP BY memory_type
  `),
};

// 记忆数据库操作函数
export const memoryOperations = {
  // 创建记忆
  createMemory(data: CreateMemoryData): number {
    const result = memoryQueries.createMemory.run(
      data.conversation_id,
      data.agent_id || null,
      data.memory_type || 'summary',
      data.content,
      data.source_message_range || null,
      data.importance_score || 1.0,
      data.tokens_saved || 0,
      data.expires_at || null
    );
    return result.lastInsertRowid as number;
  },

  // 获取对话的所有记忆
  getMemoriesByConversation(conversationId: string): ConversationMemory[] {
    return memoryQueries.getMemoriesByConversation.all(conversationId) as ConversationMemory[];
  },

  // 获取智能体的所有记忆
  getMemoriesByAgent(agentId: number): ConversationMemory[] {
    return memoryQueries.getMemoriesByAgent.all(agentId) as ConversationMemory[];
  },

  // 获取活跃的记忆（未过期）
  getActiveMemories(conversationId: string): ConversationMemory[] {
    return memoryQueries.getActiveMemories.all(conversationId) as ConversationMemory[];
  },

  // 获取单个记忆
  getMemoryById(memoryId: number): ConversationMemory | null {
    const result = memoryQueries.getMemoryById.get(memoryId) as ConversationMemory | undefined;
    return result || null;
  },

  // 更新记忆
  updateMemory(memoryId: number, content: string, importanceScore?: number, memoryType?: string): boolean {
    const result = memoryQueries.updateMemory.run(
      content,
      importanceScore || 1.0,
      memoryType || 'summary',
      memoryId
    );
    return result.changes > 0;
  },

  // 删除记忆
  deleteMemory(memoryId: number): boolean {
    const result = memoryQueries.deleteMemory.run(memoryId);
    return result.changes > 0;
  },

  // 删除对话的所有记忆
  deleteMemoriesByConversation(conversationId: string): boolean {
    const result = memoryQueries.deleteMemoriesByConversation.run(conversationId);
    return result.changes > 0;
  },

  // 清理过期记忆
  cleanupExpiredMemories(): number {
    const result = memoryQueries.cleanupExpiredMemories.run();
    return result.changes;
  },



  // 获取记忆统计信息
  getMemoryStats(conversationId: string): Array<{
    total_memories: number;
    total_tokens_saved: number;
    avg_importance: number;
    memory_type: string;
    type_count: number;
  }> {
    return memoryQueries.getMemoryStats.all(conversationId) as any[];
  },

  // 检查是否需要触发记忆总结（使用全局设置的轮数）
  // 修复：轮数概念 - 1轮 = 1次用户提问 + 1次AI回答 = 2条消息
  shouldTriggerMemory(conversationId: string, agentId: number | null): boolean {
    if (!agentId) return false;

    // 获取全局记忆设置
    const { userSettingOperations } = require('./user-settings');
    // 获取第一个用户的记忆设置作为全局设置（临时方案）
    const users = require('./users').userOperations.getAll();
    const firstUserId = users.length > 0 ? users[0].id : null;
    if (!firstUserId) {
      return false; // 没有用户，不触发记忆
    }
    const settings = userSettingOperations.getByUserAndCategory(firstUserId, 'memory');
    const settingsMap = new Map(settings.map((s: any) => [s.key, s.value]));
    
    const memoryEnabled = settingsMap.get('memory_enabled') === '1';
    if (!memoryEnabled) {
      return false; // 全局记忆关闭
    }

    // 检查智能体设置
    const { agentOperations } = require('./agents');
    const agent = agentOperations.getById(agentId);
    if (!agent || !agent.memory_enabled) {
      return false; // 智能体未启用记忆
    }

    // 使用全局设置的触发轮数，并转换为消息数量
    const triggerRounds = parseInt(String(settingsMap.get('memory_trigger_rounds') || '20'), 10);
    const triggerMessagesCount = triggerRounds * 2; // 修复：1轮 = 2条消息
    
    // 根据对话类型查询不同的消息表
    const { conversationOperations } = require('./conversations');
    const conversation = conversationOperations.getById(conversationId);
    if (!conversation) {
      console.log(`🧠 对话不存在: ${conversationId}`);
      return false;
    }

    let messageCount = 0;
    if (conversation.agent_id) {
      // 智能体对话：从 agent_messages 表查询
      const agentMessageQueries = db.prepare(`
        SELECT COUNT(*) as count FROM agent_messages
        WHERE conversation_id = ? AND role IN ('user', 'assistant')
      `);
      const result = agentMessageQueries.get(conversationId) as { count: number };
      messageCount = result.count;
      console.log(`🤖 记忆系统数据库层检测到智能体对话，从 agent_messages 表查询消息数量: ${messageCount}`);
    } else {
      // 模型对话：从 messages 表查询
      const messageQueries = db.prepare(`
        SELECT COUNT(*) as count FROM messages
        WHERE conversation_id = ? AND role IN ('user', 'assistant')
      `);
      const result = messageQueries.get(conversationId) as { count: number };
      messageCount = result.count;
      console.log(`🔧 记忆系统数据库层检测到模型对话，从 messages 表查询消息数量: ${messageCount}`);
    }

    // 检查已有记忆，避免重复触发（确保按时间倒序获取最新记忆）
    const existingMemories = this.getMemoriesByConversation(conversationId);
    const lastMemoryMessageCount = existingMemories.length > 0 ?
      parseInt(existingMemories[0].source_message_range?.split('-')[1] || '0') : 0;

    const currentMessageCount = messageCount;
    const newMessages = Math.max(0, currentMessageCount - lastMemoryMessageCount); // 修复：确保不为负数

    console.log(`🧠 数据库层记忆触发检查：对话 ${conversationId}, Agent ${agentId}`);
    console.log(`   - 触发轮数设置: ${triggerRounds} 轮`);
    console.log(`   - 触发消息数量: ${triggerMessagesCount} 条`);
    console.log(`   - 当前消息总数: ${currentMessageCount} 条`);
    console.log(`   - 上次记忆消息数: ${lastMemoryMessageCount} 条`);
    console.log(`   - 当前新消息数: ${newMessages} 条`);
    console.log(`   - 是否触发: ${newMessages >= triggerMessagesCount}`);

    // 边界情况：如果对话被清空或记忆状态异常，重置触发条件
    if (currentMessageCount === 0 || newMessages < 0) {
      console.log(`🧠 检测到边界情况：对话消息数 ${currentMessageCount}，新消息数 ${newMessages}，不触发记忆`);
      return false;
    }

    return newMessages >= triggerMessagesCount; // 使用修复后的触发阈值
  },

  // 创建或更新记忆设置
  createOrUpdateMemorySettings(conversationId: string, settings: any): boolean {
    // 简化实现，暂时返回true
    return true;
  },

  // 获取记忆设置
  getMemorySettings(conversationId: string): any {
    // 获取全局记忆设置
    const { userSettingOperations } = require('./user-settings');
    // 获取第一个用户的记忆设置作为全局设置（临时方案）
    const users = require('./users').userOperations.getAll();
    const firstUserId = users.length > 0 ? users[0].id : null;
    if (!firstUserId) {
      return {
        memoryEnabled: false,
        memoryModel: 'qwen2.5:3b',
        memoryTriggerRounds: 20,
        memoryTriggerTokens: 4000,
        memorySystemPrompt: '请总结对话内容',
        summarizeStyle: 'detailed',
        maxMemoryEntries: 10
      };
    }
    const settings = userSettingOperations.getByUserAndCategory(firstUserId, 'memory');
    const settingsMap = new Map(settings.map((s: any) => [s.key, s.value]));
    
    return {
      memoryEnabled: settingsMap.get('memory_enabled') === '1',
      memoryModel: String(settingsMap.get('memory_model') || 'qwen2.5:3b'),
      memoryTriggerRounds: parseInt(String(settingsMap.get('memory_trigger_rounds') || '20'), 10),
      memoryTriggerTokens: 4000, // 暂时保留这个字段
      memorySystemPrompt: String(settingsMap.get('memory_system_prompt') || '请总结对话内容'),
      summarizeStyle: String(settingsMap.get('summary_style') || 'detailed'),
      maxMemoryEntries: parseInt(String(settingsMap.get('max_memory_entries') || '10'), 10)
    };
  },

  // 获取带默认值的记忆设置
  getMemorySettingsWithDefaults(conversationId: string): any {
    return this.getMemorySettings(conversationId);
  },

  // 更新记忆设置
  updateMemorySettings(conversationId: string, settings: any): boolean {
    // 简化实现，暂时返回true
    return true;
  },

  // 删除记忆设置
  deleteMemorySettings(conversationId: string): boolean {
    // 简化实现，暂时返回true
    return true;
  },

  // 清理Agent的旧记忆（保持在最大数量限制内）
  cleanupAgentMemories(agentId: number, maxEntries: number = 20): number {
    try {
      // 获取Agent的所有记忆，按创建时间排序
      const allMemories = this.getMemoriesByAgent(agentId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      if (allMemories.length <= maxEntries) {
        return 0; // 无需清理
      }

      // 删除超出限制的旧记忆
      const memoriesToDelete = allMemories.slice(maxEntries);
      let deletedCount = 0;

      for (const memory of memoriesToDelete) {
        if (this.deleteMemory(memory.id)) {
          deletedCount++;
        }
      }

      console.log(`🧹 清理Agent ${agentId} 的记忆：删除 ${deletedCount} 条旧记忆，保留 ${maxEntries} 条最新记忆`);
      return deletedCount;

    } catch (error) {
      console.error(`清理Agent ${agentId} 记忆失败:`, error);
      return 0;
    }
  },

  // 获取Agent的记忆统计信息
  getAgentMemoryStats(agentId: number): {
    totalMemories: number;
    totalTokensSaved: number;
    conversationCount: number;
    avgImportanceScore: number;
  } {
    try {
      const memories = this.getMemoriesByAgent(agentId);
      const conversationIds = new Set(memories.map(m => m.conversation_id));
      
      return {
        totalMemories: memories.length,
        totalTokensSaved: memories.reduce((sum, m) => sum + (m.tokens_saved || 0), 0),
        conversationCount: conversationIds.size,
        avgImportanceScore: memories.length > 0 
          ? memories.reduce((sum, m) => sum + m.importance_score, 0) / memories.length 
          : 0
      };
    } catch (error) {
      console.error(`获取Agent ${agentId} 记忆统计失败:`, error);
      return { totalMemories: 0, totalTokensSaved: 0, conversationCount: 0, avgImportanceScore: 0 };
    }
  },
};