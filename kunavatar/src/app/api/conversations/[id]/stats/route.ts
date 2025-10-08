import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { conversationOperations } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证用户身份
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '访问令牌不存在' }, { status: 401 });
    }

    const accessToken = authHeader.substring(7);
    const verification = await AuthService.verifyAccessToken(accessToken);
    
    if (!verification.valid || !verification.user) {
      return NextResponse.json({ error: verification.error || '访问令牌无效' }, { status: 401 });
    }

    const resolvedParams = await params;
    const conversationId = resolvedParams.id;
    const userId = verification.user.id;

    // 验证对话是否属于当前用户
    const conversation = conversationOperations.getByIdAndUserId(conversationId, userId);
    if (!conversation) {
      return NextResponse.json({ error: '对话不存在或无权访问' }, { status: 404 });
    }

    // 获取对话统计信息
    const stats = conversationOperations.getStats(conversationId);

    return NextResponse.json({
      success: true,
      stats: stats || {
        message_count: 0,
        total_characters: 0,
        total_prompt_tokens: 0,
        total_completion_tokens: 0,
        total_tokens: 0
      }
    });

  } catch (error) {
    console.error('Failed to get conversation stats:', error);
    return NextResponse.json({ error: '获取对话统计失败' }, { status: 500 });
  }
}