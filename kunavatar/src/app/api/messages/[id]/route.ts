import { NextRequest, NextResponse } from 'next/server';
import { dbOperations, agentMessageOperations } from '../../../../lib/database';
import { withAuth } from '../../../../lib/middleware/auth';

// 删除单个消息
export const DELETE = withAuth(async (request, { params }) => {
  try {
    const userId = request.user!.id;
    const { id: messageId } = await params;

    if (!messageId) {
      return NextResponse.json(
        { success: false, error: '消息ID不能为空' },
        { status: 400 }
      );
    }

    // 检查消息ID格式，如果是前端生成的临时ID（msg_开头），则返回错误
    if (messageId.startsWith('msg_')) {
      return NextResponse.json(
        { success: false, error: '无法删除临时消息，请刷新页面后重试' },
        { status: 400 }
      );
    }

    // 将字符串ID转换为数字ID
    const numericMessageId = parseInt(messageId, 10);
    if (isNaN(numericMessageId)) {
      return NextResponse.json(
        { success: false, error: '无效的消息ID格式' },
        { status: 400 }
      );
    }

    // 尝试从两个表中删除消息（只能删除自己的消息）
    // 先尝试从普通消息表删除
    let deleted = dbOperations.deleteMessageByIdAndUserId(numericMessageId.toString(), userId);
    let messageType = 'normal';

    // 如果普通消息表中没有找到，尝试从智能体消息表删除
    if (!deleted) {
      deleted = agentMessageOperations.deleteByIdAndUserId(numericMessageId.toString(), userId);
      messageType = 'agent';
    }

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: '消息不存在或无权限删除' },
        { status: 404 }
      );
    }

    console.log(`成功删除${messageType === 'agent' ? '智能体' : '普通'}消息，ID: ${messageId}`);

    return NextResponse.json({
      success: true,
      message: '消息删除成功',
      messageType
    });

  } catch (error) {
    console.error('删除消息失败:', error);
    return NextResponse.json(
      { success: false, error: '删除消息失败' },
      { status: 500 }
    );
  }
});