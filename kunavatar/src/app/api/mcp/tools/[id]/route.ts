import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import { getDatabasePath } from '@/lib/database/db-path';

const dbPath = getDatabasePath();

/**
 * PUT /api/mcp/tools/[id] - 更新工具状态
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const toolId = parseInt(id);
    const { enabled } = await request.json();
    
    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled字段必须是布尔值' },
        { status: 400 }
      );
    }
    
    const db = new Database(dbPath);
    
    try {
      // 更新工具的enabled状态
      const result = db.prepare(`
        UPDATE mcp_tools 
        SET enabled = ?, updated_at = datetime('now') 
        WHERE id = ?
      `).run(enabled ? 1 : 0, toolId);
      
      if (result.changes === 0) {
        return NextResponse.json(
          { error: '工具不存在' },
          { status: 404 }
        );
      }
      
      // 获取更新后的工具信息
      const tool = db.prepare(`
        SELECT t.*, s.name as server_name, s.status as server_status
        FROM mcp_tools t
        LEFT JOIN mcp_servers s ON t.server_id = s.id
        WHERE t.id = ?
      `).get(toolId);
      
      return NextResponse.json({
        success: true,
        tool
      });
      
    } finally {
      db.close();
    }
    
  } catch (error) {
    console.error('更新工具状态失败:', error);
    return NextResponse.json(
      { error: '更新工具状态失败' },
      { status: 500 }
    );
  }
}