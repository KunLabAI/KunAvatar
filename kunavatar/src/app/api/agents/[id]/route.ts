import { NextRequest, NextResponse } from 'next/server';
import { agentOperations } from '@/lib/database';
import { withAuth, safeGetParams } from '@/lib/middleware/auth';
import { z } from 'zod';

// GET /api/agents/[id] - 获取智能体详情
export const GET = withAuth(async (request, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const userId = request.user!.id;
    
    // 安全地处理 params
    const paramsResult = await safeGetParams(params);
    if (!paramsResult.success || !paramsResult.data?.id) {
      return NextResponse.json(
        { error: paramsResult.error || '无效的智能体ID' },
        { status: 400 }
      );
    }
    
    const agentId = parseInt(paramsResult.data.id);
    if (isNaN(agentId)) {
      return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 });
    }

    const agent = agentOperations.getById(agentId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // 检查用户权限
    if (agent.user_id !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error('Failed to get agent:', error);
    return NextResponse.json({ error: 'Failed to retrieve agent' }, { status: 500 });
  }
});

// PUT /api/agents/[id] - 更新智能体
const updateAgentSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().nullable().optional(),
  model_id: z.number().int().positive('Model ID must be a positive integer').optional(),
  system_prompt: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
  memory_enabled: z.boolean().optional(),
  server_ids: z.array(z.number().int().positive()).optional(),
  tool_ids: z.array(z.number().int().positive()).optional(),
});

export const PUT = withAuth(async (request, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const userId = request.user!.id;
    
    // 安全地处理 params
    const paramsResult = await safeGetParams(params);
    if (!paramsResult.success || !paramsResult.data?.id) {
      return NextResponse.json(
        { error: paramsResult.error || '无效的智能体ID' },
        { status: 400 }
      );
    }
    
    const agentId = parseInt(paramsResult.data.id);
    if (isNaN(agentId)) {
      return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 });
    }

    // 检查智能体是否存在
    const existingAgent = agentOperations.getById(agentId);
    if (!existingAgent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // 检查用户权限
    if (existingAgent.user_id !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const validation = updateAgentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.format() }, { status: 400 });
    }

    const updatedAgent = agentOperations.update({ id: agentId, ...validation.data });
    if (!updatedAgent) {
      return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
    }

    return NextResponse.json(updatedAgent);
  } catch (error) {
    console.error('Failed to update agent:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.format() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }
});

// DELETE /api/agents/[id] - 删除智能体
export const DELETE = withAuth(async (request, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const userId = request.user!.id;
    
    // 安全地处理 params
    const paramsResult = await safeGetParams(params);
    if (!paramsResult.success || !paramsResult.data?.id) {
      return NextResponse.json(
        { error: paramsResult.error || '无效的智能体ID' },
        { status: 400 }
      );
    }
    
    const agentId = parseInt(paramsResult.data.id);
    if (isNaN(agentId)) {
      return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 });
    }

    // 检查智能体是否存在
    const existingAgent = agentOperations.getById(agentId);
    if (!existingAgent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // 检查用户权限
    if (existingAgent.user_id !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const success = agentOperations.delete(agentId);
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('Failed to delete agent:', error);
    return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
  }
});