import { NextRequest, NextResponse } from 'next/server';
import { dbOperations } from '../../../../../lib/database';
import { ollamaClient } from '../../../../../lib/ollama';
import { withAuth } from '../../../../../lib/middleware/auth';

export const POST = withAuth(async (
  request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const userId = request.user!.id;
    const { id } = await params;
    const conversationId = id;
    
    if (!conversationId) {
      return NextResponse.json(
        { error: '无效的对话ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { model }: { model: string } = body;

    if (!model) {
      return NextResponse.json(
        { error: '缺少模型参数' },
        { status: 400 }
      );
    }

    // 检查对话是否存在且用户有权限
    const conversation = dbOperations.getConversationByIdAndUserId(conversationId, userId);
    if (!conversation) {
      return NextResponse.json(
        { error: '对话不存在或无权限访问' },
        { status: 404 }
      );
    }

    // 获取对话的前两轮消息（验证用户权限）
    const messages = dbOperations.getMessagesByConversationIdAndUserId(conversationId, userId);
    if (messages.length < 2) {
      return NextResponse.json(
        { error: '消息数量不足，无法生成标题' },
        { status: 400 }
      );
    }

    // 筛选出前两轮对话（用户问题 + 助手回答）
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    
    if (userMessages.length === 0 || assistantMessages.length === 0) {
      return NextResponse.json(
        { error: '缺少有效的对话内容' },
        { status: 400 }
      );
    }

    // 构建对话内容
    const firstUserMessage = userMessages[0];
    const firstAssistantMessage = assistantMessages[0];
    
    // 清理助手消息中的思考标签
    const cleanAssistantContent = firstAssistantMessage.content
      .replace(/<think>[\s\S]*?<\/think>/g, '') // 移除<think>标签及其内容
      .replace(/<think>[\s\S]*$/g, '') // 移除未闭合的<think>标签
      .trim();
    
    const conversationContent = `用户: ${firstUserMessage.content}\n\n助手: ${cleanAssistantContent}`;

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

    try {
      // 调用模型生成标题
      const response = await ollamaClient.chat({
        model,
        messages: [
          {
            role: 'user',
            content: `请根据以下对话内容，生成一个简洁、准确的对话标题。\n\n要求：\n- 长度控制在10-20个字符\n- 体现对话的核心主题\n- 使用中文\n- 不要包含标点符号\n- 直接返回标题，不要其他内容\n\n对话内容：\n${conversationContent}`
          }
        ],
        stream: false,
        options: {
        }
      });

      let generatedTitle = response.message?.content?.trim() || '';
      
      // 清理生成的标题
      generatedTitle = generatedTitle
        .replace(/<think>[\s\S]*?<\/think>/g, '') // 移除<think>标签及其内容
        .replace(/<think>[\s\S]*$/g, '') // 移除未闭合的<think>标签
        .replace(/["'`]/g, '') // 移除引号
        .replace(/[。！？：；，]/g, '') // 移除中文标点
        .replace(/[.!?:;,]/g, '') // 移除英文标点
        .trim();

      // 限制标题长度
      if (generatedTitle.length > 20) {
        generatedTitle = generatedTitle.substring(0, 20);
      }

      // 如果生成的标题为空或过短，使用默认标题
      if (!generatedTitle || generatedTitle.length < 2) {
        generatedTitle = `对话 - ${new Date().toLocaleString('zh-CN', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}`;
      }

      // 更新数据库中的对话标题（验证用户权限）
      dbOperations.updateConversationTitleByUserAndId(conversationId, userId, generatedTitle);

      return NextResponse.json({
        success: true,
        title: generatedTitle
      });

    } catch (modelError: any) {
      console.error('模型调用失败:', modelError);
      return NextResponse.json(
        { 
          error: '标题生成失败',
          message: modelError.message || '模型调用出错'
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('生成标题时发生错误:', error);
    return NextResponse.json(
      {
        error: '服务器内部错误',
        message: error.message || '未知错误'
      },
      { status: 500 }
    );
  }
});