import { NextRequest, NextResponse } from 'next/server';
import * as path from 'path';
import * as os from 'os';
import { CustomModelService } from '@/lib/database/custom-models';
import { withAuth, canAccessResource, AuthenticatedRequest } from '@/lib/middleware/auth';

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
    console.log('接收到的请求数据:', JSON.stringify(body, null, 2));
    
    const { 
      display_name,
      description,
      tags,
      files,
      model_type,
      quantize
    } = body;

    // 验证必需字段
    if (!display_name) {
      return NextResponse.json(
        { 
          error: '验证失败',
          message: '模型名称不能为空',
          type: 'validation'
        },
        { status: 400 }
      );
    }

    // 验证显示名称
    const trimmedDisplayName = display_name.trim();
    if (!trimmedDisplayName) {
      return NextResponse.json(
        { 
          error: '验证失败',
          message: '模型名称不能为空',
          type: 'validation'
        },
        { status: 400 }
      );
    }
    
    if (trimmedDisplayName.length > 100) {
      return NextResponse.json(
        { 
          error: '验证失败',
          message: '模型名称过长，请保持在100个字符以内',
          type: 'validation'
        },
        { status: 400 }
      );
    }

    // 使用用户输入的显示名称作为 Ollama 模型名称
    // 清理名称，确保符合 Ollama 命名规范
    const cleanedName = trimmedDisplayName
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '_') // 替换非法字符为下划线
      .replace(/_{2,}/g, '_') // 合并多个连续下划线
      .replace(/^_+|_+$/g, ''); // 移除开头和结尾的下划线
    
    const ollamaModelName = `${cleanedName}:latest`;
    
    console.log('用户输入名称:', trimmedDisplayName);
    console.log('清理后的Ollama模型名称:', ollamaModelName);
    
    // 检查模型是否已存在
    try {
      const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
      const checkResponse = await fetch(`${ollamaBaseUrl}/api/show`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: ollamaModelName
        }),
      });
      
      if (checkResponse.ok) {
        return NextResponse.json(
          { 
            error: '模型名称冲突',
            message: `模型名称 "${ollamaModelName}" 已存在，请使用不同的名称`,
            type: 'name_conflict'
          },
          { status: 400 }
        );
      }
    } catch (checkError) {
      // 如果检查失败（模型不存在），继续创建流程
      console.log('模型名称检查完成，可以创建新模型');
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { 
          error: '验证失败',
          message: '至少需要选择一个模型文件',
          type: 'validation'
        },
        { status: 400 }
      );
    }

    // 获取主文件路径
    const mainFile = files[0];
    console.log('主文件信息:', mainFile);
    
    if (!mainFile.path) {
      return NextResponse.json(
        { 
          error: '验证失败',
          message: '文件路径不能为空',
          type: 'validation'
        },
        { status: 400 }
      );
    }
    
    // 跨平台路径处理
    let fromPath = '';
    
    if (model_type === 'gguf') {
      // 对于GGUF文件，直接使用文件路径
      fromPath = path.normalize(mainFile.path);
    } else {
      // 对于Safetensors，使用目录路径
      const filePath = path.normalize(mainFile.path);
      fromPath = path.dirname(filePath);
    }

    console.log('使用文件路径:', fromPath);
    console.log('当前操作系统:', os.platform());
    
    if (!fromPath) {
      return NextResponse.json(
        { 
          error: '路径处理失败',
          message: '无法确定有效的文件路径',
          type: 'file_error'
        },
        { status: 400 }
      );
    }

    // 检查文件是否存在（仅在服务器端可行的情况下）
    try {
      const fs = require('fs').promises;
      await fs.access(fromPath);
    } catch (accessError) {
      return NextResponse.json(
        { 
          error: '文件不存在',
          message: `指定的文件路径不存在或无法访问: ${fromPath}`,
          type: 'file_error'
        },
        { status: 400 }
      );
    }

    // 构建Modelfile内容 - 仅使用FROM指令导入模型文件
    // 这样可以保留原模型的系统提示词、模板和参数配置
    let modelfileContent = `FROM "${fromPath}"\n`;

    console.log('生成的Modelfile内容:');
    console.log(modelfileContent);

    // 跨平台命令执行
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const fs = require('fs').promises;
      const execAsync = util.promisify(exec);

      // 创建临时Modelfile，使用跨平台路径
      const tempDir = os.tmpdir();
      const tempModelfile = path.join(tempDir, `modelfile_${Date.now()}.txt`);
      
      console.log('临时文件路径:', tempModelfile);
      await fs.writeFile(tempModelfile, modelfileContent, 'utf8');

      // 跨平台命令构建 - 使用清理后的模型名称
      let command: string;
      const isWindows = os.platform() === 'win32';
      
      if (isWindows) {
        // Windows: 使用双引号包围参数，处理空格和特殊字符
        command = `ollama create "${ollamaModelName}" -f "${tempModelfile}"`;
      } else {
        // Unix-like systems (Linux/macOS): 使用单引号更安全
        const escapedModelName = ollamaModelName.replace(/'/g, "'\"'\"'");
        const escapedTempFile = tempModelfile.replace(/'/g, "'\"'\"'");
        command = `ollama create '${escapedModelName}' -f '${escapedTempFile}'`;
      }
      
      console.log('执行命令:', command);
      console.log('执行环境:', { platform: os.platform(), arch: os.arch() });
      
      // 设置执行选项
      const execOptions = {
        timeout: 300000, // 5分钟超时
        maxBuffer: 1024 * 1024 * 10, // 10MB缓冲区
        ...(isWindows ? { shell: 'cmd.exe' } : { shell: '/bin/bash' })
      };
      
      const { stdout, stderr } = await execAsync(command, execOptions);
      
      if (stderr && !stderr.includes('manifest') && !stderr.includes('pulling') && !stderr.includes('success')) {
        console.error('Ollama命令错误:', stderr);
        // 清理临时文件
        await fs.unlink(tempModelfile).catch(() => {});
        
        // 分析具体错误类型
        let errorType = 'ollama_error';
        let userMessage = stderr;
        
        if (stderr.includes('invalid model name')) {
          errorType = 'name_conflict';
          userMessage = '模型名称已存在或格式不正确，请尝试使用不同的名称';
        } else if (stderr.includes('file not found') || stderr.includes('no such file')) {
          errorType = 'file_error';
          userMessage = '指定的模型文件未找到，请检查文件路径是否正确';
        } else if (stderr.includes('permission denied')) {
          errorType = 'permission_error';
          userMessage = '权限不足，请检查文件访问权限';
        } else if (stderr.includes('disk space') || stderr.includes('no space')) {
          errorType = 'storage_error';
          userMessage = '磁盘空间不足，请清理磁盘空间后重试';
        }
        
        return NextResponse.json(
          { 
            error: '模型创建失败',
            message: userMessage,
            type: errorType,
            details: stderr
          },
          { status: 500 }
        );
      }

      console.log('Ollama命令输出:', stdout);
      if (stderr) {
        console.log('Ollama命令信息:', stderr);
      }

      // 清理临时文件
      await fs.unlink(tempModelfile).catch((err: Error) => {
        console.warn('清理临时文件失败:', err.message);
      });

    } catch (error) {
      console.error('执行ollama命令失败:', error);
      
      // 提供更详细的错误信息
      let errorType = 'system_error';
      let errorMessage = '未知错误';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // 检查常见错误
        if (errorMessage.includes('ENOENT')) {
          errorType = 'ollama_not_found';
          errorMessage = 'Ollama 未安装或未正确配置，请确保 Ollama 已安装并添加到环境变量中';
        } else if (errorMessage.includes('EACCES')) {
          errorType = 'permission_error';
          errorMessage = '权限不足，请以管理员身份运行或检查文件权限';
        } else if (errorMessage.includes('timeout')) {
          errorType = 'timeout_error';
          errorMessage = '操作超时，这可能是由于文件过大或网络问题导致的';
        } else if (errorMessage.includes('Command failed')) {
          errorType = 'command_error';
          errorMessage = 'Ollama 命令执行失败，请检查模型文件格式和路径';
        }
      }
      
      return NextResponse.json(
        { 
          error: '系统错误',
          message: errorMessage,
          type: errorType
        },
        { status: 500 }
      );
    }

    console.log('模型创建命令执行完成');

    // 获取模型详细信息
    let modelDetails = null;
    try {
      const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
      const showResponse = await fetch(`${ollamaBaseUrl}/api/show`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: ollamaModelName
        }),
      });

      if (showResponse.ok) {
        modelDetails = await showResponse.json();
      }
    } catch (detailsError) {
      console.warn('获取模型详情失败:', detailsError);
    }

    // 保存模型信息到数据库
    try {
      const modelData = {
        base_model: ollamaModelName, // Ollama 使用的模型名称
        display_name: trimmedDisplayName, // 用户友好的显示名称
        model_hash: ollamaModelName, // 使用模型名称作为哈希值
        family: 'custom', // 自定义模型
        description: description || `从文件创建的自定义模型: ${trimmedDisplayName}`,
        system_prompt: '',
        parameters: {},
        tags: tags || [],
        template: '',
        license: '',
        size: 0, // 文件大小暂时设为0
        digest: '', // 摘要暂时为空
        ollama_modified_at: undefined, // 自定义模型没有Ollama修改时间
        // 从模型详情中获取的信息
        architecture: modelDetails?.details?.architecture || 'unknown',
        parameter_count: modelDetails?.details?.parameter_count || 0,
        context_length: 2048,
        embedding_length: 0,
        quantization_level: quantize || '',
        format: model_type || 'gguf',
        capabilities: [],
      };

      console.log('保存到数据库的模型数据:', modelData);

      // 创建模型记录
      const createdModel = CustomModelService.create(modelData);
      console.log('模型已保存到数据库:', createdModel);

      return NextResponse.json({
        success: true,
        message: '模型创建成功',
        model: {
          id: createdModel.id,
          name: ollamaModelName, // Ollama 模型名称
          display_name: trimmedDisplayName, // 用户友好的显示名称
          original_name: trimmedDisplayName,
          description: modelData.description,
          tags: modelData.tags,
          model_type,
          created_from: 'file_path',
          file_paths: files.map((f: any) => f.path),
          details: modelDetails,
          quantize
        }
      });

    } catch (dbError) {
      console.error('保存模型到数据库失败:', dbError);
      
      return NextResponse.json({
        success: true,
        message: '模型创建成功（但数据库保存失败）',
        model: {
          name: ollamaModelName,
          display_name: trimmedDisplayName,
          original_name: trimmedDisplayName,
          description,
          tags,
          model_type,
          created_from: 'file_path',
          file_paths: files.map((f: any) => f.path),
          details: modelDetails,
          quantize
        }
      });
    }

  } catch (error) {
    console.error('创建模型错误:', error);
    
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      { 
        error: '服务器内部错误',
        message: '服务器处理请求时发生错误，请稍后重试',
        type: 'server_error',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}, {
  permissions: ['models:create']
});