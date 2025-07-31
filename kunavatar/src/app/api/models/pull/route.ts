import { NextRequest, NextResponse } from 'next/server';
import { withAuth, canAccessResource, AuthenticatedRequest } from '@/lib/middleware/auth';
import { getUserOllamaClient } from '@/lib/ollama';

export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    // 检查权限
    if (!canAccessResource(request.user!.permissions, 'models', 'create')) {
      return NextResponse.json({
        success: false,
        error: '权限不足',
      }, { status: 403 });
    }

    const { model, insecure = false } = await request.json();

    if (!model) {
      return NextResponse.json({
        success: false,
        error: '模型名称不能为空',
      }, { status: 400 });
    }

    // 获取用户特定的 Ollama 客户端
    const ollamaClient = getUserOllamaClient(request.user!.id);
    const ollamaBaseUrl = ollamaClient.getBaseUrl();

    // 创建流式响应
    let isClosed = false;
    let isAborted = false;
    let abortController: AbortController;

    const stream = new ReadableStream({
      async start(controller) {
        abortController = new AbortController();
        
        const safeEnqueue = (data: string) => {
          if (isClosed || isAborted) {
            return false;
          }
          
          try {
            controller.enqueue(new TextEncoder().encode(data));
            return true;
          } catch (error) {
            // 检查是否是控制器已关闭的错误
            if (error instanceof TypeError && error.message.includes('Controller is already closed')) {
              console.log('流控制器已关闭，停止写入数据');
            } else {
              console.warn('流已关闭，无法写入数据:', error);
            }
            isClosed = true;
            return false;
          }
        };

        const safeClose = () => {
          if (isClosed || isAborted) {
            return;
          }
          
          try {
            controller.close();
            isClosed = true;
          } catch (error) {
            // 检查是否是控制器已关闭的错误
            if (error instanceof TypeError && error.message.includes('Controller is already closed')) {
              console.log('流控制器已经关闭');
            } else {
              console.warn('关闭流时出错:', error);
            }
            isClosed = true;
          }
        };

        // 监听客户端断开连接
        const checkAborted = () => {
          if (abortController.signal?.aborted) {
            isAborted = true;
            abortController.abort();
            return true;
          }
          return false;
        };

        try {
          const response = await fetch(`${ollamaBaseUrl}/api/pull`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              insecure,
              stream: true,
            }),
            signal: abortController.signal,
          });

          if (checkAborted()) return;

          if (!response.ok) {
            const errorText = await response.text();
            safeEnqueue(JSON.stringify({
              error: `拉取模型失败: ${response.status} ${errorText}`,
              done: true
            }) + '\n');
            safeClose();
            return;
          }

          if (!response.body) {
            safeEnqueue(JSON.stringify({
              error: '响应体为空',
              done: true
            }) + '\n');
            safeClose();
            return;
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          try {
            while (true) {
              if (checkAborted()) {
                break;
              }

              const { done, value } = await reader.read();
              
              if (done || checkAborted()) {
                break;
              }

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              
              // 保留最后一行（可能不完整）
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (checkAborted()) break;
                
                const trimmedLine = line.trim();
                if (trimmedLine) {
                  try {
                    const data = JSON.parse(trimmedLine);
                    // 转发数据到客户端
                    safeEnqueue(JSON.stringify(data) + '\n');
                    
                    // 如果收到完成标志，结束流
                    if (data.status === 'success' || data.error) {
                      safeClose();
                      return;
                    }
                  } catch (parseError) {
                    console.warn('解析JSON失败:', parseError, '原始数据:', trimmedLine);
                  }
                }
              }
            }

            // 处理缓冲区中剩余的数据
            if (buffer.trim() && !checkAborted()) {
              try {
                const data = JSON.parse(buffer.trim());
                safeEnqueue(JSON.stringify(data) + '\n');
              } catch (parseError) {
                console.warn('解析最后的JSON失败:', parseError);
              }
            }

            if (!isAborted) {
              safeClose();
            }
          } finally {
            try {
              reader.releaseLock();
            } catch (error) {
              console.warn('释放reader锁失败:', error);
            }
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            console.log('拉取请求已被取消');
            isAborted = true;
            return;
          }
          
          console.error('拉取模型时出错:', error);
          if (!isAborted) {
            safeEnqueue(JSON.stringify({
              error: error instanceof Error ? error.message : '拉取模型失败',
              done: true
            }) + '\n');
            safeClose();
          }
        }
      },
      
      cancel() {
        console.log('客户端取消了流');
        isAborted = true;
        isClosed = true;
        try {
          abortController.abort();
        } catch (error) {
          console.warn('取消请求时出错:', error);
        }
      }
    });

    const response = new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

    // 将 Response 转换为 NextResponse
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });

  } catch (error) {
    console.error('处理拉取请求时出错:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '处理请求失败',
    }, { status: 500 });
  }
});