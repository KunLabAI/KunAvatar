import { NextRequest, NextResponse } from 'next/server';
import { memoryOperations } from '@/lib/database/memories';
import { safeGetParams } from '@/lib/middleware/auth';

/**
 * 删除指定ID的记忆
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 安全地处理 params
    const paramsResult = await safeGetParams(params);
    if (!paramsResult.success || !paramsResult.data?.id) {
      return NextResponse.json(
        { error: paramsResult.error || '无效的记忆ID' },
        { status: 400 }
      );
    }
    
    const memoryId = parseInt(paramsResult.data.id);

    if (isNaN(memoryId)) {
      return NextResponse.json(
        { error: '无效的记忆ID' },
        { status: 400 }
      );
    }

    // 删除记忆
    const success = memoryOperations.deleteMemory(memoryId);

    if (!success) {
      return NextResponse.json(
        { error: '记忆不存在或删除失败' },
        { status: 404 }
      );
    }

    console.log(`🗑️ 成功删除记忆 ID: ${memoryId}`);

    return NextResponse.json({
      success: true,
      message: '记忆删除成功'
    });

  } catch (error) {
    console.error('删除记忆时发生错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 获取指定ID的记忆详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 安全地处理 params
    const paramsResult = await safeGetParams(params);
    if (!paramsResult.success || !paramsResult.data?.id) {
      return NextResponse.json(
        { error: paramsResult.error || '无效的记忆ID' },
        { status: 400 }
      );
    }
    
    const memoryId = parseInt(paramsResult.data.id);

    if (isNaN(memoryId)) {
      return NextResponse.json(
        { error: '无效的记忆ID' },
        { status: 400 }
      );
    }

    // 获取记忆详情
    const memory = memoryOperations.getMemoryById(memoryId);

    if (!memory) {
      return NextResponse.json(
        { error: '记忆不存在' },
        { status: 404 }
      );
    }

    // 处理记忆内容，解析JSON格式
    let parsedContent;
    try {
      parsedContent = JSON.parse(memory.content);
    } catch {
      parsedContent = { summary: memory.content };
    }

    return NextResponse.json({
      success: true,
      memory: {
        ...memory,
        parsedContent
      }
    });

  } catch (error) {
    console.error('获取记忆详情时发生错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 更新指定ID的记忆
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 安全地处理 params
    const paramsResult = await safeGetParams(params);
    if (!paramsResult.success || !paramsResult.data?.id) {
      return NextResponse.json(
        { error: paramsResult.error || '无效的记忆ID' },
        { status: 400 }
      );
    }
    
    const memoryId = parseInt(paramsResult.data.id);

    if (isNaN(memoryId)) {
      return NextResponse.json(
        { error: '无效的记忆ID' },
        { status: 400 }
      );
    }

    // 检查记忆是否存在
    const existingMemory = memoryOperations.getMemoryById(memoryId);
    if (!existingMemory) {
      return NextResponse.json(
        { error: '记忆不存在' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { content, importance_score, memory_type } = body;

    if (!content) {
      return NextResponse.json(
        { error: '记忆内容不能为空' },
        { status: 400 }
      );
    }

    // 更新记忆
    const success = memoryOperations.updateMemory(
      memoryId,
      typeof content === 'string' ? content : JSON.stringify(content),
      importance_score,
      memory_type
    );

    if (!success) {
      return NextResponse.json(
        { error: '更新记忆失败' },
        { status: 500 }
      );
    }

    console.log(`✏️ 成功更新记忆 ID: ${memoryId}`);

    return NextResponse.json({
      success: true,
      message: '记忆更新成功'
    });

  } catch (error) {
    console.error('更新记忆时发生错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}