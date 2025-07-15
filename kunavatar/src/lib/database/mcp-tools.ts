import { db } from './connection';
import type { McpTool, CreateMcpToolData } from './types';

// MCP工具相关查询语句
export const mcpToolQueries = {
  // 创建MCP工具
  create: db.prepare(`
    INSERT INTO mcp_tools (server_id, name, description, input_schema, is_available, enabled)
    VALUES (?, ?, ?, ?, ?, ?)
  `),

  // 获取服务器的所有工具
  getByServerId: db.prepare(`
    SELECT * FROM mcp_tools
    WHERE server_id = ?
    ORDER BY name ASC
  `),

  // 根据ID获取工具
  getById: db.prepare(`
    SELECT * FROM mcp_tools
    WHERE id = ?
  `),

  // 根据服务器ID和工具名称获取工具
  getByServerIdAndName: db.prepare(`
    SELECT * FROM mcp_tools
    WHERE server_id = ? AND name = ?
  `),

  // 获取可用的工具
  getAvailable: db.prepare(`
    SELECT t.*, s.name as server_name, s.display_name as server_display_name, s.status as server_status
    FROM mcp_tools t
    JOIN mcp_servers s ON t.server_id = s.id
    WHERE t.is_available = 1 AND t.enabled = 1 AND s.enabled = 1
    ORDER BY t.name ASC
  `),

  // 更新工具使用统计
  updateUsage: db.prepare(`
    UPDATE mcp_tools
    SET usage_count = usage_count + 1, last_used_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  // 更新工具可用性
  updateAvailability: db.prepare(`
    UPDATE mcp_tools
    SET is_available = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  // 更新工具启用状态
  updateEnabled: db.prepare(`
    UPDATE mcp_tools
    SET enabled = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  // 删除服务器的所有工具
  deleteByServerId: db.prepare(`
    DELETE FROM mcp_tools
    WHERE server_id = ?
  `),

  // 删除工具
  delete: db.prepare(`
    DELETE FROM mcp_tools
    WHERE id = ?
  `),
};

// MCP工具数据库操作函数
export const mcpToolOperations = {
  // 创建MCP工具
  create(data: CreateMcpToolData): number {
    const result = mcpToolQueries.create.run(
      data.server_id,
      data.name,
      data.description || null,
      data.input_schema ? JSON.stringify(data.input_schema) : null,
      Boolean(data.is_available ?? true) ? 1 : 0, // 确保布尔值转换为数字
      Boolean(data.enabled ?? true) ? 1 : 0 // 确保布尔值转换为数字
    );
    return result.lastInsertRowid as number;
  },

  // 获取服务器的所有工具
  getByServerId(serverId: number): McpTool[] {
    return mcpToolQueries.getByServerId.all(serverId) as McpTool[];
  },

  // 根据ID获取工具
  getById(id: number): McpTool | undefined {
    return mcpToolQueries.getById.get(id) as McpTool | undefined;
  },

  // 根据服务器ID和工具名称获取工具
  getByServerIdAndName(serverId: number, name: string): McpTool | undefined {
    return mcpToolQueries.getByServerIdAndName.get(serverId, name) as McpTool | undefined;
  },

  // 获取可用的工具
  getAvailable(): any[] {
    return mcpToolQueries.getAvailable.all();
  },

  // 更新工具使用统计
  updateUsage(toolId: number): void {
    mcpToolQueries.updateUsage.run(toolId);
  },

  // 更新工具可用性
  updateAvailability(id: number, isAvailable: boolean): void {
    mcpToolQueries.updateAvailability.run(isAvailable ? 1 : 0, id);
  },

  // 更新工具启用状态
  updateEnabled(id: number, enabled: boolean): void {
    mcpToolQueries.updateEnabled.run(enabled ? 1 : 0, id);
  },

  // 删除服务器的所有工具
  deleteByServerId(serverId: number): void {
    mcpToolQueries.deleteByServerId.run(serverId);
  },

  // 删除工具
  delete(id: number): void {
    mcpToolQueries.delete.run(id);
  },
};