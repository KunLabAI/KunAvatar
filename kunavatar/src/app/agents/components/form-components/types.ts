import { z } from 'zod';
import { CustomModel } from '@/lib/database/custom-models';
import { McpServer, McpTool } from '@/lib/database';
import { AgentWithRelations } from '../../types';

// 表单数据类型
export interface FormData {
  name: string;
  description: string;
  model_id: number | null;
  avatar: string | null;
  server_ids: number[];
  tool_ids: number[];
}

// 表单验证模式
export const agentSchema = z.object({
  name: z.string().min(1, '智能体名称不能为空'),
  model_id: z.coerce.number().int().positive({ message: '必须选择一个搭载模型' }),
  description: z.string().nullable().optional().default(null),
  avatar: z.string().nullable().optional().default(null),
  server_ids: z.array(z.number()),
  tool_ids: z.array(z.number()),
});

// 组件通用属性
export interface AgentFormModalProps {
  agent: AgentWithRelations | null;
  onClose: () => void;
  onSave: () => void;
  availableModels: CustomModel[];
  availableServers: McpServer[];
  allAvailableTools: McpTool[];
}