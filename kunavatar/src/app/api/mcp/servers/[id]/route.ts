import { NextRequest, NextResponse } from 'next/server';
import { Database } from 'sqlite3';
import path from 'path';
import { getDatabasePath } from '@/lib/database/db-path';

const dbPath = getDatabasePath();

function getDatabase() {
  return new Promise<Database>((resolve, reject) => {
    const db = new Database(dbPath, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(db);
      }
    });
  });
}

// DELETE /api/mcp/servers/[id] - 删除服务器
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const serverId = parseInt(id);
    const db = await getDatabase();
    
    return new Promise<NextResponse>((resolve, reject) => {
      // 先删除相关的工具
      db.run('DELETE FROM mcp_tools WHERE server_id = ?', [serverId], (err) => {
        if (err) {
          db.close();
          reject(err);
          return;
        }
        
        // 然后删除服务器
        db.run('DELETE FROM mcp_servers WHERE id = ?', [serverId], function(err) {
          db.close();
          
          if (err) {
            reject(err);
            return;
          }
          
          if (this.changes === 0) {
            resolve(NextResponse.json(
              { error: '服务器不存在' },
              { status: 404 }
            ));
          } else {
            resolve(NextResponse.json({ success: true }));
          }
        });
      });
    });
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
    const db = await getDatabase();
    
    return new Promise<NextResponse>((resolve, reject) => {
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
      
      db.run(`
        UPDATE mcp_servers SET
          name = ?, display_name = ?, description = ?, type = ?, enabled = ?,
          command = ?, args = ?, working_directory = ?, url = ?, base_url = ?,
          port = ?, path = ?, protocol = ?, headers = ?, auth_type = ?,
          auth_config = ?, timeout_ms = ?, retry_attempts = ?, retry_delay_ms = ?,
          extra_config = ?, status = ?, error_message = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        name, display_name, description, type, enabled,
        command, args, working_directory, url, base_url,
        port, serverPath, protocol, headers, auth_type,
        auth_config, timeout_ms, retry_attempts, retry_delay_ms,
        extra_config, status, error_message, serverId
      ], function(err) {
        if (err) {
          db.close();
          reject(err);
          return;
        }
        
        if (this.changes === 0) {
          db.close();
          resolve(NextResponse.json(
            { error: '服务器不存在' },
            { status: 404 }
          ));
          return;
        }
        
        // 获取更新后的服务器
        db.get('SELECT * FROM mcp_servers WHERE id = ?', [serverId], (err, row) => {
          db.close();
          
          if (err) {
            reject(err);
            return;
          }
          
          resolve(NextResponse.json(row));
        });
      });
    });
  } catch (error) {
    console.error('更新服务器失败:', error);
    return NextResponse.json(
      { error: '更新服务器失败' },
      { status: 500 }
    );
  }
}