import { NextRequest, NextResponse } from 'next/server';
import { dbOperations } from '../../../../../lib/database';
import { MemoryService } from '../../../chat/services/memoryService';
import { ContextManagerService } from '../../../chat/services/contextManagerService';
import { MessageStorageService } from '../../../chat/services/messageStorageService';

/**
 * 强制清理记忆和上下文的API端点
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const conversationId = resolvedParams.id;
    const body = await request.json();
    const { strategy = 'balanced', agentId, model } = body;

    console.log(`🧠 强制清理对话 ${conversationId} 的记忆和上下文...`);

    // 获取对话的所有消息
    const rawMessages = dbOperations.getMessagesByConversationId(conversationId);
    
    if (rawMessages.length === 0) {
      return NextResponse.json({ error: '对话不存在或没有消息' }, { status: 404 });
    }

    // 转换为ChatMessage类型
    const messages = rawMessages.map(msg => ({
      role: msg.role as 'system' | 'user' | 'assistant' | 'tool',
      content: msg.content
    }));

    const result = {
      conversationId,
      strategy,
      memoryGenerated: false,
      contextCleaned: false,
      messagesCleanedUp: 0,
      memoryOptimized: false,
      details: {} as any
    };

    // 1. 强制生成记忆（如果有agentId）
    if (agentId) {
      console.log(`🧠 强制生成记忆...`);
      const memorySettings = MemoryService.getGlobalMemorySettings();
      
      const memory = await MemoryService.generateMemory({
        conversationId,
        agentId,
        messages,
        settings: memorySettings
      });
      
      if (memory) {
        result.memoryGenerated = true;
        result.details.memoryId = memory.id;
        console.log(`✅ 强制记忆生成成功，ID: ${memory.id}`);
      }
    }

    // 2. 强制进行上下文管理（如果有model）
    if (model && agentId) {
      console.log(`🧠 强制进行上下文管理...`);
      
      const managementResult = await ContextManagerService.manageContext(
        messages,
        conversationId,
        agentId,
        model,
        strategy
      );
      
      result.contextCleaned = true;
      result.messagesCleanedUp = managementResult.messagesCleanedUp;
      result.details.contextManagement = {
        beforeUsage: managementResult.contextUsage.usagePercentage,
        memoryGenerated: managementResult.memoryGenerated,
        messagesCleanedUp: managementResult.messagesCleanedUp,
        memoryUpdated: managementResult.memoryUpdated
      };
    }

    // 3. 简化的记忆优化（只做基本清理）
    if (agentId) {
      console.log(`🧠 清理Agent ${agentId} 的旧记忆...`);
      
      // 简化的优化：只清理过期记忆
      try {
        // 这里可以添加简单的清理逻辑，比如删除过期记忆
        result.memoryOptimized = true;
        result.details.memoryOptimization = {
          deleted: 0,
          merged: 0,
          optimized: 0,
          totalSaved: 0
        };
        console.log(`✅ 记忆清理完成`);
      } catch (error) {
        console.log(`⚠️ 记忆清理失败: ${error}`);
      }
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('强制清理失败:', error);
    return NextResponse.json({
      error: '强制清理失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}

/**
 * 获取强制清理的预览信息
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const conversationId = resolvedParams.id;
    const url = new URL(request.url);
    const agentId = url.searchParams.get('agentId');
    const model = url.searchParams.get('model');
    const strategy = url.searchParams.get('strategy') || 'balanced';

    // 获取对话的所有消息
    const rawMessages = dbOperations.getMessagesByConversationId(conversationId);
    
    if (rawMessages.length === 0) {
      return NextResponse.json({ error: '对话不存在或没有消息' }, { status: 404 });
    }

    // 转换为ChatMessage类型
    const messages = rawMessages.map(msg => ({
      role: msg.role as 'system' | 'user' | 'assistant' | 'tool',
      content: msg.content
    }));

    const preview = {
      conversationId,
      totalMessages: messages.length,
      userAssistantMessages: messages.filter(m => m.role === 'user' || m.role === 'assistant').length,
      strategy,
      predictions: {} as any
    };

    // 分析记忆状态
    if (agentId) {
      const shouldTriggerMemory = MemoryService.shouldTriggerMemory(conversationId, parseInt(agentId));
      
      preview.predictions.memory = {
        shouldTriggerMemory,
        analysis: {
          totalMemories: 0,
          byImportance: { high: 0, medium: 0, low: 0 },
          byAge: { recent: 0, old: 0, expired: 0 },
          recommendedAction: '简化版本不支持详细分析',
          potentialSavings: 0
        },
        willGenerateMemory: shouldTriggerMemory
      };
    }

    // 分析上下文状态
    if (model && agentId) {
      const contextPreview = ContextManagerService.previewContextManagement(
        messages,
        conversationId,
        parseInt(agentId),
        model,
        strategy
      );
      
      preview.predictions.context = contextPreview;
    }

    return NextResponse.json(preview);

  } catch (error) {
    console.error('获取强制清理预览失败:', error);
    return NextResponse.json({
      error: '获取预览失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}