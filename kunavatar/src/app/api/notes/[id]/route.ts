import { NextRequest, NextResponse } from 'next/server';
import { dbOperations } from '@/lib/database';
import { UpdateNoteSchema } from '@/lib/database/notes';
import { withAuth, canAccessResource, AuthenticatedRequest } from '@/lib/middleware/auth';
import { z } from 'zod';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/notes/[id] - 获取单个笔记
export const GET = withAuth(async (request: AuthenticatedRequest, context) => {
  try {
    // 检查权限
    if (!canAccessResource(request.user!.permissions, 'notes', 'read')) {
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
    
    // 检查笔记是否存在
    const note = dbOperations.getNoteById(noteId);
    if (!note) {
      return NextResponse.json(
        { success: false, error: '笔记不存在' },
        { status: 404 }
      );
    }
    
    // 检查访问权限
    const hasAccess = dbOperations.checkNoteAccess(noteId, user.id, 'read');
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: '没有访问权限' },
        { status: 403 }
      );
    }
    
    // 添加is_owner字段
    const noteWithOwnership = {
      ...note,
      is_owner: note.user_id === user.id
    };
    
    return NextResponse.json({
      success: true,
      data: noteWithOwnership
    });
  } catch (error) {
    console.error('获取笔记失败:', error);
    return NextResponse.json(
      { success: false, error: '获取笔记失败' },
      { status: 500 }
    );
  }
}, { required: true });

// PUT /api/notes/[id] - 更新笔记
export const PUT = withAuth(async (request: AuthenticatedRequest, context) => {
  try {
    // 检查权限
    if (!canAccessResource(request.user!.permissions, 'notes', 'update')) {
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
    
    // 检查写入权限
    const hasWriteAccess = dbOperations.checkNoteAccess(noteId, user.id, 'write');
    if (!hasWriteAccess) {
      return NextResponse.json(
        { success: false, error: '没有编辑权限' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    
    // 验证请求数据
    const validatedData = UpdateNoteSchema.parse(body);
    
    // 更新笔记
    const updatedNote = dbOperations.updateNote(noteId, user.id, validatedData);
    
    if (!updatedNote) {
      return NextResponse.json(
        { success: false, error: '更新笔记失败' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: updatedNote
    });
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
    
    console.error('更新笔记失败:', error);
    return NextResponse.json(
      { success: false, error: '更新笔记失败' },
      { status: 500 }
    );
  }
}, { required: true });

// DELETE /api/notes/[id] - 删除笔记
export const DELETE = withAuth(async (request: AuthenticatedRequest, context) => {
  try {
    // 检查权限
    if (!canAccessResource(request.user!.permissions, 'notes', 'delete')) {
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
    
    // 删除笔记（只有所有者可以删除）
    const success = dbOperations.deleteNote(noteId, user.id);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: '删除笔记失败或没有权限' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: '笔记已删除'
    });
  } catch (error) {
    console.error('删除笔记失败:', error);
    return NextResponse.json(
      { success: false, error: '删除笔记失败' },
      { status: 500 }
    );
  }
}, { required: true });