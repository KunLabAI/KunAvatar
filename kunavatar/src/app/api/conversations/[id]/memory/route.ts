import { NextResponse } from 'next/server';
import { dbOperations } from '@/lib/database';

// GET /api/conversations/[id]/memory - 获取对话的记忆
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversationId = id;

    if (!conversationId) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
    }

    // 获取对话的所有记忆
    const memories = dbOperations.getMemoriesByConversation(conversationId);

    // 处理记忆内容，解析JSON格式
    const processedMemories = memories.map(memory => {
      let parsedContent;
      try {
        parsedContent = JSON.parse(memory.content);
      } catch {
        parsedContent = { summary: memory.content };
      }

      return {
        ...memory,
        parsedContent
      };
    });

    return NextResponse.json({
      success: true,
      memories: processedMemories
    });

  } catch (error) {
    console.error('Failed to get conversation memories:', error);
    return NextResponse.json({ error: 'Failed to get memories' }, { status: 500 });
  }
}