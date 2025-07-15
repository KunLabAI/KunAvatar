import { db } from './connection';
import type { McpServer, CreateMcpServerData } from './types';

// MCP服务器相关查询语句
export const mcpServerQueries = {
  // 创建MCP服务器
  create: db.prepare(`
    INSERT INTO mcp_servers (
      name, display_name, description, type, enabled,
      command, args, working_directory,
      url, base_url, port, path, protocol,
      headers, auth_type, auth_config, timeout_ms, retry_attempts, retry_delay_ms,
      extra_config
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  // 获取所有MCP服务器
  getAll: db.prepare(`
    SELECT * FROM mcp_servers
    ORDER BY created_at DESC
  `),

  // 根据ID获取MCP服务器
  getById: db.prepare(`
    SELECT * FROM mcp_servers
    WHERE id = ?
  `),

  // 根据名称获取MCP服务器
  getByName: db.prepare(`
    SELECT * FROM mcp_servers
    WHERE name = ?
  `),

  // 获取启用的MCP服务器
  getEnabled: db.prepare(`
    SELECT * FROM mcp_servers
    WHERE enabled = 1
    ORDER BY created_at DESC
  `),

  // 更新MCP服务器状态
  updateStatus: db.prepare(`
    UPDATE mcp_servers
    SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP,
        last_connected_at = CASE WHEN ? = 'connected' THEN CURRENT_TIMESTAMP ELSE last_connected_at END
    WHERE id = ?
  `),

  // 更新MCP服务器配置
  update: db.prepare(`
    UPDATE mcp_servers
    SET display_name = ?, description = ?, type = ?, enabled = ?,
        command = ?, args = ?, working_directory = ?,
        url = ?, base_url = ?, port = ?, path = ?, protocol = ?,
        headers = ?, auth_type = ?, auth_config = ?, timeout_ms = ?, retry_attempts = ?, retry_delay_ms = ?,
        extra_config = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  // 删除MCP服务器
  delete: db.prepare(`
    DELETE FROM mcp_servers
    WHERE id = ?
  `),
};

// MCP服务器数据库操作函数
export const mcpServerOperations = {
  // 创建MCP服务器
  create(data: CreateMcpServerData): number {
    const result = mcpServerQueries.create.run(
      data.name,
      data.display_name,
      data.description || null,
      data.type,
      Boolean(data.enabled ?? true) ? 1 : 0, // 确保布尔值转换为数字
      data.command || null,
      data.args ? JSON.stringify(data.args) : null,
      data.working_directory || null,
      data.url || null,
      data.base_url || null,
      data.port ? Number(data.port) : null,
      data.path || null,
      data.protocol || null,
      data.headers ? JSON.stringify(data.headers) : null,
      data.auth_type || null,
      data.auth_config ? JSON.stringify(data.auth_config) : null,
      data.timeout_ms ? Number(data.timeout_ms) : null,
      data.retry_attempts ? Number(data.retry_attempts) : null,
      data.retry_delay_ms ? Number(data.retry_delay_ms) : null,
      data.extra_config ? JSON.stringify(data.extra_config) : null
    );
    return result.lastInsertRowid as number;
  },

  // 获取所有MCP服务器
  getAll(): McpServer[] {
    return mcpServerQueries.getAll.all() as McpServer[];
  },

  // 根据ID获取MCP服务器
  getById(id: number): McpServer | undefined {
    return mcpServerQueries.getById.get(id) as McpServer | undefined;
  },

  // 根据名称获取MCP服务器
  getByName(name: string): McpServer | undefined {
    return mcpServerQueries.getByName.get(name) as McpServer | undefined;
  },

  // 获取启用的MCP服务器
  getEnabled(): McpServer[] {
    return mcpServerQueries.getEnabled.all() as McpServer[];
  },

  // 更新MCP服务器状态
  updateStatus(id: number, status: McpServer['status'], errorMessage?: string): void {
    mcpServerQueries.updateStatus.run(status, errorMessage || null, status, id);
  },

  // 删除MCP服务器
  delete(id: number): void {
    mcpServerQueries.delete.run(id);
  },
};