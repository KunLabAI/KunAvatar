import { db } from './connection';
import { z } from 'zod';
import crypto from 'crypto';
import { OllamaModel, OllamaClient, OllamaModelDetails } from '../ollama';

// 模型参数验证模式
export const ModelParametersSchema = z.object({
  temperature: z.number().min(0).max(2).default(0.7),
  top_p: z.number().min(0).max(1).default(0.9),
  top_k: z.number().min(0).max(100).default(40),
  repeat_penalty: z.number().min(0).default(1.1),
  seed: z.number().optional(),
  num_predict: z.number().default(-1),
  num_ctx: z.number().min(0).default(4096),
  num_thread: z.number().min(1).optional(),
  num_gpu: z.number().min(1).optional(),
  use_mmap: z.boolean().optional(),
  num_batch: z.number().min(1).optional(),
  num_keep: z.number().min(0).optional(),
  stop: z.array(z.string()).optional(),
});

// 模型配置验证模式
export const CustomModelSchema = z.object({
  id: z.number().int(),
  base_model: z.string(),
  display_name: z.string(),
  model_hash: z.string(),
  description: z.string().optional(),
  family: z.string(),
  system_prompt: z.string().optional(),
  parameters: z.record(z.any()), // 支持动态参数
  template: z.string().optional(),
  license: z.string().optional(),
  tags: z.array(z.string()).optional(),
  created_at: z.string(),
  updated_at: z.string().optional(),
  size: z.number().optional(),
  digest: z.string().optional(),
  ollama_modified_at: z.string().optional(),
  // 新增Ollama API信息
  architecture: z.string().optional(),
  parameter_count: z.number().optional(),
  context_length: z.number().optional(),
  embedding_length: z.number().optional(),
  quantization_level: z.string().optional(),
  format: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
});

const defaultParameters = {};

export type CustomModel = z.infer<typeof CustomModelSchema>;

// 检查名称冲突
function checkNameConflict(baseModel: string, excludeId?: number): boolean {
  const stmt = excludeId 
    ? db.prepare('SELECT COUNT(*) as count FROM custom_models WHERE base_model = ? AND id != ?')
    : db.prepare('SELECT COUNT(*) as count FROM custom_models WHERE base_model = ?');
  
  const result = excludeId 
    ? stmt.get(baseModel, excludeId) as { count: number }
    : stmt.get(baseModel) as { count: number };
  
  return result.count > 0;
}

// 检查哈希冲突
function checkHashConflict(modelHash: string, excludeId?: number): boolean {
  const stmt = excludeId 
    ? db.prepare('SELECT COUNT(*) as count FROM custom_models WHERE model_hash = ? AND id != ?')
    : db.prepare('SELECT COUNT(*) as count FROM custom_models WHERE model_hash = ?');
  
  const result = excludeId 
    ? stmt.get(modelHash, excludeId) as { count: number }
    : stmt.get(modelHash) as { count: number };
  
  return result.count > 0;
}

