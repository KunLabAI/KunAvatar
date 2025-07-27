import { NextRequest, NextResponse } from 'next/server';
import { agentOperations } from '@/lib/database';
import { withAuth } from '@/lib/middleware/auth';
import { z } from 'zod';

// GET /api/agents - 获取当前用户的智能体
export const GET = withAuth(async (request) => {
  try {
    const userId = request.user!.id;
    // 获取当前用户的智能体
    const agents = agentOperations.getAllByUserId(userId);
    return NextResponse.json(agents);
  } catch (error) {
    console.error('Failed to get agents:', error);
    return NextResponse.json({ error: 'Failed to retrieve agents' }, { status: 500 });
  }
});

// POST /api/agents - 创建新智能体
const createAgentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullable().optional().default(null),
  model_id: z.number().int().positive('Model ID must be a positive integer'),
  system_prompt: z.string().nullable().optional().default(null),
  avatar: z.string().nullable().optional().default(null),
  memory_enabled: z.boolean().optional().default(false),
  server_ids: z.array(z.number().int().positive()).optional().default([]),
  tool_ids: z.array(z.number().int().positive()).optional().default([]),
});

export const POST = withAuth(async (request) => {
  try {
    const userId = request.user!.id;
    const body = await request.json();
    const validation = createAgentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.format() }, { status: 400 });
    }
    
    // 添加用户ID到智能体数据
    const agentData = {
      ...validation.data,
      user_id: userId
    };
    
    const newAgent = agentOperations.create(agentData);
    if (!newAgent) {
      return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
    }

    return NextResponse.json(newAgent, { status: 201 });
  } catch (error) {
    console.error('Failed to create agent:', error);
    if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'Invalid input', details: error.format() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
});