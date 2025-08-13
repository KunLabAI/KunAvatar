import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import { getDatabasePath } from '@/lib/database/db-path';

const dbPath = getDatabasePath();

// DELETE /api/mcp/servers/[id] - 删除服务器
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const serverId = parseInt(id);
    const db = new Database(dbPath);
    try {
      db.prepare('DELETE FROM mcp_tools WHERE server_id = ?').run(serverId);
      const result = db.prepare('DELETE FROM mcp_servers WHERE id = ?').run(serverId);
      if (result.changes === 0) {
        return NextResponse.json({ error: '服务器不存在' }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    } finally {
      db.close();
    }
  } catch (error) {
    console.error('删除服务器失败:', error);
    return NextResponse.json(
      { error: '删除服务器失败' },
      { status: 500 }
    );
  }
}

// PUT /api/mcp/servers/[id] - 更新服务器
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const serverId = parseInt(id);
    const serverData = await request.json();
    const {
      name,
      display_name,
      description,
      type,
      enabled,
      command,
      args,
      working_directory,
      url,
      base_url,
      port,
      path: serverPath,
      protocol,
      headers,
      auth_type,
      auth_config,
      timeout_ms,
      retry_attempts,
      retry_delay_ms,
      extra_config,
      status,
      error_message
    } = serverData;

    const db = new Database(dbPath);
    try {
      const updateStmt = db.prepare(`
        UPDATE mcp_servers SET
          name = ?, display_name = ?, description = ?, type = ?, enabled = ?,
          command = ?, args = ?, working_directory = ?, url = ?, base_url = ?,
          port = ?, path = ?, protocol = ?, headers = ?, auth_type = ?,
          auth_config = ?, timeout_ms = ?, retry_attempts = ?, retry_delay_ms = ?,
          extra_config = ?, status = ?, error_message = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      const result = updateStmt.run(
        name, display_name, description, type, enabled,
        command, args, working_directory, url, base_url,
        port, serverPath, protocol, headers, auth_type,
        auth_config, timeout_ms, retry_attempts, retry_delay_ms,
        extra_config, status, error_message, serverId
      );

      if (result.changes === 0) {
        return NextResponse.json({ error: '服务器不存在' }, { status: 404 });
      }

      const row = db.prepare('SELECT * FROM mcp_servers WHERE id = ?').get(serverId);
      return NextResponse.json(row);
    } finally {
      db.close();
    }
  } catch (error) {
    console.error('更新服务器失败:', error);
    return NextResponse.json(
      { error: '更新服务器失败' },
      { status: 500 }
    );
  }
}