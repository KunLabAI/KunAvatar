import { NextRequest, NextResponse } from 'next/server';
import { dbOperations } from '../../../../../lib/database';
import { MemoryService } from '../../../chat/services/memoryService';
import { withAuth } from '../../../../../lib/middleware/auth';

/**
 * 独立的记忆状态管理API
 * 用于获取记忆状态，不阻塞对话流程
 */
export const GET = withAuth(async (
  request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const userId = request.user!.id;
    const { id } = await params;
    const conversationId = id;
    
    const url = new URL(request.url);
    const agentId = url.searchParams.get('agentId');

    if (!conversationId) {
      return NextResponse.json({ error: '无效的对话ID' }, { status: 400 });
    }

    // 检查对话是否存在且用户有权限
    const conversation = dbOperations.getConversationByIdAndUserId(conversationId, userId);
    if (!conversation) {
      return NextResponse.json({ error: '对话不存在或无权限访问' }, { status: 404 });
    }

    // 获取记忆状态
    const memoryStatus = {
      conversationId,
      agentId: agentId ? parseInt(agentId) : null,
      shouldTriggerMemory: false,
      memories: [] as any[],
      memoryCount: 0,
      lastMemoryRange: null as string | null,
      memorySettings: {} as any
    };

    // 获取记忆设置
    const globalSettings = MemoryService.getGlobalMemorySettings();
    memoryStatus.memorySettings = globalSettings;

    if (agentId) {
      const parsedAgentId = parseInt(agentId);
      
      // 检查是否应该触发记忆
      memoryStatus.shouldTriggerMemory = MemoryService.shouldTriggerMemory(conversationId, parsedAgentId);
      
      // 获取Agent的记忆
      memoryStatus.memories = dbOperations.getMemoriesByAgent(parsedAgentId);
      memoryStatus.memoryCount = memoryStatus.memories.length;
      
      // 获取最后一条记忆的范围
      const conversationMemories = dbOperations.getMemoriesByConversation(conversationId);
      if (conversationMemories.length > 0) {
        memoryStatus.lastMemoryRange = conversationMemories[0].source_message_range;
      }
    }

    return NextResponse.json(memoryStatus);

  } catch (error) {
    console.error('获取记忆状态失败:', error);
    return NextResponse.json(
      { error: '获取记忆状态失败', message: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
});

/**
 * 异步触发记忆生成
 * 不阻塞对话流程
 */
export const POST = withAuth(async (
  request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const userId = request.user!.id;
    const { id } = await params;
    const conversationId = id;
    
    const body = await request.json();
    const { agentId, force = false } = body;

    if (!conversationId || !agentId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 检查对话是否存在且用户有权限
    const conversation = dbOperations.getConversationByIdAndUserId(conversationId, userId);
    if (!conversation) {
      return NextResponse.json({ error: '对话不存在或无权限访问' }, { status: 404 });
    }

    // 检查是否应该触发记忆
    const shouldTrigger = force || MemoryService.shouldTriggerMemory(conversationId, agentId);
    
    if (!shouldTrigger) {
      return NextResponse.json({ 
        triggered: false, 
        message: '当前不需要生成记忆',
        shouldTrigger
      });
    }

    // 异步生成记忆，不阻塞响应
    (async () => {
      try {
        const rawMessages = dbOperations.getMessagesByConversationId(conversationId);
        const messages = rawMessages.map(msg => ({
          role: msg.role as 'system' | 'user' | 'assistant' | 'tool',
          content: msg.content
        }));

        const memorySettings = MemoryService.getGlobalMemorySettings();
        const memory = await MemoryService.generateMemory({
          conversationId,
          agentId,
          messages,
          settings: memorySettings
        });

        if (memory) {
          console.log(`✅ 异步记忆生成成功，ID: ${memory.id}`);
        }
      } catch (error) {
        console.error('异步记忆生成失败:', error);
      }
    })();

    return NextResponse.json({ 
      triggered: true, 
      message: '记忆生成已启动',
      async: true 
    });

  } catch (error) {
    console.error('触发记忆生成失败:', error);
    return NextResponse.json(
      { error: '触发记忆生成失败', message: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
});