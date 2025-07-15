import { NextResponse } from 'next/server';
import { agentOperations } from '@/lib/database';
import { z } from 'zod';

// GET /api/agents/[id] - 获取单个智能体
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: agentId } = await context.params;
    const id = parseInt(agentId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 });
    }
    const agent = agentOperations.getById(id);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    return NextResponse.json(agent);
  } catch (error) {
    console.error(`Failed to get agent:`, error);
    return NextResponse.json({ error: 'Failed to retrieve agent' }, { status: 500 });
  }
}

// PUT /api/agents/[id] - 更新智能体
const updateAgentSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional().nullable(),
  system_prompt: z.string().optional().nullable(),
  avatar: z.string().optional().nullable(),
  server_ids: z.array(z.number().int().positive()).optional(),
  tool_ids: z.array(z.number().int().positive()).optional(),
});

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id: agentId } = await context.params;
        const id = parseInt(agentId, 10);
        if (isNaN(id)) {
            return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 });
        }

        const body = await request.json();
        const validation = updateAgentSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid input', details: validation.error.format() }, { status: 400 });
        }

        const success = agentOperations.update({ id, ...validation.data });

        if (!success) {
            return NextResponse.json({ error: 'Failed to update agent or agent not found' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(`Failed to update agent:`, error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid input', details: error.format() }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
    }
}


// DELETE /api/agents/[id] - 删除智能体
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: agentId } = await context.params;
    const id = parseInt(agentId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 });
    }
    const success = agentOperations.delete(id);
    if (!success) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`Failed to delete agent:`, error);
    return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
  }
}