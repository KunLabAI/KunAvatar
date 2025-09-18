import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, message: '没有找到上传的文件' },
        { status: 400 }
      );
    }

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, message: '只支持图片文件上传' },
        { status: 400 }
      );
    }

    // 验证文件大小 (限制为 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: '文件大小不能超过 10MB' },
        { status: 400 }
      );
    }

    // 生成唯一文件名
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${timestamp}_${randomString}.${fileExtension}`;

    // 确保上传目录存在
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'images');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // 保存文件
    const filePath = join(uploadDir, fileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // 返回文件URL
    const fileUrl = `/uploads/images/${fileName}`;
    
    // 根据Vditor文档，返回简单的JSON格式，包含图片URL
    // Vditor默认期望的格式是 {"data": {"succMap": {"filename": "url"}}}
    return NextResponse.json({
      data: {
        errFiles: [],
        succMap: {
          [fileName]: fileUrl
        }
      }
    });

  } catch (error) {
    console.error('图片上传失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// 支持 GET 请求用于健康检查
export async function GET() {
  return NextResponse.json({
    success: true,
    message: '图片上传API正常运行'
  });
}