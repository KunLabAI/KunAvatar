import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * 处理上传文件的静态访问
 * 这个API路由用于在生产环境中提供上传文件的访问
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const resolvedParams = await params;
    const filePath = resolvedParams.path.join('/');
    const fullPath = join(process.cwd(), 'public', 'uploads', filePath);
    
    // 检查文件是否存在
    if (!existsSync(fullPath)) {
      return new NextResponse('File not found', { status: 404 });
    }
    
    // 读取文件
    const fileBuffer = await readFile(fullPath);
    
    // 根据文件扩展名设置正确的Content-Type
    const ext = filePath.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg';
        break;
      case 'png':
        contentType = 'image/png';
        break;
      case 'gif':
        contentType = 'image/gif';
        break;
      case 'webp':
        contentType = 'image/webp';
        break;
      case 'svg':
        contentType = 'image/svg+xml';
        break;
    }
    
    // 返回文件内容
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // 缓存一年
      },
    });
    
  } catch (error) {
    console.error('读取上传文件失败:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}