import { NextRequest, NextResponse } from 'next/server';
import { dbOperations } from '@/lib/database';
import { withAuth, canAccessResource, AuthenticatedRequest } from '@/lib/middleware/auth';

// GET /api/notes/public - 获取公开笔记列表
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    // 检查权限
    if (!canAccessResource(request.user!.permissions, 'notes', 'read')) {
      return NextResponse.json({
        success: false,
        error: '权限不足',
      }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || undefined;
    const tagsParam = searchParams.get('tags');
    
    const tags = tagsParam ? tagsParam.split(',').filter(Boolean) : undefined;
    
    // 获取公开笔记
    const result = dbOperations.getPublicNotes({ page, limit, search, tags });
    
    return NextResponse.json({
      success: true,
      data: result.notes,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    });
  } catch (error) {
    console.error('获取公开笔记失败:', error);
    return NextResponse.json(
      { success: false, error: '获取公开笔记失败' },
      { status: 500 }
    );
  }
}, { required: true });