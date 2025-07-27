import { db } from './connection';
import type { McpTool, McpServer } from './types';
import type { CustomModel } from './custom-models';
import { CustomModelService } from './custom-models';

export interface Agent {
  id: number;
  name: string;
  description: string | null;
  model_id: number;
  system_prompt: string | null;
  avatar: string | null;
  memory_enabled: boolean;
  user_id: string; // 智能体创建者的用户ID
  created_at: string;
  updated_at: string;
  // 关联数据
  model: CustomModel; // 非可选，因为Agent必须有模型
  servers: McpServer[];
  tools: McpTool[];
}

export type AgentCreate = Omit<Agent, 'id' | 'created_at' | 'updated_at' | 'model' | 'servers' | 'tools'> & {
  server_ids?: number[];
  tool_ids?: number[];
  description?: string | null;
  system_prompt?: string | null;
  memory_enabled?: boolean;
};

export type AgentUpdate = Partial<Omit<AgentCreate, 'model_id'>> & {
  id: number;
};

const agentWithRelationsQuery = `
  SELECT
    a.*,
    (
      SELECT json_group_array(json_object('id', s.id, 'name', s.name, 'display_name', s.display_name))
      FROM agent_mcp_servers ams
      JOIN mcp_servers s ON ams.server_id = s.id
      WHERE ams.agent_id = a.id
    ) as servers,
    (
      SELECT json_group_array(json_object('id', t.id, 'name', t.name, 'description', t.description))
      FROM agent_tools at
      JOIN mcp_tools t ON at.tool_id = t.id
      WHERE at.agent_id = a.id
    ) as tools
  FROM agents a
`;

function mapRowToAgent(row: any): Agent {
  const model = CustomModelService.getById(row.model_id);
  if (!model) {
    throw new Error(`Could not find model with id ${row.model_id} for agent ${row.id}`);
  }
  
  return {
    ...row,
    model,
    servers: row.servers ? JSON.parse(row.servers) : [],
    tools: row.tools ? JSON.parse(row.tools) : [],
  };
}

export const agentOperations = {
  create(data: AgentCreate): Agent | null {
    const createAgentStmt = db.prepare(
      'INSERT INTO agents (name, description, model_id, system_prompt, avatar, memory_enabled, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const linkServerStmt = db.prepare('INSERT INTO agent_mcp_servers (agent_id, server_id) VALUES (?, ?)');
    const linkToolStmt = db.prepare('INSERT INTO agent_tools (agent_id, tool_id) VALUES (?, ?)');

    const transaction = db.transaction((agentData: AgentCreate) => {
      const { name, description, model_id, system_prompt, avatar, memory_enabled, user_id, server_ids, tool_ids } = agentData;
      const result = createAgentStmt.run(name, description || null, model_id, system_prompt || null, avatar || null, memory_enabled ? 1 : 0, user_id);
      const agentId = result.lastInsertRowid as number;

      if (server_ids) {
        for (const server_id of server_ids) {
          linkServerStmt.run(agentId, server_id);
        }
      }
      if (tool_ids) {
        for (const tool_id of tool_ids) {
          linkToolStmt.run(agentId, tool_id);
        }
      }
      return agentId;
    });

    try {
      const agentId = transaction(data);
      return this.getById(agentId);
    } catch (error) {
      console.error('Failed to create agent:', error);
      return null;
    }
  },

  getById(id: number): Agent | null {
    const row = db.prepare(`${agentWithRelationsQuery} WHERE a.id = ?`).get(id);
    return row ? mapRowToAgent(row) : null;
  },

  getAll(): Agent[] {
    const rows = db.prepare(`${agentWithRelationsQuery} ORDER BY a.created_at DESC`).all();
    return rows.map(mapRowToAgent);
  },

  getAllByUserId(userId: string): Agent[] {
    const rows = db.prepare(`${agentWithRelationsQuery} WHERE a.user_id = ? ORDER BY a.created_at DESC`).all(userId);
    return rows.map(mapRowToAgent);
  },
  
  update(data: AgentUpdate): boolean {
    const { id, server_ids, tool_ids, ...agentData } = data;
    
    const fields = Object.keys(agentData).filter(k => (agentData as any)[k] !== undefined);
    if (fields.length === 0 && server_ids === undefined && tool_ids === undefined) {
      return false; // Nothing to update
    }

    const transaction = db.transaction(() => {
        // 1. Update agent's own fields if any
        if (fields.length > 0) {
            const setClause = fields.map(field => {
                if (field === 'memory_enabled') return `${field} = ?`;
                return `${field} = ?`;
            }).join(', ');
            
            const values = fields.map(field => {
                if (field === 'memory_enabled') return (agentData as any)[field] ? 1 : 0;
                return (agentData as any)[field];
            });

            const stmt = db.prepare(`UPDATE agents SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
            stmt.run(...values, id);
        }

        // 2. Update server associations if provided
        if (server_ids !== undefined) {
            db.prepare('DELETE FROM agent_mcp_servers WHERE agent_id = ?').run(id);
            const linkServerStmt = db.prepare('INSERT INTO agent_mcp_servers (agent_id, server_id) VALUES (?, ?)');
            for (const server_id of server_ids) {
                linkServerStmt.run(id, server_id);
            }
        }

        // 3. Update tool associations if provided
        if (tool_ids !== undefined) {
            db.prepare('DELETE FROM agent_tools WHERE agent_id = ?').run(id);
            const linkToolStmt = db.prepare('INSERT INTO agent_tools (agent_id, tool_id) VALUES (?, ?)');
            for (const tool_id of tool_ids) {
                linkToolStmt.run(id, tool_id);
            }
        }
    });

    try {
        transaction();
        return true;
    } catch (error) {
        console.error(`Failed to update agent ${id}:`, error);
        return false;
    }
  },

  delete(id: number): boolean {
    // Foreign key constraints with ON DELETE CASCADE will handle associated records
    const result = db.prepare('DELETE FROM agents WHERE id = ?').run(id);
    return result.changes > 0;
  }
};