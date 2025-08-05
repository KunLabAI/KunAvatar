/**
 * 超级管理员初始化脚本
 * 
 * 注意：从 v2.0 开始，系统已优化为第一个注册的用户自动成为超级管理员。
 * 此脚本主要用于以下场景：
 * 1. 手动创建额外的超级管理员账号
 * 2. 在特殊情况下重新初始化超级管理员
 * 3. 批量部署时预设超级管理员账号
 * 
 * 使用方法：
 * - 基本使用：node init-admin.js
 * - 强制重新创建：node init-admin.js --force
 * - 自定义密码：node init-admin.js --password=YourPassword
 */

import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 获取正确的数据库路径
function getDatabasePath() {
  // 优先使用环境变量中的数据库路径（由Electron主进程设置）
  if (process.env.DATABASE_PATH) {
    console.log('使用环境变量中的数据库路径:', process.env.DATABASE_PATH);
    return process.env.DATABASE_PATH;
  }
  
  // 检查是否在Electron环境中
  if (process.env.ELECTRON_ENV || process.versions.electron) {
    // 在Electron环境中，使用用户数据目录
    const { app } = require('electron');
    if (app && app.isReady()) {
      const userDataPath = app.getPath('userData');
      const dbPath = path.join(userDataPath, 'chat.db');
      console.log('使用Electron用户数据目录:', dbPath);
      return dbPath;
    }
  }
  
  // 默认使用项目根目录
  const dbPath = path.join(__dirname, '..', 'chat.db');
  console.log('使用项目根目录数据库路径:', dbPath);
  return dbPath;
}

// 初始化数据库连接
const dbPath = getDatabasePath();
const db = new Database(dbPath);

// 默认超级管理员配置
const SUPER_ADMIN_CONFIG = {
  username: 'superadmin',
  email: 'admin@kunavatar.com',
  password: 'Admin123!', // 建议在生产环境中通过环境变量设置
  firstName: 'Super',
  lastName: 'Admin'
};

// 创建超级管理员用户
async function createSuperAdmin() {
  try {
    console.log('开始创建超级管理员账号...');

    // 检查是否已存在超级管理员
    const checkUser = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?');
    const existingUser = checkUser.get(SUPER_ADMIN_CONFIG.username, SUPER_ADMIN_CONFIG.email);

    if (existingUser) {
      console.log('超级管理员账号已存在:', existingUser.username);
      return existingUser.id;
    }

    // 生成UUID和密码哈希
    const userId = uuidv4();
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(SUPER_ADMIN_CONFIG.password, saltRounds);

    // 创建超级管理员用户
    const createUser = db.prepare(`
      INSERT INTO users (id, username, email, password_hash, first_name, last_name, status, email_verified)
      VALUES (?, ?, ?, ?, ?, ?, 'active', 1)
    `);

    createUser.run(
      userId,
      SUPER_ADMIN_CONFIG.username,
      SUPER_ADMIN_CONFIG.email,
      passwordHash,
      SUPER_ADMIN_CONFIG.firstName,
      SUPER_ADMIN_CONFIG.lastName
    );

    console.log('超级管理员账号创建成功!');
    console.log('用户名:', SUPER_ADMIN_CONFIG.username);
    console.log('邮箱:', SUPER_ADMIN_CONFIG.email);
    console.log('默认密码:', SUPER_ADMIN_CONFIG.password);
    console.log('请在首次登录后立即修改密码!');

    return userId;
  } catch (error) {
    console.error('创建超级管理员失败:', error);
    throw error;
  }
}

// 创建或获取超级管理员角色
function createSuperAdminRole() {
  try {
    console.log('检查超级管理员角色...');

    // 检查是否已存在超级管理员角色
    const checkRole = db.prepare('SELECT * FROM roles WHERE name = ?');
    const existingRole = checkRole.get('superadmin');

    if (existingRole) {
      console.log('超级管理员角色已存在:', existingRole.display_name);
      return existingRole.id;
    }

    // 创建超级管理员角色
    const roleId = uuidv4();
    const createRole = db.prepare(`
      INSERT INTO roles (id, name, display_name, description, is_system)
      VALUES (?, ?, ?, ?, 1)
    `);

    createRole.run(
      roleId,
      'superadmin',
      '超级管理员',
      '拥有系统所有权限的超级管理员角色'
    );

    console.log('超级管理员角色创建成功!');
    return roleId;
  } catch (error) {
    console.error('创建超级管理员角色失败:', error);
    throw error;
  }
}

