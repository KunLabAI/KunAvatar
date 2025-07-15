import { NextRequest, NextResponse } from 'next/server';
import { dbOperations } from '../../../../lib/database';
import { withAuth } from '../../../../lib/middleware/auth';

// 获取单个对话及其消息
export const GET = withAuth(async (
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

    // 获取对话信息（验证用户权限）
    const conversation = dbOperations.getConversationByIdAndUserId(conversationId, userId);
    if (!conversation) {
      return NextResponse.json(
        { error: '对话不存在或无权限访问' },
        { status: 404 }
      );
    }

    // 获取对话的所有消息（验证用户权限）
    const messages = dbOperations.getMessagesByConversationIdAndUserId(conversationId, userId);

    // 获取对话的工具调用记录（验证用户权限）
    const toolCallRecords = await dbOperations.getToolCallsByConversationIdAndUserId(conversationId, userId);

    // 获取对话中最后使用的模型
    const lastModel = await dbOperations.getLastModelByConversationId(conversationId);
    
    return NextResponse.json({
      success: true,
      conversation,
      messages,
      toolCallRecords,
      lastModel
    });
  } catch (error) {
    console.error('获取对话失败:', error);

    return NextResponse.json(
      {
        error: '获取对话失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
});

// 更新对话标题
export const PATCH = withAuth(async (
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

    const body = await request.json();
    const { title, model, agent_id } = body;

    // 验证至少有一个字段需要更新
    if (!title && !model && agent_id === undefined) {
      return NextResponse.json(
        { error: '至少需要提供一个要更新的字段' },
        { status: 400 }
      );
    }

    // 验证标题不为空（如果提供了标题）
    if (title !== undefined && (!title || !title.trim())) {
      return NextResponse.json(
        { error: '标题不能为空' },
        { status: 400 }
      );
    }

    let success = true;

    // 更新标题
    if (title !== undefined) {
      success = success && dbOperations.updateConversationTitleByUserAndId(conversationId, userId, title.trim());
    }

    // 更新模型
    if (model !== undefined) {
      success = success && dbOperations.updateConversationModelByUserAndId(conversationId, userId, model);
    }

    // 更新智能体
    if (agent_id !== undefined) {
      success = success && dbOperations.updateConversationAgentByUserAndId(conversationId, userId, agent_id);
    }

    if (!success) {
      return NextResponse.json(
        { error: '对话不存在或无权限访问' },
        { status: 404 }
      );
    }

    // 获取更新后的对话
    const updatedConversation = dbOperations.getConversationByIdAndUserId(conversationId, userId);
    
    return NextResponse.json({
      success: true,
      conversation: updatedConversation
    });
  } catch (error) {
    console.error('更新对话失败:', error);

    return NextResponse.json(
      {
        error: '更新对话失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
});

// 删除对话
export const DELETE = withAuth(async (
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

    // 删除对话（验证用户权限）
    const success = dbOperations.deleteConversationByUserAndId(conversationId, userId);

    if (!success) {
      return NextResponse.json(
        { error: '对话不存在或无权限访问' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '对话已删除'
    });
  } catch (error) {
    console.error('删除对话失败:', error);

    return NextResponse.json(
      {
        error: '删除对话失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
});