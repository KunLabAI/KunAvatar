import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import defaultPrompts from '../../config/default-prompts.json';
import { getDatabasePath, getLockFilePath } from './db-path';

// 🔧 修复：使用全局变量和单例模式来确保数据库只初始化一次
// 定义全局缓存的类型
declare global {
  var __db_instance: Database.Database | undefined;
}

// 数据库连接配置
const dbPath = getDatabasePath();
const lockFilePath = getLockFilePath();

// 初始化数据库表的函数
const executeInitialization = (db: Database.Database) => {
  // 基础表结构SQL - 按依赖顺序创建表
  const baseSQL = `
    -- 用户管理系统表（基础表，其他表依赖此表）
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      avatar_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
      email_verified BOOLEAN NOT NULL DEFAULT 0,
      last_login_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 角色表
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      description TEXT,
      is_system BOOLEAN NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 权限表
    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      description TEXT,
      resource TEXT NOT NULL,
      action TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 用户角色关联表
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      assigned_by TEXT,
      PRIMARY KEY (user_id, role_id),
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_by) REFERENCES users (id) ON DELETE SET NULL
    );

    -- 角色权限关联表
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id TEXT NOT NULL,
      permission_id TEXT NOT NULL,
      granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      granted_by TEXT,
      PRIMARY KEY (role_id, permission_id),
      FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE,
      FOREIGN KEY (granted_by) REFERENCES users (id) ON DELETE SET NULL
    );

    -- 认证令牌表
    CREATE TABLE IF NOT EXISTS auth_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      token_type TEXT NOT NULL CHECK (token_type IN ('access', 'refresh', 'reset_password')),
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      used_at DATETIME,
      revoked_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    -- 用户设置表
    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT,
      category TEXT DEFAULT 'general',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE(user_id, key)
    );

    -- 自定义模型配置表（包含完整的Ollama API字段）
    CREATE TABLE IF NOT EXISTS custom_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      base_model TEXT NOT NULL UNIQUE, -- 完整的基础模型名称
      display_name TEXT NOT NULL, -- 用户可自定义的显示名称
      model_hash TEXT NOT NULL UNIQUE, -- 内部使用的哈希名称
      family TEXT NOT NULL, -- 模型家族信息
      description TEXT,
      system_prompt TEXT,
      parameters TEXT, -- JSON格式存储所有参数
      template TEXT, -- 自定义模板
      license TEXT,
      tags TEXT, -- JSON数组格式存储标签
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      size BIGINT,
      digest TEXT,
      ollama_modified_at TEXT,
      -- Ollama API详细信息字段
      architecture TEXT, -- 模型架构（llama、gemma等）
      parameter_count INTEGER, -- 参数数量
      context_length INTEGER, -- 上下文长度
      embedding_length INTEGER, -- 嵌入维度
      quantization_level TEXT, -- 量化级别（Q8_0、Q4_0等）
      format TEXT, -- 文件格式（gguf等）
      capabilities TEXT -- 模型能力（JSON数组格式：completion、vision等）
    );

    -- MCP服务器统一配置表
    CREATE TABLE IF NOT EXISTS mcp_servers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL CHECK (type IN ('stdio', 'sse', 'streamable-http')),
      status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error', 'connecting')),
      enabled BOOLEAN NOT NULL DEFAULT 1,
      
      -- STDIO配置
      command TEXT,
      args TEXT, -- JSON数组格式
      working_directory TEXT,
      
      -- SSE/HTTP配置
      url TEXT,
      base_url TEXT,
      port INTEGER,
      path TEXT DEFAULT '/',
      protocol TEXT DEFAULT 'http' CHECK (protocol IN ('http', 'https')),
      
      -- 通用配置
      headers TEXT, -- JSON对象格式
      auth_type TEXT CHECK (auth_type IN ('none', 'bearer', 'basic', 'api_key')),
      auth_config TEXT, -- JSON格式
      timeout_ms INTEGER DEFAULT 30000,
      retry_attempts INTEGER DEFAULT 3,
      retry_delay_ms INTEGER DEFAULT 1000,
      
      -- 扩展配置
      extra_config TEXT, -- JSON格式，存储其他特殊配置
      
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_connected_at DATETIME,
      error_message TEXT
    );

    -- MCP工具表
    CREATE TABLE IF NOT EXISTS mcp_tools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      input_schema TEXT, -- JSON格式存储工具的输入参数模式
      is_available BOOLEAN DEFAULT 1,
      enabled BOOLEAN DEFAULT 1, -- 工具是否启用（在对话页面可见）
      last_used_at DATETIME,
      usage_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (server_id) REFERENCES mcp_servers (id) ON DELETE CASCADE,
      UNIQUE(server_id, name)
    );

    -- 智能体表（依赖 users 和 custom_models）
    CREATE TABLE IF NOT EXISTS agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      model_id INTEGER NOT NULL, -- 基础模型
      system_prompt TEXT, -- 系统提示词
      avatar TEXT, -- 头像URL
      memory_enabled BOOLEAN DEFAULT 0, -- 是否为该智能体启用记忆功能
      user_id TEXT NOT NULL, -- 智能体创建者的用户ID
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (model_id) REFERENCES custom_models (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    -- 对话表（依赖 users 和 agents）
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      model TEXT,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      model TEXT,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      sequence_number INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      timestamp INTEGER, -- 毫秒级时间戳，用于精确排序
      -- 图片相关字段
      images TEXT, -- JSON数组格式存储base64编码的图片
      -- 工具调用相关字段
      tool_name TEXT, -- 工具名称
      tool_args TEXT, -- 工具参数 (JSON)
      tool_result TEXT, -- 工具结果 (JSON)
      tool_status TEXT CHECK (tool_status IN ('executing', 'completed', 'error')), -- 工具状态
      tool_execution_time INTEGER, -- 工具执行时间(毫秒)
      tool_error TEXT, -- 工具错误信息
      -- Ollama生成统计信息
      total_duration INTEGER,
      load_duration INTEGER,
      prompt_eval_count INTEGER,
      prompt_eval_duration INTEGER,
      eval_count INTEGER,
      eval_duration INTEGER,
      FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
    );

    -- 智能体消息表（专门存储与智能体的对话，依赖 conversations、agents 和 users）
    CREATE TABLE IF NOT EXISTS agent_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      sequence_number INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      timestamp INTEGER, -- 毫秒级时间戳，用于精确排序
      -- 图片相关字段
      images TEXT, -- JSON数组格式存储base64编码的图片
      -- 工具调用相关字段
      tool_name TEXT, -- 工具名称
      tool_args TEXT, -- 工具参数 (JSON)
      tool_result TEXT, -- 工具结果 (JSON)
      tool_status TEXT CHECK (tool_status IN ('executing', 'completed', 'error')), -- 工具状态
      tool_execution_time INTEGER, -- 工具执行时间(毫秒)
      tool_error TEXT, -- 工具错误信息
      -- Ollama生成统计信息
      total_duration INTEGER,
      load_duration INTEGER,
      prompt_eval_count INTEGER,
      prompt_eval_duration INTEGER,
      eval_count INTEGER,
      eval_duration INTEGER,
      FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
      FOREIGN KEY (agent_id) REFERENCES agents (id) ON DELETE CASCADE
    );

    -- 智能体与MCP服务器关联表
    CREATE TABLE IF NOT EXISTS agent_mcp_servers (
      agent_id INTEGER NOT NULL,
      server_id INTEGER NOT NULL,
      PRIMARY KEY (agent_id, server_id),
      FOREIGN KEY (agent_id) REFERENCES agents (id) ON DELETE CASCADE,
      FOREIGN KEY (server_id) REFERENCES mcp_servers (id) ON DELETE CASCADE
    );

    -- 智能体与工具关联表
    CREATE TABLE IF NOT EXISTS agent_tools (
      agent_id INTEGER NOT NULL,
      tool_id INTEGER NOT NULL,
      PRIMARY KEY (agent_id, tool_id),
      FOREIGN KEY (agent_id) REFERENCES agents (id) ON DELETE CASCADE,
      FOREIGN KEY (tool_id) REFERENCES mcp_tools (id) ON DELETE CASCADE
    );

    -- MCP工具配置表
    CREATE TABLE IF NOT EXISTS mcp_tool_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tool_id INTEGER,
      server_name TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      config TEXT NOT NULL, -- JSON格式存储配置
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(server_name, tool_name)
    );

    -- 基础表索引
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON conversations(agent_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_user_agent ON conversations(user_id, agent_id);
    
    -- 智能体消息表索引
    CREATE INDEX IF NOT EXISTS idx_agent_messages_conversation_id ON agent_messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_agent_messages_agent_id ON agent_messages(agent_id);
    CREATE INDEX IF NOT EXISTS idx_agent_messages_user_id ON agent_messages(user_id);
    CREATE INDEX IF NOT EXISTS idx_agent_messages_conv_agent ON agent_messages(conversation_id, agent_id);
    CREATE INDEX IF NOT EXISTS idx_agent_messages_tool_name ON agent_messages(tool_name);
    CREATE INDEX IF NOT EXISTS idx_agent_messages_tool_status ON agent_messages(tool_status);
    CREATE INDEX IF NOT EXISTS idx_agent_messages_conv_tool ON agent_messages(conversation_id, tool_name);
    
    -- 自定义模型相关索引
    CREATE INDEX IF NOT EXISTS idx_custom_models_base_model ON custom_models(base_model);
    CREATE INDEX IF NOT EXISTS idx_custom_models_hash ON custom_models(model_hash);
    CREATE INDEX IF NOT EXISTS idx_custom_models_family ON custom_models(family);
    
    -- MCP相关索引
    CREATE INDEX IF NOT EXISTS idx_mcp_servers_type ON mcp_servers(type);
    CREATE INDEX IF NOT EXISTS idx_mcp_servers_status ON mcp_servers(status);
    CREATE INDEX IF NOT EXISTS idx_mcp_servers_enabled ON mcp_servers(enabled);
    CREATE INDEX IF NOT EXISTS idx_mcp_tools_server_id ON mcp_tools(server_id);
    CREATE INDEX IF NOT EXISTS idx_mcp_tools_name ON mcp_tools(name);
    CREATE INDEX IF NOT EXISTS idx_mcp_tools_available ON mcp_tools(is_available);
    -- 工具调用相关索引已迁移到messages表
    CREATE INDEX IF NOT EXISTS idx_messages_tool_name ON messages(tool_name);
    CREATE INDEX IF NOT EXISTS idx_messages_tool_status ON messages(tool_status);
    CREATE INDEX IF NOT EXISTS idx_messages_conv_tool ON messages(conversation_id, tool_name);

    -- 智能体相关索引
    CREATE INDEX IF NOT EXISTS idx_agents_name ON agents(name);
    CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
    CREATE INDEX IF NOT EXISTS idx_agent_mcp_servers_agent_id ON agent_mcp_servers(agent_id);
    CREATE INDEX IF NOT EXISTS idx_agent_tools_agent_id ON agent_tools(agent_id);

    -- 系统设置表已迁移到用户设置表 (user_settings)

    -- 记忆系统表
    CREATE TABLE IF NOT EXISTS conversation_memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      agent_id INTEGER, -- 关联的智能体（可选）
      memory_type TEXT NOT NULL DEFAULT 'summary' CHECK (memory_type IN ('summary', 'context', 'important')),
      content TEXT NOT NULL, -- JSON格式存储结构化记忆内容
      source_message_range TEXT, -- 记录来源消息范围，格式如 "1-20"
      importance_score REAL DEFAULT 1.0, -- 重要性评分 0-1
      tokens_saved INTEGER DEFAULT 0, -- 通过总结节省的token数量
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME, -- 记忆过期时间（可选）
      FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
      FOREIGN KEY (agent_id) REFERENCES agents (id) ON DELETE SET NULL
    );

    -- 智能体记忆配置表
    DROP TABLE IF EXISTS agent_memory_settings;

    -- 记忆系统索引
    CREATE INDEX IF NOT EXISTS idx_conversation_memories_conversation_id ON conversation_memories(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_conversation_memories_agent_id ON conversation_memories(agent_id);
    CREATE INDEX IF NOT EXISTS idx_conversation_memories_type ON conversation_memories(memory_type);
    CREATE INDEX IF NOT EXISTS idx_conversation_memories_importance ON conversation_memories(importance_score DESC);
    CREATE INDEX IF NOT EXISTS idx_conversation_memories_created_at ON conversation_memories(created_at DESC);

    -- 笔记系统表
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL, -- Markdown格式内容
      user_id TEXT NOT NULL,
      is_public BOOLEAN DEFAULT FALSE, -- 是否公开
      tags TEXT, -- JSON格式存储标签数组
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    -- 笔记分享表（用于权限控制）
    CREATE TABLE IF NOT EXISTS note_shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      note_id INTEGER NOT NULL,
      shared_with_user_id TEXT, -- 分享给特定用户（可选）
      shared_with_role_id TEXT, -- 分享给特定角色（可选）
      permission TEXT NOT NULL DEFAULT 'read' CHECK (permission IN ('read', 'write')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (note_id) REFERENCES notes (id) ON DELETE CASCADE,
      FOREIGN KEY (shared_with_user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (shared_with_role_id) REFERENCES roles (id) ON DELETE CASCADE
    );

    -- 笔记系统索引
    CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
    CREATE INDEX IF NOT EXISTS idx_notes_title ON notes(title);
    CREATE INDEX IF NOT EXISTS idx_notes_is_public ON notes(is_public);
    CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_note_shares_note_id ON note_shares(note_id);
    CREATE INDEX IF NOT EXISTS idx_note_shares_user_id ON note_shares(shared_with_user_id);
    CREATE INDEX IF NOT EXISTS idx_note_shares_role_id ON note_shares(shared_with_role_id);

    -- 用户管理系统索引
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
    CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON users(last_login_at DESC);

    CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
    CREATE INDEX IF NOT EXISTS idx_roles_is_system ON roles(is_system);

    CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
    CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);
    CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action);

    CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

    CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
    CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

    CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_auth_tokens_token_hash ON auth_tokens(token_hash);
    CREATE INDEX IF NOT EXISTS idx_auth_tokens_type ON auth_tokens(token_type);
    CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires_at ON auth_tokens(expires_at);

    CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_settings_key ON user_settings(key);
    CREATE INDEX IF NOT EXISTS idx_user_settings_category ON user_settings(category);
    CREATE INDEX IF NOT EXISTS idx_user_settings_user_key ON user_settings(user_id, key);

    -- 触发器，在更新时自动更新updated_at字段
    CREATE TRIGGER IF NOT EXISTS update_conversations_updated_at
    AFTER UPDATE ON conversations
    FOR EACH ROW
    BEGIN
        UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;

    CREATE TRIGGER IF NOT EXISTS update_mcp_tool_configs_updated_at
    AFTER UPDATE ON mcp_tool_configs
    FOR EACH ROW
    BEGIN
        UPDATE mcp_tool_configs SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;

    CREATE TRIGGER IF NOT EXISTS update_agents_updated_at
    AFTER UPDATE ON agents
    FOR EACH ROW
    BEGIN
        UPDATE agents SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;

    -- system_settings 触发器已移除（表已迁移到 user_settings）

    -- 用户管理相关触发器
    CREATE TRIGGER IF NOT EXISTS update_users_updated_at
    AFTER UPDATE ON users
    FOR EACH ROW
    BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;

    CREATE TRIGGER IF NOT EXISTS update_roles_updated_at
    AFTER UPDATE ON roles
    FOR EACH ROW
    BEGIN
        UPDATE roles SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;

    CREATE TRIGGER IF NOT EXISTS update_user_settings_updated_at
    AFTER UPDATE ON user_settings
    FOR EACH ROW
    BEGIN
        UPDATE user_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;

  `;

  // 执行基础表结构创建
  db.exec(baseSQL);
  
  // 初始化默认角色和权限
  const insertRole = db.prepare('INSERT OR IGNORE INTO roles (id, name, display_name, description, is_system) VALUES (?, ?, ?, ?, ?)');
  const insertPermission = db.prepare('INSERT OR IGNORE INTO permissions (id, name, display_name, description, resource, action) VALUES (?, ?, ?, ?, ?, ?)');

  // 创建系统角色（三级角色体系）
  const superAdminRoleId = crypto.randomUUID();
  const adminRoleId = crypto.randomUUID();
  const userRoleId = crypto.randomUUID();
  
  insertRole.run(superAdminRoleId, 'superadmin', '超级管理员', '拥有系统所有权限的超级管理员角色', 1);
  insertRole.run(adminRoleId, 'admin', '管理员', '系统管理员，拥有大部分管理权限', 1);
  insertRole.run(userRoleId, 'user', '普通用户', '普通用户，拥有基本权限', 1);

  // 创建完整权限列表（39个权限）
  const permissions = [
    // 用户管理权限 (5个)
    ['users:read', '查看用户', '查看用户信息的权限', 'users', 'read'],
    ['users:create', '创建用户', '创建新用户的权限', 'users', 'create'],
    ['users:update', '更新用户', '更新用户信息的权限', 'users', 'update'],
    ['users:delete', '删除用户', '删除用户的权限', 'users', 'delete'],
    ['users:manage', '管理用户', '完全管理用户的权限', 'users', 'manage'],

    // 角色管理权限 (5个)
    ['roles:read', '查看角色', '查看角色信息的权限', 'roles', 'read'],
    ['roles:create', '创建角色', '创建新角色的权限', 'roles', 'create'],
    ['roles:update', '更新角色', '更新角色信息的权限', 'roles', 'update'],
    ['roles:delete', '删除角色', '删除角色的权限', 'roles', 'delete'],
    ['roles:manage', '管理角色', '完全管理角色的权限', 'roles', 'manage'],

    // 权限管理权限 (3个)
    ['permissions:read', '查看权限', '查看权限信息的权限', 'permissions', 'read'],
    ['permissions:assign', '分配权限', '分配权限的权限', 'permissions', 'assign'],
    ['permissions:manage', '管理权限', '完全管理权限的权限', 'permissions', 'manage'],

    // 系统管理权限 (1个)
    ['system:admin', '系统管理', '系统管理权限', 'system', 'admin'],

    // 对话管理权限 (4个)
    ['chat:read', '查看对话', '查看对话记录的权限', 'chat', 'read'],
    ['chat:create', '创建对话', '创建新对话的权限', 'chat', 'create'],
    ['chat:update', '更新对话', '更新对话的权限', 'chat', 'update'],
    ['chat:delete', '删除对话', '删除对话的权限', 'chat', 'delete'],

    // 智能体管理权限 (4个)
    ['agents:create', '创建智能体', '创建新智能体', 'agents', 'create'],
    ['agents:read', '查看智能体', '查看智能体信息', 'agents', 'read'],
    ['agents:update', '更新智能体', '更新智能体配置', 'agents', 'update'],
    ['agents:delete', '删除智能体', '删除智能体', 'agents', 'delete'],

    // 模型管理权限 (4个)
    ['models:read', '查看模型', '查看AI模型的权限', 'models', 'read'],
    ['models:create', '创建模型', '创建AI模型的权限', 'models', 'create'],
    ['models:update', '更新模型', '更新AI模型的权限', 'models', 'update'],
    ['models:delete', '删除模型', '删除AI模型的权限', 'models', 'delete'],

    // 对话管理权限（别名，兼容性） (4个)
    ['conversations:create', '创建对话', '创建新对话', 'conversations', 'create'],
    ['conversations:read', '查看对话', '查看对话内容', 'conversations', 'read'],
    ['conversations:update', '更新对话', '更新对话信息', 'conversations', 'update'],
    ['conversations:delete', '删除对话', '删除对话', 'conversations', 'delete'],

    // 系统设置权限 (3个)
    ['settings:read', '查看设置', '查看系统设置', 'settings', 'read'],
    ['settings:update', '更新设置', '更新系统设置', 'settings', 'update'],
    ['settings:manage', '管理设置', '完全管理系统设置', 'settings', 'manage'],

    // 笔记管理权限 (6个)
    ['notes:read', '查看笔记', '查看笔记的权限', 'notes', 'read'],
    ['notes:create', '创建笔记', '创建新笔记的权限', 'notes', 'create'],
    ['notes:update', '更新笔记', '更新笔记的权限', 'notes', 'update'],
    ['notes:delete', '删除笔记', '删除笔记的权限', 'notes', 'delete'],
    ['notes:share', '分享笔记', '分享笔记的权限', 'notes', 'share'],
    ['notes:manage', '管理笔记', '完全管理笔记的权限', 'notes', 'manage']
  ];

  permissions.forEach(([name, displayName, description, resource, action]) => {
    insertPermission.run(crypto.randomUUID(), name, displayName, description, resource, action);
  });

  // 为超级管理员角色分配所有权限
  const superAdminRole = db.prepare('SELECT id FROM roles WHERE name = ?').get('superadmin') as { id: string } | undefined;
  const allPermissions = db.prepare('SELECT id FROM permissions').all() as { id: string }[];
  
  if (superAdminRole && allPermissions.length > 0) {
    const insertRolePermission = db.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
    allPermissions.forEach(permission => {
      insertRolePermission.run(superAdminRole.id, permission.id);
    });
    console.log(`✅ 已为超级管理员角色分配 ${allPermissions.length} 个权限。`);
  }

  // 为管理员角色分配部分权限（除了系统管理权限）
  const adminRole = db.prepare('SELECT id FROM roles WHERE name = ?').get('admin') as { id: string } | undefined;
  if (adminRole && allPermissions.length > 0) {
    const adminPermissions = db.prepare(`
      SELECT id FROM permissions 
      WHERE name NOT IN ('system:admin', 'permissions:manage', 'roles:delete', 'users:delete')
    `).all() as { id: string }[];
    const insertRolePermission = db.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
    
    adminPermissions.forEach(permission => {
      insertRolePermission.run(adminRole.id, permission.id);
    });
    
    console.log(`✅ 已为管理员角色分配 ${adminPermissions.length} 个权限。`);
  }

  // 初始化本地MCP服务器记录
  const insertLocalServer = db.prepare(`
    INSERT OR IGNORE INTO mcp_servers (
      name, display_name, description, type, enabled, 
      command, args, working_directory, 
      created_at, updated_at, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
  `);
  
  insertLocalServer.run(
    'local',
    '本地MCP服务器',
    '内置的本地MCP服务器，提供基础工具功能（计算器、时间获取、文件操作等）',
    'stdio',
    1, // enabled
    'npx',
    JSON.stringify(['tsx', 'src/lib/mcp/mcp-server.ts']),
    process.cwd(),
    'disconnected' // 初始状态为断开，等待首次连接
  );

  try {
    console.log('✅ 数据库结构已成功初始化。');
    console.log('✅ 本地MCP服务器记录已创建。');
    // 创建锁文件表示初始化完成
    fs.closeSync(fs.openSync(lockFilePath, 'w'));
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    throw error;
  }
};

// 获取数据库实例的单例函数
const getDatabaseInstance = (): Database.Database => {
  // 进程内缓存依然有效，优先使用
  if (global.__db_instance) {
    return global.__db_instance;
  }

  const db = new Database(dbPath);
  
  // 启用外键约束
  db.pragma('foreign_keys = ON');

  // 跨进程检查：如果锁文件不存在，则执行初始化
  if (!fs.existsSync(lockFilePath)) {
    console.log('正在创建新的数据库连接并初始化结构...');
    executeInitialization(db);
  } else {
    // console.log('数据库结构已存在，直接连接。');
  }

  global.__db_instance = db;
  return db;
};

// 导出的是数据库实例本身，而不是整个模块
export const db = getDatabaseInstance();

// 导出初始化函数，供外部使用
export { executeInitialization };

export default db;