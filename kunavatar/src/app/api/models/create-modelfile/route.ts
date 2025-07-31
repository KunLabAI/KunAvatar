import { NextResponse } from 'next/server';
import { OllamaClient, getUserOllamaClient } from '@/lib/ollama';
import { CustomModelService } from '@/lib/database/custom-models';
import { withAuth, canAccessResource, AuthenticatedRequest } from '@/lib/middleware/auth';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

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
    const { modelName, metadata } = body;
    let { modelfile } = body;

    if (!modelName || !modelfile || !metadata?.display_name) {
      return NextResponse.json(
        { error: '模型信息和 Modelfile 内容不能为空' },
        { status: 400 }
      );
    }

    // 生成唯一的 Ollama 模型名称（使用哈希值确保唯一性和兼容性）
    const crypto = require('crypto');
    const timestamp = Date.now();
    const hashInput = `${metadata.display_name}-${timestamp}`;
    const modelHash = crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 12);
    const ollamaModelName = `custom-${modelHash}:latest`;

    // 检查生成的模型名称是否已存在（理论上不会，但为了安全起见）
    const existingModels = await new OllamaClient().getModels();
    const modelExists = existingModels.some(model => model.name === ollamaModelName);
    
    if (modelExists) {
      return NextResponse.json(
        { error: `内部模型名称冲突，请重试` },
        { status: 409 }
      );
    }

    // 解析和验证基础模型名称（从 FROM 指令中提取）
    const fromMatch = modelfile.match(/FROM\s+([^\s\n]+)/i);
    const baseModel = fromMatch ? fromMatch[1] : 'unknown';
    
    // 验证基础模型是否有效
    if (!baseModel || baseModel === 'unknown' || !fromMatch) {
      return NextResponse.json(
        { error: '无效的基础模型，请确保选择了有效的基础模型' },
        { status: 400 }
      );
    }

    // 初始化用户特定的 Ollama 客户端
    const ollamaClient = getUserOllamaClient(request.user!.id);

    // 检查基础模型是否存在于 Ollama 中
    try {
      const availableModels = await ollamaClient.getModels();
      const modelExists = availableModels.some(model => model.name === baseModel);
      if (!modelExists) {
        return NextResponse.json(
          { error: `基础模型 '${baseModel}' 不存在。可用模型: ${availableModels.map(m => m.name).join(', ')}` },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('检查基础模型时出错:', error);
      return NextResponse.json(
        { error: '无法验证基础模型是否存在' },
        { status: 500 }
      );
    }

    // 调试：打印 Modelfile 内容
    console.log('Generated Modelfile:', modelfile);
    console.log('Target Ollama model name:', ollamaModelName);
    console.log('当前操作系统:', os.platform());

    // 跨平台临时目录和文件路径处理
    const tempDir = path.join(process.cwd(), 'temp');
    const safeModelName = ollamaModelName.replace(/[:<>"|*?]/g, '_'); // 移除文件名中的非法字符
    const modelfilePath = path.join(tempDir, `${safeModelName}.modelfile`);

    try {
      // 确保临时目录存在
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // 写入 Modelfile 到临时文件
      fs.writeFileSync(modelfilePath, modelfile, 'utf8');
      console.log(`Modelfile 已写入: ${modelfilePath}`);

      // 跨平台命令构建和执行
      let command: string;
      const isWindows = os.platform() === 'win32';
      
      if (isWindows) {
        // Windows: 使用双引号包围参数，处理空格和特殊字符
        command = `ollama create "${ollamaModelName}" -f "${modelfilePath}"`;
      } else {
        // Unix-like systems (Linux/macOS): 使用单引号更安全
        const escapedModelName = ollamaModelName.replace(/'/g, "'\"'\"'");
        const escapedModelfilePath = modelfilePath.replace(/'/g, "'\"'\"'");
        command = `ollama create '${escapedModelName}' -f '${escapedModelfilePath}'`;
      }
      
      console.log(`执行命令: ${command}`);
      console.log('执行环境:', { platform: os.platform(), arch: os.arch() });
      
      // 设置执行选项
      const execOptions = {
        timeout: 300000, // 5分钟超时
        maxBuffer: 1024 * 1024 * 10, // 10MB缓冲区
        ...(isWindows ? { shell: 'cmd.exe' } : { shell: '/bin/bash' })
      };
      
      const { stdout, stderr } = await execAsync(command, execOptions);
      
      if (stderr && !stderr.includes('success') && !stderr.includes('manifest') && !stderr.includes('pulling')) {
        console.error('Ollama create 错误输出:', stderr);
        throw new Error(`创建模型失败: ${stderr}`);
      }
      
      console.log('Ollama create 输出:', stdout);
      if (stderr) {
        console.log('Ollama create 信息:', stderr);
      }
      console.log(`模型 ${ollamaModelName} 创建成功`);

    } catch (createError) {
      console.error('创建模型失败:', createError);
      
      // 提供更详细的错误信息
      let errorMessage = '未知错误';
      if (createError instanceof Error) {
        errorMessage = createError.message;
        
        // 检查常见错误
        if (errorMessage.includes('ENOENT')) {
          errorMessage = 'ollama命令未找到，请确保已安装ollama并添加到PATH环境变量中';
        } else if (errorMessage.includes('EACCES')) {
          errorMessage = '权限不足，请检查文件权限';
        } else if (errorMessage.includes('timeout')) {
          errorMessage = '操作超时，请检查模型大小和网络连接';
        } else if (errorMessage.includes('template error')) {
          errorMessage = '模板语法错误，请检查对话模板的语法是否正确。建议留空使用默认模板或使用简单的模板格式。';
        } else if (errorMessage.includes('unexpected')) {
          errorMessage = '模板语法错误，请检查模板中的条件语句和大括号是否正确匹配。';
        }
      }
      
      throw new Error(errorMessage);
    } finally {
      // 清理临时文件
      try {
        if (fs.existsSync(modelfilePath)) {
          fs.unlinkSync(modelfilePath);
          console.log(`已删除临时文件: ${modelfilePath}`);
        }
      } catch (cleanupError: any) {
        console.warn('清理临时文件失败:', cleanupError.message);
      }
    }

    // 获取新创建的模型详情
    let modelDetails;
    try {
      // 等待一会确保模型完全可用
      await new Promise(resolve => setTimeout(resolve, 1000));
      modelDetails = await ollamaClient.getModelDetails(ollamaModelName);
    } catch (detailsError) {
      console.warn('获取模型详细信息失败，但模型已创建:', detailsError);
      // 如果获取详细信息失败，使用默认值
      modelDetails = {
        modelfile: modelfile,
        parameters: '',
        template: '',
        details: {
          parent_model: baseModel,
          format: 'gguf',
          family: '',
          families: [],
          parameter_size: 'unknown',
          quantization_level: 'unknown'
        },
        model_info: {},
        capabilities: []
      };
    }

    // 解析模型参数
    const parameters: any = {};
    const parameterMatches = modelfile.matchAll(/PARAMETER\s+([^\s]+)\s+([^\n]+)/gi);
    for (const match of parameterMatches) {
      const [, key, value] = match;
      // 尝试解析数值
      const numValue = parseFloat(value);
      parameters[key] = isNaN(numValue) ? value.replace(/['"]/g, '') : numValue;
    }

    // 解析系统提示词
    const systemMatch = modelfile.match(/SYSTEM\s+"""([\s\S]*?)"""/i) || 
                       modelfile.match(/SYSTEM\s+"([^"]*?)"/i) ||
                       modelfile.match(/SYSTEM\s+([^\n]+)/i);
    const systemPrompt = systemMatch ? systemMatch[1].trim() : '';

    // 解析模板
    const templateMatch = modelfile.match(/TEMPLATE\s+"""([\s\S]*?)"""/i);
    const template = templateMatch ? templateMatch[1].trim() : '';

    // 解析许可证
    const licenseMatch = modelfile.match(/LICENSE\s+"""([\s\S]*?)"""/i);
    const license = licenseMatch ? licenseMatch[1].trim() : '';

    // 获取模型的真实大小 - 从Ollama tags接口获取
    const getModelSize = async (modelName: string): Promise<number> => {
      try {
        const ollamaBaseUrl = ollamaClient.getBaseUrl(); // 使用用户特定的 Ollama 地址
        const tagsResponse = await fetch(`${ollamaBaseUrl}/api/tags`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (tagsResponse.ok) {
          const tagsData = await tagsResponse.json();
          const model = tagsData.models?.find((m: any) => m.name === modelName);
          if (model && typeof model.size === 'number') {
            console.log(`获取到模型 ${modelName} 的大小: ${model.size} 字节`);
            return model.size;
          }
        }
        console.warn(`无法从tags接口获取模型 ${modelName} 的大小`);
        return 0;
      } catch (error) {
        console.error(`获取模型 ${modelName} 大小时出错:`, error);
        return 0;
      }
    };

    // 生成数据库用的模型哈希
    const dbModelHash = crypto.createHash('sha256').update(ollamaModelName).digest('hex').substring(0, 16);

    // 获取模型的真实大小
    const modelSize = await getModelSize(ollamaModelName);

    // 在数据库中保存模型信息
    const customModel = CustomModelService.create({
      base_model: ollamaModelName, // 使用新创建的模型名称
      display_name: metadata.display_name, // 用户友好的显示名称
              model_hash: dbModelHash,
      description: metadata.description || '',
      family: modelDetails.details?.family || 'unknown',
      system_prompt: systemPrompt,
      parameters: parameters,
      template: template,
      license: license,
      tags: metadata.tags || [],
      size: modelSize, // 使用从tags接口获取的真实大小
      digest: '',
      ollama_modified_at: new Date().toISOString(),
      architecture: modelDetails.model_info?.['general.architecture'] || '',
      parameter_count: modelDetails.model_info?.['general.parameter_count'] || 0,
      context_length: modelDetails.model_info?.['llama.context_length'] || 
                      modelDetails.model_info?.['gemma.context_length'] || 0,
      embedding_length: modelDetails.model_info?.['llama.embedding_length'] || 
                        modelDetails.model_info?.['gemma.embedding_length'] || 0,
      quantization_level: modelDetails.details?.quantization_level || '',
      format: modelDetails.details?.format || '',
      capabilities: modelDetails.capabilities || [],
    });

    return NextResponse.json({
      success: true,
      message: `模型 "${metadata.display_name}" 创建成功`,
      model: customModel,
      displayName: metadata.display_name,
      ollamaModelName: ollamaModelName,
    });

  } catch (error) {
    console.error('创建 Modelfile 模型失败:', error);
    
    const errorMessage = error instanceof Error ? error.message : '创建模型失败';
    
    return NextResponse.json(
      {
        success: false,
        error: '创建模型失败',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}, { required: true });