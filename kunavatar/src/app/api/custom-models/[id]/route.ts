import { NextRequest, NextResponse } from 'next/server';
import { CustomModelService } from '@/lib/database/custom-models';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const awaitedParams = await params;
    const id = parseInt(awaitedParams.id, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: '无效的模型ID' },
        { status: 400 }
      );
    }

    const model = CustomModelService.getById(id);
    if (!model) {
      return NextResponse.json(
        { error: '模型不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      model,
    });
  } catch (error) {
    console.error('获取自定义模型失败:', error);
    return NextResponse.json(
      {
        error: '获取模型失败',
        message: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const awaitedParams = await params;
    const id = parseInt(awaitedParams.id, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: '无效的模型ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const success = CustomModelService.update(id, body);

    if (!success) {
      return NextResponse.json(
        { error: '更新失败或没有变化' },
        { status: 400 }
      );
    }

    const model = CustomModelService.getById(id);
    return NextResponse.json({
      success: true,
      model,
    });
  } catch (error) {
    console.error('更新自定义模型失败:', error);
    return NextResponse.json(
      {
        error: '更新模型失败',
        message: error instanceof Error ? error.message : '未知错误',
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const awaitedParams = await params;
    const id = parseInt(awaitedParams.id, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: '无效的模型ID' },
        { status: 400 }
      );
    }

    // 先获取模型信息
    const model = CustomModelService.getById(id);
    if (!model) {
      return NextResponse.json(
        { error: '模型不存在' },
        { status: 404 }
      );
    }

    // 删除 Ollama 中的实际模型
    const ollamaModelName = model.base_model; // 这是我们在创建时保存的 Ollama 模型名称
    let ollamaDeleted = false;
    
    try {
      // 使用命令行删除 Ollama 模型
      const command = `ollama rm ${ollamaModelName}`;
      console.log(`执行删除命令: ${command}`);
      
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr && !stderr.includes('deleted')) {
        console.warn('Ollama 删除警告:', stderr);
      }
      
      console.log('Ollama 删除输出:', stdout);
      ollamaDeleted = true;
      
    } catch (ollamaError) {
      console.error(`删除 Ollama 模型 ${ollamaModelName} 失败:`, ollamaError);
      // 不阻止数据库删除，但记录警告
    }

    // 删除数据库记录
    const dbDeleted = CustomModelService.delete(id);
    if (!dbDeleted) {
      return NextResponse.json(
        { error: '数据库删除失败' },
        { status: 500 }
      );
    }

    const message = ollamaDeleted 
      ? '模型删除成功'
      : '数据库记录已删除，但 Ollama 模型删除失败';

    return NextResponse.json({
      success: true,
      message,
      details: {
        ollamaDeleted,
        dbDeleted
      }
    });
  } catch (error) {
    console.error('删除自定义模型失败:', error);
    return NextResponse.json(
      {
        error: '删除模型失败',
        message: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}