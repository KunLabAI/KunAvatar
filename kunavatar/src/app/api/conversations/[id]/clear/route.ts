import { NextRequest, NextResponse } from 'next/server';
import { dbOperations, agentMessageOperations } from '../../../../../lib/database';
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

    // 根据对话类型清理相应的消息表
    let messagesCleared = 0;
    let agentMessagesCleared = 0;

    if (conversation.agent_id) {
      // 智能体对话：清理 agent_messages 表
      console.log(`🤖 检测到智能体对话，清理 agent_messages 表中的消息`);
      agentMessageOperations.deleteByConversationId(conversationId);
      agentMessagesCleared = 1; // 标记已清理智能体消息
    } else {
      // 普通模型对话：清理 messages 表
      console.log(`🔧 检测到模型对话，清理 messages 表中的消息`);
      dbOperations.deleteMessagesByConversationId(conversationId);
      messagesCleared = 1; // 标记已清理普通消息
    }

    // 为了确保完全清理，同时清理两个表（防止数据不一致）
    // 这样可以处理可能存在的历史数据问题
    if (!conversation.agent_id) {
      // 如果是普通对话，也检查并清理可能存在的智能体消息
      agentMessageOperations.deleteByConversationId(conversationId);
    } else {
      // 如果是智能体对话，也检查并清理可能存在的普通消息
      dbOperations.deleteMessagesByConversationId(conversationId);
    }

    // 注意：不删除记忆！记忆是Agent的长期记忆，应该保留
    // 记忆触发状态会在下次对话时自动重置
    
    // 更新对话的最后更新时间
    dbOperations.updateConversationTimestamp(conversationId);

    const conversationType = conversation.agent_id ? '智能体对话' : '模型对话';
    console.log(`🧹 清空对话 ${conversationId} (${conversationType}): 消息已清空，记忆已保留`);

    return NextResponse.json({
      success: true,
      message: '对话消息已清空',
      conversationType,
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