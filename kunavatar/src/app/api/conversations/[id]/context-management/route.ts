import { NextRequest, NextResponse } from 'next/server';
import { ContextManagerService, TokenEstimationService } from '@/app/api/chat/services';
import { dbOperations } from '@/lib/database';
import { MemoryService } from '@/app/api/chat/services/memoryService';

/**
 * 获取对话上下文使用情况分析
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversationId = id;
    const { searchParams } = new URL(request.url);
    const model = searchParams.get('model') || 'qwen2.5:7b';
    const strategy = searchParams.get('strategy') || 'balanced';

    if (!conversationId || conversationId.trim() === '') {
      return NextResponse.json(
        { error: '无效的对话ID' },
        { status: 400 }
      );
    }

    // 检查对话是否存在
    const conversation = dbOperations.getConversationById(conversationId);
    if (!conversation) {
      return NextResponse.json(
        { error: '对话不存在' },
        { status: 404 }
      );
    }

    // 获取对话消息
    const messages = dbOperations.getMessagesByConversationId(conversationId);
    const chatMessages = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
      content: msg.content
    }));

    // 获取记忆上下文（从记忆表中推断agentId）
    const { memoryOperations } = require('@/lib/database/memories');
    const memories = memoryOperations.getMemoriesByConversation(conversationId);
    const agentId = memories.length > 0 ? memories[0].agent_id : null;
    const memoryContext = agentId ? MemoryService.getMemoryContext(conversationId, agentId) : '';

    // 分析上下文使用情况
    const contextUsage = TokenEstimationService.analyzeContextUsage(chatMessages, memoryContext, model);

    // 预览上下文管理
    const preview = ContextManagerService.previewContextManagement(
      chatMessages,
      conversationId,
      agentId,
      model,
      strategy
    );

    // 生成使用情况报告
    const report = TokenEstimationService.getContextUsageReport(chatMessages, memoryContext, model);

    return NextResponse.json({
      success: true,
      data: {
        conversationId,
        conversationTitle: conversation.title,
        agentId,
        model,
        contextUsage,
        preview,
        report,
        messageCount: chatMessages.length,
        memoryContextLength: memoryContext.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('获取对话上下文分析失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 执行对话上下文优化
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversationId = id;

    if (!conversationId || conversationId.trim() === '') {
      return NextResponse.json(
        { error: '无效的对话ID' },
        { status: 400 }
      );
    }

    // 检查对话是否存在
    const conversation = dbOperations.getConversationById(conversationId);
    if (!conversation) {
      return NextResponse.json(
        { error: '对话不存在' },
        { status: 404 }
      );
    }

    // 解析请求体
    const body = await request.json();
    const { model = 'qwen2.5:7b', strategy = 'balanced', preview = false } = body;

    // 获取对话消息
    const messages = dbOperations.getMessagesByConversationId(conversationId);
    const chatMessages = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
      content: msg.content
    }));

    // 获取agentId（从记忆表中推断）
    const { memoryOperations } = require('@/lib/database/memories');
    const memories = memoryOperations.getMemoriesByConversation(conversationId);
    const agentId = memories.length > 0 ? memories[0].agent_id : null;

    if (preview) {
      // 预览模式：只返回分析结果，不实际执行优化
      const previewResult = ContextManagerService.previewContextManagement(
        chatMessages,
        conversationId,
        agentId,
        model,
        strategy
      );

      return NextResponse.json({
        success: true,
        preview: true,
        data: {
          conversationId,
          conversationTitle: conversation.title,
          agentId,
          model,
          strategy,
          previewResult,
          messageCount: chatMessages.length,
          timestamp: new Date().toISOString()
        }
      });
    }

    // 执行上下文优化
    if (!agentId) {
      return NextResponse.json(
        { error: '只有使用Agent的对话才能进行上下文优化' },
        { status: 400 }
      );
    }

    console.log(`🧠 开始优化对话 ${conversationId} 的上下文，策略: ${strategy}`);

    const managementResult = await ContextManagerService.manageContext(
      chatMessages,
      conversationId,
      agentId,
      model,
      strategy
    );

    // 获取优化后的上下文分析
    const postAnalysis = TokenEstimationService.analyzeContextUsage(
      managementResult.optimizedMessages,
      MemoryService.getMemoryContext(conversationId, agentId),
      model
    );

    return NextResponse.json({
      success: true,
      data: {
        conversationId,
        conversationTitle: conversation.title,
        agentId,
        model,
        strategy,
        managementResult,
        postAnalysis,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('对话上下文优化失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 获取推荐的上下文管理策略
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversationId = id;

    if (!conversationId || conversationId.trim() === '') {
      return NextResponse.json(
        { error: '无效的对话ID' },
        { status: 400 }
      );
    }

    // 检查对话是否存在
    const conversation = dbOperations.getConversationById(conversationId);
    if (!conversation) {
      return NextResponse.json(
        { error: '对话不存在' },
        { status: 404 }
      );
    }

    // 解析请求体
    const body = await request.json();
    const { model = 'qwen2.5:7b' } = body;

    // 获取对话消息
    const messages = dbOperations.getMessagesByConversationId(conversationId);
    const chatMessages = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
      content: msg.content
    }));

    // 获取agentId（从记忆表中推断）
    const { memoryOperations } = require('@/lib/database/memories');
    const memories = memoryOperations.getMemoriesByConversation(conversationId);
    const agentId = memories.length > 0 ? memories[0].agent_id : null;

    // 获取Agent的记忆数量
    let agentMemoryCount = 0;
    if (agentId) {
      const agentMemories = memoryOperations.getMemoriesByAgent(agentId);
      agentMemoryCount = agentMemories.length;
    }

    // 获取推荐策略
    const recommendedStrategy = ContextManagerService.getRecommendedStrategy(
      chatMessages,
      model,
      agentMemoryCount
    );

    // 获取所有策略的预览
    const strategyPreviews: Record<string, any> = {};
    for (const strategy of ['conservative', 'balanced', 'aggressive']) {
      strategyPreviews[strategy] = ContextManagerService.previewContextManagement(
        chatMessages,
        conversationId,
        agentId,
        model,
        strategy
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        conversationId,
        conversationTitle: conversation.title,
        agentId,
        model,
        recommendedStrategy,
        strategyPreviews,
        messageCount: chatMessages.length,
        agentMemoryCount,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('获取推荐策略失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}