export class CustomModelService {
  /**
   * 创建自定义模型
   */
  static create(data: Omit<CustomModel, 'id' | 'created_at' | 'updated_at'>): CustomModel {
    const validatedData = CustomModelSchema.omit({
      id: true,
      created_at: true,
      updated_at: true,
    }).partial().merge(z.object({
        base_model: z.string(),
        display_name: z.string(),
        family: z.string(),
        model_hash: z.string(),
        parameters: z.record(z.any()),
    })).parse(data);

    const checkHashConflict = (hash: string): boolean => {
      const row = db.prepare('SELECT id FROM custom_models WHERE model_hash = ?').get(hash);
      return !!row;
    };

    let modelHash = validatedData.model_hash;
    if (checkHashConflict(modelHash)) {
        let attempts = 0;
        let uniqueHashFound = false;
        while(attempts < 10 && !uniqueHashFound) {
            const newHash = this.generateModelHash(`${validatedData.base_model}-${attempts}`);
            if(!checkHashConflict(newHash)) {
                modelHash = newHash;
                uniqueHashFound = true;
            }
            attempts++;
        }
        if(!uniqueHashFound) {
            throw new Error("Failed to generate a unique model hash after 10 attempts.");
        }
    }
    
    const parameters = JSON.stringify(validatedData.parameters);
    const tags = JSON.stringify(validatedData.tags || []);

    const stmt = db.prepare(
      'INSERT INTO custom_models (base_model, display_name, model_hash, description, family, system_prompt, parameters, tags, template, license, size, digest, ollama_modified_at, architecture, parameter_count, context_length, embedding_length, quantization_level, format, capabilities) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    const capabilities = JSON.stringify(validatedData.capabilities || []);

    const result = stmt.run(
      validatedData.base_model,
      validatedData.display_name,
      modelHash,
      validatedData.description,
      validatedData.family,
      validatedData.system_prompt,
      parameters,
      tags,
      validatedData.template,
      validatedData.license,
      validatedData.size,
      validatedData.digest,
      validatedData.ollama_modified_at,
      validatedData.architecture,
      validatedData.parameter_count,
      validatedData.context_length,
      validatedData.embedding_length,
      validatedData.quantization_level,
      validatedData.format,
      capabilities
    );

    const newModelId = result.lastInsertRowid;
    const newModel = this.getById(Number(newModelId));
    if (!newModel) {
      throw new Error('Failed to create or retrieve the new model.');
    }
    return newModel;
  }
  
  /**
   * 更新自定义模型
   */
  static update(id: number, data: Partial<Pick<CustomModel, 'display_name' | 'description' | 'tags'>>): boolean {
    const updateData = z.object({
      display_name: z.string().min(1, '显示名称不能为空'),
      description: z.string().optional(),
      tags: z.array(z.string()).optional()
    }).partial().parse(data);

    const fields = Object.keys(updateData);
    if (fields.length === 0) return false;

    const updateFields = fields.map(field => `${field} = ?`);
    const values = fields.map(field => {
        const value = (updateData as any)[field];
        return field === 'tags' ? JSON.stringify(value) : value;
    });
  
    const stmt = db.prepare(`UPDATE custom_models SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
    const result = stmt.run(...values, id);
    return result.changes > 0;
  }
  
  /**
   * 删除自定义模型
   */
  static delete(id: number): boolean {
    const stmt = db.prepare('DELETE FROM custom_models WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
  
  /**
   * 根据ID获取模型
   */
  static getById(id: number): CustomModel | null {
    const row = db.prepare('SELECT * FROM custom_models WHERE id = ?').get(id) as any;
    if (row) {
      return this.mapRowToModel(row);
    }
    return null;
  }
  
  /**
   * 获取所有模型
   */
  static getAll({ search, tags, sortBy, sortOrder }: {
    search?: string;
    tags?: string[];
    sortBy?: 'base_model' | 'created_at' | 'updated_at' | 'ollama_modified_at';
    sortOrder?: 'asc' | 'desc';
  }): CustomModel[] {
    let query = 'SELECT * FROM custom_models WHERE 1=1';
    const params: any[] = [];

    if (search) {
      query += ' AND (base_model LIKE ? OR display_name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (tags && tags.length > 0) {
      query += ` AND (${tags.map(() => "json_each.value = ?").join(' OR ')})`;
      query = `SELECT t1.* FROM custom_models t1, json_each(t1.tags) WHERE t1.id IN (SELECT t1.id FROM custom_models t1, json_each(t1.tags) WHERE ${tags.map(() => `json_each.value LIKE ?`).join(' OR ')})`
      params.push(...tags.map(t => `%${t}%`));
    }

    if (sortBy && sortOrder) {
      const sortColumn = ['base_model', 'created_at', 'updated_at', 'ollama_modified_at'].includes(sortBy) ? sortBy : 'ollama_modified_at';
      const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      
      // 特殊处理ollama_modified_at排序，让NULL值（新创建的模型）排在前面
      if (sortColumn === 'ollama_modified_at') {
        if (order === 'DESC') {
          // 降序：先显示新创建的模型(NULL)，然后按时间倒序显示Ollama同步的模型
          query += ` ORDER BY ${sortColumn} IS NULL DESC, ${sortColumn} ${order}`;
        } else {
          // 升序：先显示新创建的模型(NULL)，然后按时间正序显示Ollama同步的模型
          query += ` ORDER BY ${sortColumn} IS NULL DESC, ${sortColumn} ${order}`;
        }
      } else {
        // 其他字段正常排序
        query += ` ORDER BY ${sortColumn} ${order}`;
      }
    } else {
      // 默认排序：新创建的模型在前，然后按更新时间倒序
      query += ` ORDER BY ollama_modified_at IS NULL DESC, COALESCE(updated_at, created_at) DESC`;
    }

    const rows = db.prepare(query).all(params) as any[];
    return rows.map(this.mapRowToModel);
  }
  
  static getTags(): string[] {
    const rows = db.prepare("SELECT DISTINCT value FROM custom_models, json_each(tags)").all() as { value: string }[];
    return rows.map(row => row.value);
  }

  static async syncWithOllama(ollamaModels: OllamaModel[]): Promise<void> {
    const dbModels = this.getAll({});
    const dbModelMap = new Map(dbModels.map(m => [m.base_model, m]));
    const ollamaModelMap = new Map(ollamaModels.map(m => [m.name, m]));
    const ollamaClient = new OllamaClient();

    // 1. 在事务之外，首先获取所有模型的详细信息
    const detailedOllamaModels = await Promise.all(
      ollamaModels.map(async (model) => {
        try {
          const showInfo = await ollamaClient.getModelDetails(model.name);
          return { ...model, showInfo, success: true };
        } catch (error) {
          console.error(`获取模型 ${model.name} 的详细信息失败:`, error);
          return { ...model, showInfo: null, success: false };
        }
      })
    );

    const syncTransaction = db.transaction(() => {
      // 2. 在同步事务中处理数据库操作
      for (const detailedModel of detailedOllamaModels) {
        if (!detailedModel.success || !detailedModel.showInfo) {
          continue; // 如果获取详情失败则跳过
        }
        
        const existingDbModel = dbModelMap.get(detailedModel.name);

        const modelData: Partial<Omit<CustomModel, 'parameters'>> & { parameters?: Partial<CustomModel['parameters']> } = {
          base_model: detailedModel.name,
          family: detailedModel.showInfo.details.family || 'unknown',
          size: detailedModel.size,
          digest: detailedModel.digest,
          ollama_modified_at: detailedModel.modified_at,
          template: detailedModel.showInfo.template,
          system_prompt: detailedModel.showInfo.system,
          license: detailedModel.showInfo.license,
        };
        
        // 解析和设置参数
        if (detailedModel.showInfo.parameters) {
            try {
                const params = this.parseOllamaParameters(detailedModel.showInfo.parameters);
                modelData.parameters = params;
            } catch(e) {
                console.warn(`无法解析模型 '${detailedModel.name}' 的参数:`, e);
            }
        }

        // 解析模型架构和详细信息
        if (detailedModel.showInfo.model_info) {
            const modelInfo = detailedModel.showInfo.model_info;
            modelData.architecture = modelInfo['general.architecture'];
            modelData.parameter_count = modelInfo['general.parameter_count'];
            
            // 动态查找上下文长度（支持不同架构）
            modelData.context_length = this.findModelInfoValue(modelInfo, 'context_length');
              
            // 动态查找嵌入长度
            modelData.embedding_length = this.findModelInfoValue(modelInfo, 'embedding_length');
        }

        // 设置格式和量化信息
        if (detailedModel.showInfo.details) {
            modelData.format = detailedModel.showInfo.details.format;
            modelData.quantization_level = detailedModel.showInfo.details.quantization_level;
        }

        // 设置能力信息
        if (detailedModel.showInfo.capabilities) {
            modelData.capabilities = detailedModel.showInfo.capabilities;
        }

        if (existingDbModel) {
          const updatedParameters = { 
            ...existingDbModel.parameters, 
            ...(modelData.parameters || {}) 
          };
          const { display_name, description, tags, ...ollamaData } = modelData;
          this._updateOllamaData(existingDbModel.id, { ...ollamaData, parameters: updatedParameters });
        } else {
          // Create new model
          const modelHash = this.generateModelHash(detailedModel.name);
          const displayName = detailedModel.name.split(':')[0];
          const parameters = modelData.parameters || defaultParameters;

          const fullModelData: Omit<CustomModel, 'id' | 'created_at' | 'updated_at'> = {
            base_model: detailedModel.name,
            display_name: displayName,
            model_hash: modelHash,
            family: detailedModel.showInfo.details.family || 'unknown',
            description: '',
            system_prompt: modelData.system_prompt || '',
            parameters,
            tags: [],
            template: modelData.template,
            license: modelData.license,
            size: detailedModel.size,
            digest: detailedModel.digest,
            ollama_modified_at: detailedModel.modified_at,
            // 新增的Ollama API字段
            architecture: modelData.architecture,
            parameter_count: modelData.parameter_count,
            context_length: modelData.context_length,
            embedding_length: modelData.embedding_length,
            quantization_level: modelData.quantization_level,
            format: modelData.format,
            capabilities: modelData.capabilities || [],
          };
          this.create(fullModelData);
        }
      }

      // 3. 如果模型在Ollama中不再存在，则从我们的数据库中删除
      for (const dbModel of dbModels) {
        if (!ollamaModelMap.has(dbModel.base_model)) {
          this.delete(dbModel.id);
        }
      }
    });

    syncTransaction();
  }
  
  /**
   * 内部方法：只更新从Ollama同步的数据
   */
  private static _updateOllamaData(id: number, data: Partial<Omit<CustomModel, 'id' | 'display_name' | 'description' | 'tags'>>): boolean {
    const fields = Object.keys(data);
    if (fields.length === 0) return false;

    const updateFields = fields.map(field => `${field} = ?`);
    const values = fields.map(field => {
        const value = (data as any)[field];
        if (field === 'parameters' || field === 'capabilities') return JSON.stringify(value);
        return value;
    });

    const stmt = db.prepare(`UPDATE custom_models SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
    const result = stmt.run(...values, id);
    return result.changes > 0;
  }
  
  private static mapRowToModel(row: any): CustomModel {
    const model: CustomModel = {
      id: row.id,
      base_model: row.base_model,
      display_name: row.display_name,
      model_hash: row.model_hash,
      description: row.description,
      family: row.family,
      system_prompt: row.system_prompt,
      parameters: row.parameters ? JSON.parse(row.parameters) : {},
      tags: row.tags ? JSON.parse(row.tags) : [],
      created_at: row.created_at,
      updated_at: row.updated_at,
      size: row.size,
      digest: row.digest,
      ollama_modified_at: row.ollama_modified_at,
      template: row.template,
      license: row.license,
      // 新增的Ollama API字段
      architecture: row.architecture,
      parameter_count: row.parameter_count,
      context_length: row.context_length,
      embedding_length: row.embedding_length,
      quantization_level: row.quantization_level,
      format: row.format,
      capabilities: row.capabilities ? JSON.parse(row.capabilities) : []
    };
    return model;
  }

  private static generateModelHash(name: string): string {
    return crypto.createHash('sha256').update(name).digest('hex').substring(0, 16);
  }

  /**
   * 动态查找model_info中的字段值
   * 支持不同架构的字段命名格式
   */
  private static findModelInfoValue(modelInfo: Record<string, any>, fieldSuffix: string): number | undefined {
    // 查找所有包含指定后缀的字段
    const matchingKeys = Object.keys(modelInfo).filter(key => 
      key.endsWith('.' + fieldSuffix) || key.endsWith('_' + fieldSuffix)
    );
    
    if (matchingKeys.length === 0) return undefined;
    
    // 优先返回第一个匹配的值
    const firstKey = matchingKeys[0];
    const value = modelInfo[firstKey];
    
    return typeof value === 'number' ? value : undefined;
  }

  /**
   * 解析Ollama parameters字符串为对象
   */
  private static parseOllamaParameters(parametersStr: string): Record<string, any> {
    const params: Record<string, any> = {};
    
    if (!parametersStr) return params;
    
    const lines = parametersStr.split('\n');
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;
      
      // 解析格式: "param_name    value"
      const match = trimmedLine.match(/^(\w+)\s+(.+)$/);
      if (!match) return;
      
      const [, key, valueStr] = match;
      
      // 解析值
      let value = valueStr.trim();
      
      // 去除引号
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      
      // 特殊处理stop参数（可能有多个）
      if (key === 'stop') {
        if (!params.stop) {
          params.stop = [];
        }
        params.stop.push(value);
      } else {
        // 类型转换
        if (value.toLowerCase() === 'true') {
          params[key] = true;
        } else if (value.toLowerCase() === 'false') {
          params[key] = false;
        } else if (!isNaN(Number(value)) && value.trim() !== '') {
          params[key] = Number(value);
        } else {
          params[key] = value;
        }
      }
    });
    
    return params;
  }
} 