import { NextResponse } from 'next/server';
import { memoryOperations } from '@/lib/database/memories';
import { conversationOperations } from '@/lib/database/conversations';
import { safeGetParams } from '@/lib/middleware/auth';

// GET /api/conversations/[id]/memories - 获取对话关联Agent的记忆列表
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 安全地处理 params
    const paramsResult = await safeGetParams(params);
    if (!paramsResult.success || !paramsResult.data?.id) {
      return NextResponse.json(
        { error: paramsResult.error || '无效的对话ID' },
        { status: 400 }
      );
    }
    
    const conversationId = paramsResult.data.id;

    if (!conversationId || conversationId.trim() === '') {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
    }

    // 获取对话信息，包括关联的Agent ID
    const conversation = conversationOperations.getById(conversationId);
    
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    let memories = [];
    let agentId = null;

    // 检查对话是否关联了Agent
    // TODO: 确认Conversation类型中Agent字段的正确名称
    const conversationAgentId = (conversation as any).agentId || (conversation as any).agent_id;
    if (conversationAgentId) {
      // 获取Agent的所有记忆（跨对话）
      agentId = conversationAgentId;
      memories = memoryOperations.getMemoriesByAgent(agentId);
      console.log(`🧠 获取Agent ${agentId} 的记忆：${memories.length} 条`);
    } else {
      // 回退到对话级别记忆
      memories = memoryOperations.getMemoriesByConversation(conversationId);
      console.log(`🧠 获取对话 ${conversationId} 的记忆：${memories.length} 条`);
    }

    // 解析记忆内容（JSON格式）
    const parsedMemories = memories.map(memory => {
      try {
        const content = JSON.parse(memory.content);
        return {
          ...memory,
          parsedContent: content,
          // 标识记忆来源
          source: memory.conversation_id !== conversationId ? 
            `来自对话 ${memory.conversation_id}` : '当前对话'
        };
      } catch (error) {
        // 如果解析失败，保留原始内容
        return {
          ...memory,
          parsedContent: {
            summary: memory.content,
            importantTopics: [],
            keyFacts: [],
            preferences: [],
            context: memory.content
          },
          source: memory.conversation_id !== conversationId ? 
            `来自对话 ${memory.conversation_id}` : '当前对话'
        };
      }
    });

    // 获取记忆统计
    let stats;
    if (agentId) {
      // 使用Agent的记忆统计
      const agentStats = memoryOperations.getAgentMemoryStats(agentId);
      stats = {
        total_memories: agentStats.totalMemories,
        total_tokens_saved: agentStats.totalTokensSaved,
        avg_importance: agentStats.avgImportanceScore,
        conversation_count: agentStats.conversationCount
      };
    } else {
      // 使用对话级别统计
      const conversationStats = memoryOperations.getMemoryStats(conversationId);
      stats = conversationStats.length > 0 ? conversationStats[0] : {
        total_memories: memories.length,
        total_tokens_saved: memories.reduce((sum, m) => sum + m.tokens_saved, 0),
        avg_importance: memories.length > 0 ? memories.reduce((sum, m) => sum + m.importance_score, 0) / memories.length : 0
      };
    }

    return NextResponse.json({
      success: true,
      memories: parsedMemories,
      stats,
      agentId,
      memoryType: agentId ? 'agent' : 'conversation'
    });

  } catch (error) {
    console.error('Failed to get conversation memories:', error);
    return NextResponse.json({ error: 'Failed to get memories' }, { status: 500 });
  }
}