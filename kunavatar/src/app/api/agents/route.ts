import { NextResponse } from 'next/server';
import { agentOperations } from '@/lib/database';
import { z } from 'zod';

// GET /api/agents - 获取所有智能体
export async function GET() {
  try {
    const agents = agentOperations.getAll();
    return NextResponse.json(agents);
  } catch (error) {
    console.error('Failed to get agents:', error);
    return NextResponse.json({ error: 'Failed to retrieve agents' }, { status: 500 });
  }
}

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = createAgentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.format() }, { status: 400 });
    }
    
    const newAgent = agentOperations.create(validation.data);
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
}