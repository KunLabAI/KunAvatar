import { NextRequest, NextResponse } from 'next/server';
import { dbOperations, agentMessageOperations } from '../../../../../lib/database';
import { withAuth } from '../../../../../lib/middleware/auth';
import { TitleGenerationService, type TitleSummarySettings } from '../../../chat/services/titleGenerationService';

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

    const body = await request.json();
    const { model, systemPrompt }: { model: string; systemPrompt?: string } = body;

    if (!model) {
      return NextResponse.json(
        { error: '缺少模型参数' },
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

    // 获取对话的消息（验证用户权限）
    let messages;
    if (conversation.agent_id) {
      // 智能体对话：从 agent_messages 表查询
      console.log('🤖 标题生成API检测到智能体对话，从 agent_messages 表查询消息');
      messages = agentMessageOperations.getByConversationIdAndUserId(conversationId, userId);
    } else {
      // 模型对话：从 messages 表查询
      console.log('🔧 标题生成API检测到模型对话，从 messages 表查询消息');
      messages = dbOperations.getMessagesByConversationIdAndUserId(conversationId, userId);
    }
    
    if (messages.length < 2) {
      return NextResponse.json(
        { error: '消息数量不足，无法生成标题' },
        { status: 400 }
      );
    }

    // 筛选出有效的对话内容
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    
    if (userMessages.length === 0 || assistantMessages.length === 0) {
      return NextResponse.json(
        { error: '缺少有效的对话内容' },
        { status: 400 }
      );
    }

    try {
      // 构建标题总结设置
      const titleSummarySettings: TitleSummarySettings = {
        enabled: true,
        model: model,
        systemPrompt: systemPrompt
      };

      // 使用统一的标题生成服务，强制生成
      const generatedTitle = await TitleGenerationService.checkAndGenerateTitle(
        conversationId, 
        titleSummarySettings,
        true // 强制生成，不检查是否为默认标题
      );

      if (!generatedTitle) {
        return NextResponse.json(
          { error: '标题生成失败，请稍后重试' },
          { status: 500 }
        );
      }

      // 更新数据库中的对话标题（验证用户权限）
      dbOperations.updateConversationTitleByUserAndId(conversationId, userId, generatedTitle);

      return NextResponse.json({
        success: true,
        title: generatedTitle
      });

    } catch (modelError: any) {
      console.error('模型调用失败:', modelError);
      return NextResponse.json(
        { 
          error: '标题生成失败',
          message: modelError.message || '模型调用出错'
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('生成标题时发生错误:', error);
    return NextResponse.json(
      {
        error: '服务器内部错误',
        message: error.message || '未知错误'
      },
      { status: 500 }
    );
  }
});