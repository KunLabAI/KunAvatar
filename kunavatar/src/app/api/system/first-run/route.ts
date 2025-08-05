import { NextResponse } from 'next/server';
import { userOperations } from '@/lib/database';

export async function GET() {
  try {
    // 检查是否有用户存在
    const stats = userOperations.getStats() as { total_users: number };
    const isFirstRun = stats.total_users === 0;

    return NextResponse.json({
      success: true,
      isFirstRun,
      message: isFirstRun ? '系统首次运行' : '系统已初始化'
    });
  } catch (error) {
    console.error('检查首次运行状态失败:', error);
    return NextResponse.json({
      success: false,
      error: '检查首次运行状态失败',
      message: (error as Error).message
    }, { status: 500 });
  }
}