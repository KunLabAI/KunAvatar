import { NextRequest, NextResponse } from 'next/server';
import { dbOperations } from '../../../../../lib/database';
import { withAuth } from '../../../../../lib/middleware/auth';

/**
 * 记忆重置API
 * 重置对话的记忆状态，避免负数问题
 */
export const POST = withAuth(async (
  request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const userId = request.user!.id;
    const { id } = await params;
    const conversationId = id;

    if (!conversationId) {
      return NextResponse.json({ error: '无效的对话ID' }, { status: 400 });
    }

    // 检查对话是否存在且用户有权限
    const conversation = dbOperations.getConversationByIdAndUserId(conversationId, userId);
    if (!conversation) {
      return NextResponse.json({ error: '对话不存在或无权限访问' }, { status: 404 });
    }

    // 删除对话的所有记忆
    const deletedMemories = dbOperations.deleteMemoriesByConversation(conversationId);

    console.log(`🔄 重置对话 ${conversationId} 的记忆状态${deletedMemories ? '：记忆已清除' : '：无记忆需要清除'}`);

    return NextResponse.json({
      success: true,
      message: '记忆状态已重置',
      memoriesDeleted: deletedMemories,
      conversationId
    });

  } catch (error) {
    console.error('重置记忆状态失败:', error);
    return NextResponse.json(
      { error: '重置记忆状态失败', message: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
});

/**
 * 获取记忆重置预览
 */
export const GET = withAuth(async (
  request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const userId = request.user!.id;
    const { id } = await params;
    const conversationId = id;

    if (!conversationId) {
      return NextResponse.json({ error: '无效的对话ID' }, { status: 400 });
    }

    // 检查对话是否存在且用户有权限
    const conversation = dbOperations.getConversationByIdAndUserId(conversationId, userId);
    if (!conversation) {
      return NextResponse.json({ error: '对话不存在或无权限访问' }, { status: 404 });
    }

    // 获取对话的记忆
    const memories = dbOperations.getMemoriesByConversation(conversationId);

    return NextResponse.json({
      conversationId,
      currentMemories: memories.length,
      memoryDetails: memories.map(m => ({
        id: m.id,
        type: m.memory_type,
        range: m.source_message_range,
        importance: m.importance_score,
        created: m.created_at
      })),
      willDelete: memories.length > 0
    });

  } catch (error) {
    console.error('获取记忆重置预览失败:', error);
    return NextResponse.json(
      { error: '获取记忆重置预览失败', message: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
});