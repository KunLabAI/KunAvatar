import { NextRequest, NextResponse } from 'next/server';
import { dbOperations } from '../../../../../lib/database';
import { withAuth } from '../../../../../lib/middleware/auth';

// 清空对话的所有消息
export const POST = withAuth(async (
  request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const userId = request.user!.id;
    const { id } = await params;
    const conversationId = id;

    if (!conversationId) {
      return NextResponse.json(
        { error: '无效的对话ID' },
        { status: 400 }
      );
    }

    // 检查对话是否存在且用户有权限
    const conversation = dbOperations.getConversationByIdAndUserId(conversationId, userId);
    if (!conversation) {
      return NextResponse.json(
        { error: '对话不存在或无权限访问' },
        { status: 404 }
      );
    }

    // 删除对话的所有消息
    dbOperations.deleteMessagesByConversationId(conversationId);

    // 注意：不删除记忆！记忆是Agent的长期记忆，应该保留
    // 记忆触发状态会在下次对话时自动重置
    
    // 更新对话的最后更新时间
    dbOperations.updateConversationTimestamp(conversationId);

    console.log(`🧹 清空对话 ${conversationId}: 消息已清空，记忆已保留`);

    return NextResponse.json({
      success: true,
      message: '对话消息已清空',
      memoriesPreserved: true
    });
  } catch (error) {
    console.error('清空对话消息失败:', error);

    return NextResponse.json(
      {
        error: '清空对话消息失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
});