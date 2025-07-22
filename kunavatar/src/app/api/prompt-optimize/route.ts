import { NextRequest, NextResponse } from 'next/server';
import { userSettingOperations, userOperations } from '@/lib/database';
import { withAuth, canAccessResource, AuthenticatedRequest } from '@/lib/middleware/auth';
import { getUserOllamaClient } from '@/lib/ollama';

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

    // 从数据库获取系统提示词
    const defaultSystemPrompt = `提示词优化任务：

将用户的简单提示词转化为详细、具体的提示词。

要求：
- 只输出优化后的提示词
- 不要任何解释或前缀
- 保持用户核心意图
- 不要使用思考模式，直接输出结果

示例：
用户："写一个故事"
优化后：
请创作一个引人入胜的短篇故事，要求：
1. 故事长度：800-1200字
2. 包含开头、发展、高潮、结尾
3. 创造有深度的角色和内心冲突
4. 使用生动的描写和自然对话
5. 传递积极向上的价值观
6. 适合成年读者阅读

现在优化用户的提示词：`;
    
    // 获取第一个用户的提示词优化设置
    const users = userOperations.getAll();
    const firstUserId = users.length > 0 ? users[0].id : null;
    
    let systemPrompt = defaultSystemPrompt;
    if (firstUserId) {
      const userPrompt = userSettingOperations.getValue(
        firstUserId,
        'prompt_optimize_system_prompt',
        'prompt_optimize'
      );
      if (userPrompt) {
        systemPrompt = userPrompt;
      }
    }

    console.log('发送到Ollama的请求:', {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text.trim() }
      ],
      stream: false,
      think: false,
      options: {
        temperature: 0.7, // 进一步降低温度，提高一致性
      }
    });

    // 调用Ollama API进行优化
    const ollamaResponse = await fetch(`${ollamaBaseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: text.trim(),
          },
        ],
        stream: false,
        think: false,
        options: {
          temperature: 0.7,
          num_predict: 2048,
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
    console.log('Ollama响应:', ollamaData);
    
    if (!ollamaData.message?.content) {
      console.error('模型返回空响应，完整响应:', ollamaData);
      return NextResponse.json(
        { success: false, error: '模型返回空响应，请检查模型是否正常工作' },
        { status: 500 }
      );
    }

    let optimizedText = ollamaData.message.content.trim();
    
    // 如果优化后的文本为空，返回错误
    if (!optimizedText) {
      console.error('优化后的文本为空，原始响应:', ollamaData.message.content);
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