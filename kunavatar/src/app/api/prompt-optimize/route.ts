import { NextRequest, NextResponse } from 'next/server';
import { userSettingOperations, userOperations } from '@/lib/database';
import { withAuth, canAccessResource, AuthenticatedRequest } from '@/lib/middleware/auth';
import { getUserOllamaClient } from '@/lib/ollama';
import defaultPrompts from '@/config/default-prompts.json';

export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    // 检查用户是否已认证
    if (!request.user) {
      return NextResponse.json({
        success: false,
        error: '用户未认证',
      }, { status: 401 });
    }

    // 检查权限
    if (!canAccessResource(request.user.permissions, 'models', 'read')) {
      return NextResponse.json({
        success: false,
        error: '权限不足',
      }, { status: 403 });
    }
    
    const { text, model } = await request.json();
    
    console.log('提示词优化请求:', { text, model });
    
    if (!text?.trim()) {
      return NextResponse.json(
        { success: false, error: '提示词内容不能为空' },
        { status: 400 }
      );
    }

    if (!model) {
      return NextResponse.json(
        { success: false, error: '未指定优化模型' },
        { status: 400 }
      );
    }

    // 获取用户特定的 Ollama 客户端
    const ollamaClient = getUserOllamaClient(request.user!.id);
    const ollamaBaseUrl = ollamaClient.getBaseUrl();

    // 首先检查模型是否可用
    try {
      const modelCheckResponse = await fetch(`${ollamaBaseUrl}/api/tags`);
      if (!modelCheckResponse.ok) {
        throw new Error('无法连接到Ollama服务');
      }
      
      const modelList = await modelCheckResponse.json();
      const availableModels = modelList.models || [];
      const modelExists = availableModels.some((m: any) => m.name === model);
      
      if (!modelExists) {
        console.error('模型不存在:', model, '可用模型:', availableModels.map((m: any) => m.name));
        return NextResponse.json(
          { success: false, error: `模型 "${model}" 不存在，请检查模型名称是否正确` },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('检查模型可用性失败:', error);
      return NextResponse.json(
        { success: false, error: '无法连接到Ollama服务，请确保Ollama正在运行' },
        { status: 500 }
      );
    }

    // 从JSON配置文件获取默认系统提示词
    const defaultSystemPrompt = defaultPrompts.prompt_optimize_system_prompt.value;
    
    // 获取当前用户的提示词优化设置
    let systemPrompt = defaultSystemPrompt;
    try {
      const userPrompt = userSettingOperations.getValue(
        request.user!.id,
        'prompt_optimize_system_prompt',
        'prompt_optimize'
      );
      
      // 确保获取到的是有效的提示词内容，而不是键名
      if (userPrompt && userPrompt.trim() && userPrompt !== 'prompt_optimize') {
        systemPrompt = userPrompt.trim();
        console.log('使用用户自定义系统提示词:', userPrompt.substring(0, 50) + (userPrompt.length > 50 ? '...' : ''));
      } else {
        console.log('使用默认系统提示词，用户提示词无效:', userPrompt);
      }
    } catch (error) {
      console.warn('获取用户系统提示词失败，使用默认提示词:', error);
    }

    console.log('使用的系统提示词:', systemPrompt.substring(0, 100) + '...');
    console.log('发送到Ollama的请求:', {
      model,
      prompt: text.trim(),
      system: systemPrompt.substring(0, 100) + '...',
      stream: false,
      options: {
        temperature: 0.7,
      }
    });

    // 调用Ollama API进行优化
    const ollamaResponse = await fetch(`${ollamaBaseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: text.trim(),
        system: systemPrompt,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 2048,
          top_k: 40,
          top_p: 0.9,
          repeat_penalty: 1.1,
          stop: ["<|im_end|>", "<|endoftext|>"]
        },
      }),
    });

    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
      console.error('Ollama API 错误:', errorText);
      return NextResponse.json(
        { success: false, error: '模型调用失败，请检查模型是否可用' },
        { status: 500 }
      );
    }

    const ollamaData = await ollamaResponse.json();
    console.log('Ollama响应:', {
      model: ollamaData.model,
      done: ollamaData.done,
      done_reason: ollamaData.done_reason,
      response_length: ollamaData.response?.length || 0,
      response_preview: ollamaData.response?.substring(0, 100) || 'empty'
    });
    
    if (!ollamaData.response) {
      console.error('模型返回空响应，完整响应:', ollamaData);
      
      // 提供更具体的错误信息
      let errorMessage = '模型返回空响应';
      if (ollamaData.done_reason === 'stop') {
        errorMessage += '，模型可能不理解当前的提示词格式';
      } else if (ollamaData.done_reason === 'length') {
        errorMessage += '，响应被长度限制截断';
      }
      errorMessage += '。建议：1) 检查模型是否支持中文 2) 尝试更换其他模型 3) 简化输入内容';
      
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    }

    let optimizedText = ollamaData.response.trim();
    
    // 如果优化后的文本为空，返回错误
    if (!optimizedText) {
      console.error('优化后的文本为空，原始响应:', ollamaData.response);
      return NextResponse.json(
        { success: false, error: '模型生成的优化内容为空，请重试' },
        { status: 500 }
      );
    }
    
    // 移除思考标签
    optimizedText = optimizedText.replace(/<think>[\s\S]*?<\/think>/g, '');
    optimizedText = optimizedText.replace(/<thinking>[\s\S]*?<\/thinking>/g, '');
    optimizedText = optimizedText.replace(/<thought>[\s\S]*?<\/thought>/g, '');
    
    // 清理多余的空白行
    optimizedText = optimizedText.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
    
    // 如果移除思考标签后文本为空，返回错误
    if (!optimizedText) {
      console.error('移除思考标签后文本为空');
      return NextResponse.json(
        { success: false, error: '模型只生成了思考内容，请重试' },
        { status: 500 }
      );
    }
    
    console.log('优化结果:', {
      original: text.trim(),
      optimized: optimizedText
    });

    return NextResponse.json({
      success: true,
      originalText: text.trim(),
      optimizedText: optimizedText,
      model: model,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('提示词优化API错误:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '服务器内部错误' 
      },
      { status: 500 }
    );
  }
}, {
  permissions: ['models:read']
});