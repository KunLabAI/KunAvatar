import { NextRequest, NextResponse } from 'next/server';
import { dbOperations } from '@/lib/database';
import { CreateNoteSchema } from '@/lib/database/notes';
import { withAuth, canAccessResource, AuthenticatedRequest } from '@/lib/middleware/auth';
import { z } from 'zod';

// GET /api/notes - 获取笔记列表
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    // 检查权限
    if (!canAccessResource(request.user!.permissions, 'notes', 'read')) {
      return NextResponse.json({
        success: false,
        error: '权限不足',
      }, { status: 403 });
    }
    
    const user = request.user!;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || undefined;
    const tagsParam = searchParams.get('tags');
    const showPublic = searchParams.get('public') === 'true';
    
    const tags = tagsParam ? tagsParam.split(',').filter(Boolean) : undefined;
    
    let result;
    if (showPublic) {
      // 获取公开笔记
      result = dbOperations.getPublicNotes({ page, limit, search, tags });
    } else {
      // 获取用户自己的笔记
      result = dbOperations.getUserNotes(user.id, { page, limit, search, tags });
    }
    
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
    console.error('获取笔记列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取笔记列表失败' },
      { status: 500 }
    );
  }
}, { required: true });

// POST /api/notes - 创建新笔记
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    // 检查权限
    if (!canAccessResource(request.user!.permissions, 'notes', 'create')) {
      return NextResponse.json({
        success: false,
        error: '权限不足',
      }, { status: 403 });
    }
    
    const user = request.user!;
    const body = await request.json();
    
    // 验证请求数据
    const validatedData = CreateNoteSchema.parse(body);
    
    // 创建笔记
    const note = dbOperations.createNote(user.id, validatedData);
    
    return NextResponse.json({
      success: true,
      data: note
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: '数据验证失败',
          details: error.errors
        },
        { status: 400 }
      );
    }
    
    console.error('创建笔记失败:', error);
    return NextResponse.json(
      { success: false, error: '创建笔记失败' },
      { status: 500 }
    );
  }
}, { required: true });