// 创建基础权限
function createBasicPermissions() {
  try {
    console.log('检查基础权限...');

    const basicPermissions = [
      { name: 'users:read', display_name: '查看用户', description: '查看用户信息的权限', resource: 'users', action: 'read' },
      { name: 'users:create', display_name: '创建用户', description: '创建新用户的权限', resource: 'users', action: 'create' },
      { name: 'users:update', display_name: '更新用户', description: '更新用户信息的权限', resource: 'users', action: 'update' },
      { name: 'users:delete', display_name: '删除用户', description: '删除用户的权限', resource: 'users', action: 'delete' },
      { name: 'users:manage', display_name: '管理用户', description: '完全管理用户的权限', resource: 'users', action: 'manage' },
      { name: 'roles:read', display_name: '查看角色', description: '查看角色信息的权限', resource: 'roles', action: 'read' },
      { name: 'roles:create', display_name: '创建角色', description: '创建新角色的权限', resource: 'roles', action: 'create' },
      { name: 'roles:update', display_name: '更新角色', description: '更新角色信息的权限', resource: 'roles', action: 'update' },
      { name: 'roles:delete', display_name: '删除角色', description: '删除角色的权限', resource: 'roles', action: 'delete' },
      { name: 'roles:manage', display_name: '管理角色', description: '完全管理角色的权限', resource: 'roles', action: 'manage' },
      { name: 'permissions:read', display_name: '查看权限', description: '查看权限信息的权限', resource: 'permissions', action: 'read' },
      { name: 'permissions:assign', display_name: '分配权限', description: '分配权限的权限', resource: 'permissions', action: 'assign' },
      { name: 'permissions:manage', display_name: '管理权限', description: '完全管理权限的权限', resource: 'permissions', action: 'manage' },
      { name: 'system:admin', display_name: '系统管理', description: '系统管理权限', resource: 'system', action: 'admin' },
      { name: 'chat:read', display_name: '查看对话', description: '查看对话记录的权限', resource: 'chat', action: 'read' },
      { name: 'chat:create', display_name: '创建对话', description: '创建新对话的权限', resource: 'chat', action: 'create' },
      { name: 'chat:update', display_name: '更新对话', description: '更新对话的权限', resource: 'chat', action: 'update' },
      { name: 'chat:delete', display_name: '删除对话', description: '删除对话的权限', resource: 'chat', action: 'delete' },
      { name: 'models:read', display_name: '查看模型', description: '查看AI模型的权限', resource: 'models', action: 'read' },
      { name: 'models:create', display_name: '创建模型', description: '创建AI模型的权限', resource: 'models', action: 'create' },
      { name: 'models:update', display_name: '更新模型', description: '更新AI模型的权限', resource: 'models', action: 'update' },
      { name: 'models:delete', display_name: '删除模型', description: '删除AI模型的权限', resource: 'models', action: 'delete' }
    ];

    const checkPermission = db.prepare('SELECT * FROM permissions WHERE name = ?');
    const createPermission = db.prepare(`
      INSERT INTO permissions (id, name, display_name, description, resource, action)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const createdPermissions = [];
    
    basicPermissions.forEach(permission => {
      const existing = checkPermission.get(permission.name);
      if (!existing) {
        const permissionId = uuidv4();
        createPermission.run(
          permissionId,
          permission.name,
          permission.display_name,
          permission.description,
          permission.resource,
          permission.action
        );
        createdPermissions.push(permission.name);
      }
    });

    if (createdPermissions.length > 0) {
      console.log(`创建了 ${createdPermissions.length} 个基础权限:`, createdPermissions);
    } else {
      console.log('所有基础权限已存在');
    }

    return basicPermissions.map(p => p.name);
  } catch (error) {
    console.error('创建基础权限失败:', error);
    throw error;
  }
}

// 分配用户角色
function assignUserRole(userId, roleId) {
  try {
    // 检查用户是否已有该角色
    const checkUserRole = db.prepare('SELECT * FROM user_roles WHERE user_id = ? AND role_id = ?');
    const existingRole = checkUserRole.get(userId, roleId);

    if (existingRole) {
      console.log('用户已经拥有该角色');
      return;
    }

    // 分配角色给用户
    const assignRole = db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)');
    assignRole.run(userId, roleId);
    console.log('角色分配成功');
  } catch (error) {
    console.error('分配用户角色失败:', error);
    throw error;
  }
}

// 为角色分配所有权限
function assignAllPermissionsToRole(roleId) {
  try {
    console.log('为角色分配所有权限...');

    // 获取所有权限
    const getAllPermissions = db.prepare('SELECT * FROM permissions');
    const permissions = getAllPermissions.all();

    console.log(`找到 ${permissions.length} 个权限`);

    // 为角色分配所有权限
    const checkRolePermission = db.prepare('SELECT * FROM role_permissions WHERE role_id = ? AND permission_id = ?');
    const grantPermission = db.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)');

    let grantedCount = 0;
    permissions.forEach(permission => {
      const existing = checkRolePermission.get(roleId, permission.id);
      if (!existing) {
        grantPermission.run(roleId, permission.id);
        grantedCount++;
      }
    });

    console.log(`为角色授予了 ${grantedCount} 个新权限`);
    return grantedCount;
  } catch (error) {
    console.error('分配权限失败:', error);
    throw error;
  }
}

// 主初始化函数
async function initializeSuperAdmin() {
  try {
    console.log('=== 开始初始化超级管理员系统 ===');
    console.log('');

    // 1. 创建基础权限
    console.log('步骤 1: 创建基础权限');
    createBasicPermissions();
    console.log('');

    // 2. 创建超级管理员角色
    console.log('步骤 2: 创建超级管理员角色');
    const superAdminRoleId = createSuperAdminRole();
    console.log('');

    // 3. 创建超级管理员用户
    console.log('步骤 3: 创建超级管理员用户');
    const superAdminUserId = await createSuperAdmin();
    console.log('');

    // 4. 分配角色给用户
    console.log('步骤 4: 分配超级管理员角色');
    assignUserRole(superAdminUserId, superAdminRoleId);
    console.log('');

    // 5. 为超级管理员角色分配所有权限
    console.log('步骤 5: 分配所有权限给超级管理员角色');
    const grantedCount = assignAllPermissionsToRole(superAdminRoleId);
    console.log('');

    console.log('=== 超级管理员系统初始化完成 ===');
    console.log('');
    console.log('🎉 初始化成功!');
    console.log('📋 初始化摘要:');
    console.log(`   - 超级管理员用户: ${SUPER_ADMIN_CONFIG.username}`);
    console.log(`   - 登录邮箱: ${SUPER_ADMIN_CONFIG.email}`);
    console.log(`   - 默认密码: ${SUPER_ADMIN_CONFIG.password}`);
    console.log(`   - 分配权限数量: ${grantedCount}`);
    console.log('');
    console.log('⚠️  重要提醒:');
    console.log('   1. 请立即登录并修改默认密码');
    console.log('   2. 建议在生产环境中通过环境变量设置密码');
    console.log('   3. 定期检查和更新权限配置');
    console.log('');

  } catch (error) {
    console.error('❌ 超级管理员初始化失败:', error);
    process.exit(1);
  } finally {
    db.close();
    console.log('数据库连接已关闭');
  }
}

// 检查命令行参数
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    force: false,
    password: null
  };

  args.forEach(arg => {
    if (arg === '--force' || arg === '-f') {
      options.force = true;
    } else if (arg.startsWith('--password=')) {
      options.password = arg.split('=')[1];
    }
  });

  return options;
}

// 主程序入口
async function main() {
  const options = parseArguments();
  
  // 如果提供了自定义密码，使用它
  if (options.password) {
    SUPER_ADMIN_CONFIG.password = options.password;
    console.log('使用自定义密码');
  }

  // 检查是否强制重新初始化
  if (!options.force) {
    const checkUser = db.prepare('SELECT * FROM users WHERE username = ?');
    const existingUser = checkUser.get(SUPER_ADMIN_CONFIG.username);
    
    if (existingUser) {
      console.log('⚠️  超级管理员已存在!');
      console.log('如果要重新初始化，请使用 --force 参数');
      console.log('例如: node init-admin.js --force');
      console.log('或者: node init-admin.js --force --password=YourNewPassword');
      db.close();
      return;
    }
  }

  await initializeSuperAdmin();
}

// 运行主程序
main().catch(error => {
  console.error('程序执行失败:', error);
  process.exit(1);
});
