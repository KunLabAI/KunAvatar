import { NextRequest, NextResponse } from 'next/server';
import { agentOperations } from '../../../../../lib/database/agents';
import { z } from 'zod';

// 验证记忆设置的Schema
const memorySettingsSchema = z.object({
  memory_enabled: z.boolean()
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agentId = parseInt(id);
    if (isNaN(agentId)) {
      return NextResponse.json({ error: '无效的智能体ID' }, { status: 400 });
    }

    const agent = agentOperations.getById(agentId);
    if (!agent) {
      return NextResponse.json({ error: '智能体不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      memorySettings: {
        memory_enabled: agent.memory_enabled
      }
    });
  } catch (error) {
    console.error('获取智能体记忆设置失败:', error);
    return NextResponse.json(
      { error: '获取记忆设置失败' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agentId = parseInt(id);
    if (isNaN(agentId)) {
      return NextResponse.json({ error: '无效的智能体ID' }, { status: 400 });
    }

    const agent = agentOperations.getById(agentId);
    if (!agent) {
      return NextResponse.json({ error: '智能体不存在' }, { status: 404 });
    }

    const body = await request.json();
    const validation = memorySettingsSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({
        error: '请求参数格式错误',
        details: validation.error.errors
      }, { status: 400 });
    }

    const { memory_enabled } = validation.data;

    // 更新智能体的记忆设置
    const updateSuccess = agentOperations.update({
      id: agentId,
      memory_enabled
    });

    if (!updateSuccess) {
      return NextResponse.json({ error: '更新记忆设置失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '记忆设置更新成功',
      memorySettings: {
        memory_enabled
      }
    });
  } catch (error) {
    console.error('更新智能体记忆设置失败:', error);
    return NextResponse.json(
      { error: '更新记忆设置失败' },
      { status: 500 }
    );
  }
} 