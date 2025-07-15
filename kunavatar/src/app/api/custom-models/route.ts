import { NextResponse } from 'next/server';
import { CustomModelService, CustomModel } from '@/lib/database/custom-models';
import { OllamaClient } from '@/lib/ollama';
import { withAuth, canAccessResource, AuthenticatedRequest } from '@/lib/middleware/auth';

export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    // 检查权限
    if (!canAccessResource(request.user!.permissions, 'models', 'read')) {
      return NextResponse.json({
        success: false,
        error: '权限不足',
      }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const forceSync = searchParams.get('sync') === 'true';
    
    let ollamaAvailable = false;
    let syncError: string | null = null;
    
    // 只在强制同步或首次加载时尝试同步Ollama模型
    if (forceSync) {
      try {
        const ollamaClient = new OllamaClient();
        const ollamaModels = await ollamaClient.getModels();
        CustomModelService.syncWithOllama(ollamaModels);
        ollamaAvailable = true;
        console.log('Ollama模型同步成功');
      } catch (error) {
        ollamaAvailable = false;
        syncError = error instanceof Error ? error.message : '未知错误';
        console.warn('Ollama服务不可用，将从数据库获取模型数据:', syncError);
        // 不抛出错误，继续从数据库获取数据
      }
    }

    // 从数据库获取所有模型（无论Ollama是否可用）
    const search = searchParams.get('search') || undefined;
    const tags = searchParams.get('tags')?.split(',') || undefined;
    const sortBy = searchParams.get('sortBy') as any || 'ollama_modified_at';
    const sortOrder = searchParams.get('sortOrder') as any || 'desc';
    
    const models = CustomModelService.getAll({
      search,
      tags,
      sortBy,
      sortOrder
    });

    // 返回结果，包含Ollama状态信息
    return NextResponse.json({ 
      success: true, 
      models,
      ollama_available: ollamaAvailable,
      sync_attempted: forceSync,
      sync_error: syncError
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('API Error in GET /api/custom-models:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}, { required: true });

export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    // 检查权限
    if (!canAccessResource(request.user!.permissions, 'models', 'create')) {
      return NextResponse.json({
        success: false,
        error: '权限不足',
      }, { status: 403 });
    }
    const body = await request.json();
    
    const model = CustomModelService.create(body);
    
    return NextResponse.json({
      success: true,
      model,
    }, { status: 201 });
  } catch (error) {
    console.error('创建自定义模型失败:', error);
    return NextResponse.json(
      {
        error: '创建模型失败',
        message: error instanceof Error ? error.message : '未知错误',
      },
      { status: 400 }
    );
  }
}, { required: true });