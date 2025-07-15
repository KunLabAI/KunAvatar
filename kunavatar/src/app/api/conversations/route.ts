import { NextRequest, NextResponse } from 'next/server';
import { dbOperations } from '../../../lib/database';
import { withAuth } from '../../../lib/middleware/auth';

// 获取用户的所有对话
export const GET = withAuth(async (request) => {
  try {
    const userId = request.user!.id;
    const conversations = dbOperations.getAllConversationsByUserId(userId);

    // 为每个对话添加统计信息
    const conversationsWithStats = conversations.map(conversation => {
      const stats = dbOperations.getConversationStats(conversation.id);
      return {
        ...conversation,
        stats
      };
    });

    return NextResponse.json({
      success: true,
      conversations: conversationsWithStats
    });
  } catch (error) {
    console.error('获取对话列表失败:', error);

    return NextResponse.json(
      {
        error: '获取对话列表失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
});

// 创建新对话
export const POST = withAuth(async (request) => {
  try {
    const userId = request.user!.id;
    const body = await request.json();
    console.log('🔍 API接收到的请求体:', JSON.stringify(body, null, 2));
    console.log('🔍 用户ID:', userId, '类型:', typeof userId);
    
    const { title, model, agent_id }: { title: string; model?: string; agent_id?: number | null } = body;
    console.log('🔍 解析后的参数 - title:', title, 'model:', model, 'agent_id:', agent_id);
    
    // 确保agent_id类型正确处理
    const processedAgentId = (agent_id === null || agent_id === undefined) ? null : 
      (typeof agent_id === 'number' ? agent_id : (isNaN(Number(agent_id)) ? null : Number(agent_id)));
    
    const conversationData = {
      title: title.trim(),
      model,
      user_id: userId,
      agent_id: processedAgentId
    };
    console.log('🔍 传递给数据库的数据:', JSON.stringify(conversationData, null, 2));
    console.log('🔍 各字段类型 - title:', typeof conversationData.title, 'model:', typeof conversationData.model, 'user_id:', typeof conversationData.user_id, 'agent_id:', typeof conversationData.agent_id);

    // 验证必需参数
    if (!title) {
      console.log('❌ 参数验证失败 - title:', !!title);
      return NextResponse.json(
        { error: '缺少必需参数: title' },
        { status: 400 }
      );
    }

    // 创建新对话
    const conversationId = dbOperations.createConversation(conversationData);

    // 获取创建的对话
    const conversation = dbOperations.getConversationById(conversationId);

    return NextResponse.json({
      success: true,
      conversation
    }, { status: 201 });
  } catch (error) {
    console.error('创建对话失败:', error);

    return NextResponse.json(
      {
        error: '创建对话失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
});