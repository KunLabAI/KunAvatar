import { NextRequest, NextResponse } from 'next/server';
import { dbOperations } from '@/lib/database';
import { withAuth, canAccessResource, AuthenticatedRequest } from '@/lib/middleware/auth';

interface RouteParams {
  params: {
    shareId: string;
  };
}

// DELETE /api/notes/shares/[shareId] - 取消分享
export const DELETE = withAuth(async (request: AuthenticatedRequest, context) => {
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
    const shareId = parseInt(params.shareId);
    
    if (isNaN(shareId)) {
      return NextResponse.json(
        { success: false, error: '无效的分享ID' },
        { status: 400 }
      );
    }
    
    // 取消分享（只有分享者可以取消）
    const success = dbOperations.unshareNote(shareId, user.id);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: '取消分享失败或没有权限' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: '已取消分享'
    });
  } catch (error) {
    console.error('取消分享失败:', error);
    return NextResponse.json(
      { success: false, error: '取消分享失败' },
      { status: 500 }
    );
  }
}, { required: true });