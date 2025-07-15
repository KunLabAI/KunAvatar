import { NextResponse } from 'next/server';

// 处理Chrome DevTools的请求，避免404警告
export async function GET() {
  return NextResponse.json({
    // 返回空的配置，表示没有特殊的DevTools配置
    version: "1.0",
    description: "Kun Avatar - No special DevTools configuration"
  }, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600' // 缓存1小时
    }
  });
}