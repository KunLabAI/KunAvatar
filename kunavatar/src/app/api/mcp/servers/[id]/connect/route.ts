import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import { getDatabasePath } from '@/lib/database/db-path';

const dbPath = getDatabasePath();

// POST /api/mcp/servers/[id]/connect - 连接服务器
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const serverId = parseInt(id);
    const db = new Database(dbPath);

    try {
      const getServer = db.prepare('SELECT * FROM mcp_servers WHERE id = ?');
      const server: any = getServer.get(serverId);

      if (!server) {
        return NextResponse.json({ error: '服务器不存在' }, { status: 404 });
      }

      // 模拟连接过程（70% 成功率）
      const isConnected = Math.random() > 0.3;
      const newStatus = isConnected ? 'connected' : 'error';
      const errorMessage = isConnected ? null : '连接失败：无法建立连接';
      const lastConnectedAt = isConnected ? new Date().toISOString() : null;

      const updateStmt = db.prepare(`
        UPDATE mcp_servers SET
          status = ?,
          error_message = ?,
          last_connected_at = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      updateStmt.run(newStatus, errorMessage, lastConnectedAt, serverId);

      if (isConnected) {
        const mockTools = [
          {
            name: 'list_files',
            description: '列出目录中的文件',
            input_schema: JSON.stringify({
              type: 'object',
              properties: {
                path: { type: 'string', description: '目录路径' }
              },
              required: ['path']
            })
          },
          {
            name: 'read_file',
            description: '读取文件内容',
            input_schema: JSON.stringify({
              type: 'object',
              properties: {
                path: { type: 'string', description: '文件路径' }
              },
              required: ['path']
            })
          }
        ];

        db.prepare('DELETE FROM mcp_tools WHERE server_id = ?').run(serverId);

        const insertTool = db.prepare(`
          INSERT INTO mcp_tools (server_id, name, description, input_schema)
          VALUES (?, ?, ?, ?)
        `);
        for (const tool of mockTools) {
          insertTool.run(serverId, tool.name, tool.description, tool.input_schema);
        }

        const updatedServer = getServer.get(serverId);
        const tools = db.prepare('SELECT * FROM mcp_tools WHERE server_id = ?').all(serverId);
        return NextResponse.json({ server: updatedServer, tools });
      } else {
        const updatedServer = getServer.get(serverId);
        return NextResponse.json({ server: updatedServer, tools: [] }, { status: 400 });
      }
    } finally {
      db.close();
    }
  } catch (error) {
    console.error('连接服务器失败:', error);
    return NextResponse.json(
      { error: '连接服务器失败' },
      { status: 500 }
    );
  }
}