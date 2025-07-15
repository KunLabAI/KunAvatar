import { NextRequest, NextResponse } from 'next/server';
import { Database } from 'sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'chat.db');

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

// POST /api/mcp/servers/[id]/connect - 连接服务器
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const serverId = parseInt(id);
    const db = await getDatabase();
    
    return new Promise<NextResponse>((resolve, reject) => {
      // 首先获取服务器信息
      db.get('SELECT * FROM mcp_servers WHERE id = ?', [serverId], (err, server: any) => {
        if (err) {
          db.close();
          reject(err);
          return;
        }
        
        if (!server) {
          db.close();
          resolve(NextResponse.json(
            { error: '服务器不存在' },
            { status: 404 }
          ));
          return;
        }
        
        // 模拟连接过程
        // 在实际实现中，这里应该根据服务器类型进行真实的连接
        const isConnected = Math.random() > 0.3; // 70% 成功率模拟
        const newStatus = isConnected ? 'connected' : 'error';
        const errorMessage = isConnected ? null : '连接失败：无法建立连接';
        
        // 更新服务器状态
        db.run(`
          UPDATE mcp_servers SET
            status = ?,
            error_message = ?,
            last_connected_at = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
          newStatus,
          errorMessage,
          isConnected ? new Date().toISOString() : null,
          serverId
        ], function(err) {
          if (err) {
            db.close();
            reject(err);
            return;
          }
          
          // 如果连接成功，模拟添加一些工具
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
            
            // 先删除旧的工具
            db.run('DELETE FROM mcp_tools WHERE server_id = ?', [serverId], (err) => {
              if (err) {
                db.close();
                reject(err);
                return;
              }
              
              // 插入新工具
              const insertTool = (tool: any, callback: () => void) => {
                db.run(`
                  INSERT INTO mcp_tools (server_id, name, description, input_schema)
                  VALUES (?, ?, ?, ?)
                `, [serverId, tool.name, tool.description, tool.input_schema], callback);
              };
              
              let completed = 0;
              const total = mockTools.length;
              
              if (total === 0) {
                // 获取更新后的服务器信息
                db.get('SELECT * FROM mcp_servers WHERE id = ?', [serverId], (err, updatedServer) => {
                  db.close();
                  if (err) {
                    reject(err);
                  } else {
                    resolve(NextResponse.json({
                      server: updatedServer,
                      tools: []
                    }));
                  }
                });
                return;
              }
              
              mockTools.forEach(tool => {
                insertTool(tool, () => {
                  completed++;
                  if (completed === total) {
                    // 获取更新后的服务器信息和工具
                    db.get('SELECT * FROM mcp_servers WHERE id = ?', [serverId], (err, updatedServer) => {
                      if (err) {
                        db.close();
                        reject(err);
                        return;
                      }
                      
                      db.all('SELECT * FROM mcp_tools WHERE server_id = ?', [serverId], (err, tools) => {
                        db.close();
                        if (err) {
                          reject(err);
                        } else {
                          resolve(NextResponse.json({
                            server: updatedServer,
                            tools
                          }));
                        }
                      });
                    });
                  }
                });
              });
            });
          } else {
            // 连接失败，返回更新后的服务器信息
            db.get('SELECT * FROM mcp_servers WHERE id = ?', [serverId], (err, updatedServer) => {
              db.close();
              if (err) {
                reject(err);
              } else {
                resolve(NextResponse.json({
                  server: updatedServer,
                  tools: []
                }, { status: 400 }));
              }
            });
          }
        });
      });
    });
  } catch (error) {
    console.error('连接服务器失败:', error);
    return NextResponse.json(
      { error: '连接服务器失败' },
      { status: 500 }
    );
  }
}