import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../lib/middleware/auth';
import { MemoryService } from '../chat/services/memoryService';
import { dbOperations } from '../../../lib/database';

/**
 * 独立的记忆检查和生成API
 * 完全脱离对话流程，可以通过定时任务或手动触发
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { conversationId, agentId, force = false } = body;

    if (!conversationId || !agentId) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数：conversationId 和 agentId'
      }, { status: 400 });
    }

    console.log(`🧠 独立记忆检查 - 对话: ${conversationId}, Agent: ${agentId}`);

    // 检查是否需要生成记忆
    const shouldTrigger = force || MemoryService.shouldTriggerMemory(conversationId, agentId);
    
    if (!shouldTrigger) {
      return NextResponse.json({
        success: true,
        message: '暂不需要生成记忆',
        triggered: false
      });
    }

    // 获取对话消息
    const rawMessages = dbOperations.getMessagesByConversationId(conversationId);
    const messages = rawMessages.map(msg => ({
      role: msg.role as 'system' | 'user' | 'assistant' | 'tool',
      content: msg.content
    }));

    if (messages.length === 0) {
      return NextResponse.json({
        success: false,
        error: '对话中没有消息',
        triggered: false
      });
    }

    // 生成记忆
    const memorySettings = MemoryService.getGlobalMemorySettings();
    const memory = await MemoryService.generateMemory({
      conversationId,
      agentId,
      messages,
      settings: memorySettings
    });

    if (memory) {
      console.log(`✅ 独立记忆生成成功，ID: ${memory.id}`);
      return NextResponse.json({
        success: true,
        message: '记忆生成成功',
        triggered: true,
        memory: {
          id: memory.id,
          sourceRange: memory.source_message_range,
          tokensSaved: memory.tokens_saved,
          importanceScore: memory.importance_score
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: '记忆生成失败',
        triggered: true
      });
    }

  } catch (error) {
    console.error('独立记忆检查失败:', error);
    return NextResponse.json({
      success: false,
      error: '记忆检查失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
});

/**
 * 获取记忆检查状态
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const agentId = searchParams.get('agentId');

    if (!conversationId || !agentId) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数：conversationId 和 agentId'
      }, { status: 400 });
    }

    const shouldTrigger = MemoryService.shouldTriggerMemory(
      conversationId,
      parseInt(agentId)
    );

    const allMessages = dbOperations.getMessagesByConversationId(conversationId);
    const userAssistantMessages = allMessages.filter(msg => 
      msg.role === 'user' || msg.role === 'assistant'
    );

    return NextResponse.json({
      success: true,
      conversationId: conversationId,
      agentId: parseInt(agentId),
      shouldTrigger,
      messageCount: userAssistantMessages.length,
      memorySettings: MemoryService.getGlobalMemorySettings()
    });

  } catch (error) {
    console.error('获取记忆状态失败:', error);
    return NextResponse.json({
      success: false,
      error: '获取记忆状态失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
});

/**
 * 批量处理记忆检查
 */
export const PUT = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { agentId, batchSize = 10 } = body;

    if (!agentId) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数：agentId'
      }, { status: 400 });
    }

    console.log(`🧠 批量记忆检查 - Agent: ${agentId}`);

    // 暂时不支持批量处理，需要实现getConversationsByAgent方法
    return NextResponse.json({
      success: false,
      error: '批量处理功能暂未实现，请单独处理每个对话',
      message: '使用POST方法单独处理每个对话'
    }, { status: 501 });

  } catch (error) {
    console.error('批量记忆检查失败:', error);
    return NextResponse.json({
      success: false,
      error: '批量记忆检查失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
});