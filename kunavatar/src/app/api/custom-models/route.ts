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
    
    // 先从数据库获取模型
    const search = searchParams.get('search') || undefined;
    const tags = searchParams.get('tags')?.split(',') || undefined;
    const sortBy = searchParams.get('sortBy') as any || 'ollama_modified_at';
    const sortOrder = searchParams.get('sortOrder') as any || 'desc';
    
    let models = CustomModelService.getAll({
      search,
      tags,
      sortBy,
      sortOrder
    });

    // 同步逻辑：强制同步、数据库为空、或检测到模型数量不一致时同步
    let shouldSync = forceSync || models.length === 0;
    
    // 如果不是强制同步且数据库有数据，检查是否需要智能同步
    if (!shouldSync && models.length > 0) {
      try {
        const ollamaClient = new OllamaClient();
        const ollamaModels = await ollamaClient.getModels();
        
        // 如果Ollama中的模型数量与数据库中的不一致，触发同步
        if (ollamaModels.length !== models.length) {
          shouldSync = true;
          console.log(`检测到模型数量不一致：Ollama(${ollamaModels.length}) vs 数据库(${models.length})，触发同步`);
        }
      } catch (error) {
        console.warn('检查Ollama模型数量失败，跳过智能同步:', error);
      }
    }
    
    if (shouldSync) {
      try {
        const ollamaClient = new OllamaClient();
        const ollamaModels = await ollamaClient.getModels();
        await CustomModelService.syncWithOllama(ollamaModels);
        
        // 重新获取同步后的模型列表
        models = CustomModelService.getAll({
          search,
          tags,
          sortBy,
          sortOrder
        });
        
        console.log(`Ollama模型同步成功，共同步 ${ollamaModels.length} 个模型`);
      } catch (error) {
        console.warn('Ollama同步失败，使用数据库数据:', error);
        // 继续使用数据库中的数据
      }
    }

    return NextResponse.json({ 
      success: true, 
      models
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