import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('avatar') as File;
    
    if (!file) {
      return NextResponse.json({ error: '没有找到文件' }, { status: 400 });
    }
    
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: '只支持图片文件' }, { status: 400 });
    }
    
    // 验证文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: '文件大小不能超过5MB' }, { status: 400 });
    }
    
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // 确保upload目录存在 - 兼容Electron环境
    const uploadDir = join(process.cwd(), 'public', 'upload');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    
    // 生成唯一文件名
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `avatar_${timestamp}.${extension}`;
    const filepath = join(uploadDir, filename);
    
    // 保存文件
    await writeFile(filepath, buffer);
    
    // 返回文件URL - 在Electron环境下使用API路由
    const staticUrl = `/upload/${filename}`;
    const apiUrl = `/api/upload/${filename}`;
    
    // 为Electron环境提供base64备选方案
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;
    
    return NextResponse.json({ 
      url: staticUrl,
      apiUrl, // API路由URL，用于Electron环境
      base64, // 提供base64作为备选
      filename 
    });
  } catch (error) {
    console.error('头像上传失败:', error);
    return NextResponse.json({ error: '上传失败' }, { status: 500 });
  }
}