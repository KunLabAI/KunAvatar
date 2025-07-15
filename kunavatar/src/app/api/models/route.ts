import { NextResponse } from 'next/server';
import { ollamaClient } from '../../../lib/ollama';
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
    // 检查Ollama服务是否可用
    const isAvailable = await ollamaClient.isAvailable();
    if (!isAvailable) {
      const ollamaHost = process.env.OLLAMA_HOST || 'localhost';
      const ollamaPort = process.env.OLLAMA_PORT || '11434';
      return NextResponse.json(
        { 
          error: 'Ollama服务不可用',
          message: `请确保Ollama正在运行并监听在${ollamaHost}:${ollamaPort}端口`
        },
        { status: 503 }
      );
    }

    // 获取模型列表
    const models = await ollamaClient.getModels();
    
    return NextResponse.json({
      success: true,
      models: models.map(model => ({
        name: model.name,
        model: model.model,
        size: model.size,
        modified_at: model.modified_at,
        details: model.details,
        // 添加格式化的信息
        displayName: model.name.split(':')[0],
        formattedSize: formatModelSize(model.size),
        parameterSize: model.details.parameter_size,
        quantization: model.details.quantization_level,
      }))
    });
  } catch (error) {
    console.error('获取模型列表失败:', error);
    
    return NextResponse.json(
      { 
        error: '获取模型列表失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}, { required: true });

// 格式化模型大小的辅助函数
function formatModelSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}