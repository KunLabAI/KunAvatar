import { NextResponse } from 'next/server';
import { memoryOperations } from '@/lib/database/memories';
import { agentOperations } from '@/lib/database/agents';

// GET /api/agents/[id]/memories - 获取指定Agent的所有记忆
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agentId = parseInt(id);

    if (!agentId || isNaN(agentId)) {
      return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 });
    }

    // 验证Agent是否存在
    const agent = agentOperations.getById(agentId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // 获取Agent的所有记忆（跨对话）
    const memories = memoryOperations.getMemoriesByAgent(agentId);
    console.log(`🧠 获取Agent ${agentId} 的所有记忆：${memories.length} 条`);

    // 解析记忆内容（JSON格式）
    const parsedMemories = memories.map(memory => {
      try {
        const content = JSON.parse(memory.content);
        return {
          ...memory,
          parsedContent: content,
          source: `对话 ${memory.conversation_id}`
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
          source: `对话 ${memory.conversation_id}`
        };
      }
    });

    // 获取Agent记忆统计
    const agentStats = memoryOperations.getAgentMemoryStats(agentId);
    const stats = {
      total_memories: agentStats.totalMemories,
      total_tokens_saved: agentStats.totalTokensSaved,
      avg_importance: agentStats.avgImportanceScore,
      conversation_count: agentStats.conversationCount
    };

    return NextResponse.json({
      success: true,
      memories: parsedMemories,
      stats,
      agentId,
      agentName: agent.name,
      memoryType: 'agent'
    });

  } catch (error) {
    console.error('Failed to get agent memories:', error);
    return NextResponse.json({ error: 'Failed to get agent memories' }, { status: 500 });
  }
}