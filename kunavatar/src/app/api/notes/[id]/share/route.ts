import { NextRequest, NextResponse } from 'next/server';
import { dbOperations } from '@/lib/database';
import { withAuth, canAccessResource, AuthenticatedRequest } from '@/lib/middleware/auth';

interface RouteParams {
  params: {
    id: string;
  };
}

// POST /api/notes/[id]/share - 分享笔记
export const POST = withAuth(async (request: AuthenticatedRequest, context) => {
  try {
    // 检查权限
    if (!canAccessResource(request.user!.permissions, 'notes', 'share')) {
      return NextResponse.json({
        success: false,
        error: '权限不足',
      }, { status: 403 });
    }
    
    const user = request.user!;
    const { params } = context;
  const resolvedParams = await params;
  const noteId = parseInt(resolvedParams.id);
    
    if (isNaN(noteId)) {
      return NextResponse.json(
        { success: false, error: '无效的笔记ID' },
        { status: 400 }
      );
    }
    
    // 检查笔记是否存在且用户有权限
    const note = dbOperations.getNoteById(noteId);
    
    if (!note) {
      return NextResponse.json(
        { success: false, error: '笔记不存在' },
        { status: 404 }
      );
    }
    
    // 检查权限：只有笔记作者可以分享
    if (note.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: '只有笔记所有者可以分享笔记' },
        { status: 403 }
      );
    }
    
    // 将笔记设为公开状态
    const updatedNote = dbOperations.updateNote(noteId, user.id, { is_public: true });
    
    if (!updatedNote) {
      return NextResponse.json(
        { success: false, error: '分享笔记失败' },
        { status: 400 }
      );
    }
    
    // 生成分享链接
    const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/notes/${noteId}`;
    
    return NextResponse.json({
      success: true,
      data: {
        share_token: noteId.toString(),
        shareUrl: shareUrl
      },
      shareUrl: shareUrl,
      message: '笔记已设为公开'
    }, { status: 200 });
  } catch (error) {
    console.error('分享笔记失败:', error);
    return NextResponse.json(
      { success: false, error: '分享笔记失败' },
      { status: 500 }
    );
  }
}, { required: true });