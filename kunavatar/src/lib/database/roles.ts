import { db } from './connection';
import { z } from 'zod';
import { 
  Role, 
  CreateRoleData, 
  Permission, 
  CreatePermissionData,
  UserRole,
  RolePermission 
} from './types';

// 角色验证模式
export const RoleSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1).max(50),
  display_name: z.string().min(1).max(100),
  description: z.string().max(255).optional(),
  is_system: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateRoleSchema = z.object({
  name: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_]+$/, '角色名只能包含字母、数字和下划线').optional(),
  display_name: z.string().min(1).max(100),
  description: z.string().max(255).optional(),
  is_system: z.boolean().default(false),
});

// 前端创建角色时使用的简化模式（不需要提供name）
export const CreateRoleFromUISchema = z.object({
  display_name: z.string().min(1).max(100),
  description: z.string().max(255).optional(),
  is_system: z.boolean().default(false),
});

// 权限验证模式
export const PermissionSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1).max(100),
  display_name: z.string().min(1).max(100),
  description: z.string().max(255).optional(),
  resource: z.string().min(1).max(50),
  action: z.string().min(1).max(50),
  created_at: z.string(),
});

export const CreatePermissionSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_:]+$/, '权限名只能包含字母、数字、下划线和冒号'),
  display_name: z.string().min(1).max(100),
  description: z.string().max(255).optional(),
  resource: z.string().min(1).max(50),
  action: z.enum(['create', 'read', 'update', 'delete', 'manage']),
});

// 角色数据库查询语句
const roleQueries = {
  // 创建角色
  create: db.prepare(`
    INSERT INTO roles (id, name, display_name, description, is_system)
    VALUES (?, ?, ?, ?, ?)
  `),

  // 获取所有角色
  getAll: db.prepare(`
    SELECT r.*,
           COUNT(DISTINCT ur.user_id) as user_count,
           COUNT(DISTINCT rp.permission_id) as permission_count
    FROM roles r
    LEFT JOIN user_roles ur ON r.id = ur.role_id
    LEFT JOIN role_permissions rp ON r.id = rp.role_id
    GROUP BY r.id
    ORDER BY r.is_system DESC, r.created_at ASC
  `),

  // 根据ID获取角色
  getById: db.prepare(`
    SELECT * FROM roles WHERE id = ?
  `),

  // 根据名称获取角色
  getByName: db.prepare(`
    SELECT * FROM roles WHERE name = ?
  `),

  // 更新角色
  update: db.prepare(`
    UPDATE roles 
    SET name = ?, display_name = ?, description = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND is_system = 0
  `),

  // 删除角色
  delete: db.prepare(`
    DELETE FROM roles WHERE id = ? AND is_system = 0
  `),

  // 检查角色名是否存在
  checkNameExists: db.prepare(`
    SELECT COUNT(*) as count FROM roles WHERE name = ? AND id != ?
  `),
};

// 权限数据库查询语句
const permissionQueries = {
  // 创建权限
  create: db.prepare(`
    INSERT INTO permissions (name, display_name, description, resource, action)
    VALUES (?, ?, ?, ?, ?)
  `),

  // 获取所有权限
  getAll: db.prepare(`
    SELECT * FROM permissions ORDER BY resource, action
  `),

  // 根据ID获取权限
  getById: db.prepare(`
    SELECT * FROM permissions WHERE id = ?
  `),

  // 根据资源获取权限
  getByResource: db.prepare(`
    SELECT * FROM permissions WHERE resource = ? ORDER BY action
  `),

  // 更新权限
  update: db.prepare(`
    UPDATE permissions 
    SET name = ?, display_name = ?, description = ?, resource = ?, action = ?
    WHERE id = ?
  `),

  // 删除权限
  delete: db.prepare(`DELETE FROM permissions WHERE id = ?`),

  // 检查权限名是否存在
  checkNameExists: db.prepare(`
    SELECT COUNT(*) as count FROM permissions WHERE name = ? AND id != ?
  `),
};

// 用户角色关联查询语句
const userRoleQueries = {
  // 分配角色给用户
  assign: db.prepare(`
    INSERT OR IGNORE INTO user_roles (user_id, role_id, assigned_by)
    VALUES (?, ?, ?)
  `),

  // 移除用户角色
  remove: db.prepare(`
    DELETE FROM user_roles WHERE user_id = ? AND role_id = ?
  `),

  // 获取用户的所有角色
  getUserRoles: db.prepare(`
    SELECT r.* FROM roles r
    JOIN user_roles ur ON r.id = ur.role_id
    WHERE ur.user_id = ?
  `),

  // 获取角色的所有用户
  getRoleUsers: db.prepare(`
    SELECT u.id, u.username, u.email, u.first_name, u.last_name, ur.assigned_at
    FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    WHERE ur.role_id = ?
  `),

  // 检查用户是否有指定角色
  hasRole: db.prepare(`
    SELECT COUNT(*) as count FROM user_roles WHERE user_id = ? AND role_id = ?
  `),
};

// 角色权限关联查询语句
const rolePermissionQueries = {
  // 授予权限给角色
  grant: db.prepare(`
    INSERT OR IGNORE INTO role_permissions (role_id, permission_id, granted_by)
    VALUES (?, ?, ?)
  `),

  // 撤销角色权限
  revoke: db.prepare(`
    DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?
  `),

  // 获取角色的所有权限
  getRolePermissions: db.prepare(`
    SELECT p.* FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    WHERE rp.role_id = ?
  `),

  // 获取权限的所有角色
  getPermissionRoles: db.prepare(`
    SELECT r.* FROM roles r
    JOIN role_permissions rp ON r.id = rp.role_id
    WHERE rp.permission_id = ?
  `),

  // 检查角色是否有指定权限
  hasPermission: db.prepare(`
    SELECT COUNT(*) as count FROM role_permissions WHERE role_id = ? AND permission_id = ?
  `),

  // 获取用户的所有权限（通过角色）
  getUserPermissions: db.prepare(`
    SELECT DISTINCT p.* FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN user_roles ur ON rp.role_id = ur.role_id
    WHERE ur.user_id = ?
  `),
};

// 角色数据库操作函数
export const roleOperations = {
  // 创建角色
  create(data: CreateRoleData): string {
    const validatedData = CreateRoleSchema.parse(data);
    
    // 如果没有提供角色名，则自动生成
    let roleName = validatedData.name;
    if (!roleName) {
      // 基于显示名称生成角色名：转换为小写，替换空格和特殊字符为下划线，添加随机后缀
      const baseName = validatedData.display_name
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_|_$/g, '')
        .substring(0, 20); // 限制长度
      
      // 添加时间戳后缀确保唯一性
      const timestamp = Date.now().toString(36);
      roleName = `${baseName}_${timestamp}`;
      
      // 确保角色名符合规则（只包含字母、数字、下划线）
      roleName = roleName.replace(/[^a-zA-Z0-9_]/g, '_');
      
      // 如果生成的名称为空或只有下划线，使用默认前缀
      if (!roleName || /^_+$/.test(roleName)) {
        roleName = `role_${timestamp}`;
      }
    }
    
    // 检查角色名是否已存在
    const nameExists = roleQueries.checkNameExists.get(roleName, '') as { count: number };
    if (nameExists.count > 0) {
      throw new Error('角色名已存在');
    }

    // 生成UUID作为角色ID
    const roleId = crypto.randomUUID();
    
    const result = roleQueries.create.run(
      roleId,
      roleName,
      validatedData.display_name,
      validatedData.description || null,
      validatedData.is_system ? 1 : 0
    );
    
    if (result.changes === 0) {
      throw new Error('角色创建失败');
    }
    
    return roleId;
  },

  // 获取所有角色
  getAll(): Role[] {
    return roleQueries.getAll.all() as Role[];
  },

  // 根据ID获取角色
  getById(id: string): Role | undefined {
    return roleQueries.getById.get(id) as Role | undefined;
  },

  // 根据名称获取角色
  getByName(name: string): Role | undefined {
    return roleQueries.getByName.get(name) as Role | undefined;
  },

  // 更新角色
  update(id: string, data: Partial<CreateRoleData>): boolean {
    const currentRole = roleQueries.getById.get(id) as Role | undefined;
    if (!currentRole) {
      throw new Error('角色不存在');
    }

    if (currentRole.is_system) {
      throw new Error('系统角色不能修改');
    }

    // 检查角色名是否已被其他角色使用
    if (data.name) {
      const nameExists = roleQueries.checkNameExists.get(data.name, id) as { count: number };
      if (nameExists.count > 0) {
        throw new Error('角色名已存在');
      }
    }

    const result = roleQueries.update.run(
      data.name ?? currentRole.name,
      data.display_name ?? currentRole.display_name,
      data.description ?? currentRole.description,
      id
    );

    return result.changes > 0;
  },

  // 删除角色
  delete(id: string): boolean {
    const role = roleQueries.getById.get(id) as Role | undefined;
    if (!role) {
      throw new Error('角色不存在');
    }

    if (role.is_system) {
      throw new Error('系统角色不能删除');
    }

    const result = roleQueries.delete.run(id);
    return result.changes > 0;
  },
};

// 权限数据库操作函数
export const permissionOperations = {
  // 创建权限
  create(data: CreatePermissionData): number {
    const validatedData = CreatePermissionSchema.parse(data);
    
    // 检查权限名是否已存在
    const nameExists = permissionQueries.checkNameExists.get(validatedData.name, 0) as { count: number };
    if (nameExists.count > 0) {
      throw new Error('权限名已存在');
    }

    const result = permissionQueries.create.run(
      validatedData.name,
      validatedData.display_name,
      validatedData.description || null,
      validatedData.resource,
      validatedData.action
    );

    return result.lastInsertRowid as number;
  },

  // 获取所有权限
  getAll(): Permission[] {
    return permissionQueries.getAll.all() as Permission[];
  },

  // 根据ID获取权限
  getById(id: string): Permission | undefined {
    return permissionQueries.getById.get(id) as Permission | undefined;
  },

  // 根据资源获取权限
  getByResource(resource: string): Permission[] {
    return permissionQueries.getByResource.all(resource) as Permission[];
  },

  // 更新权限
  update(id: string, data: Partial<CreatePermissionData>): boolean {
    const currentPermission = permissionQueries.getById.get(id) as Permission | undefined;
    if (!currentPermission) {
      throw new Error('权限不存在');
    }

    // 检查权限名是否已被其他权限使用
    if (data.name) {
      const nameExists = permissionQueries.checkNameExists.get(data.name, id) as { count: number };
      if (nameExists.count > 0) {
        throw new Error('权限名已存在');
      }
    }

    const result = permissionQueries.update.run(
      data.name ?? currentPermission.name,
      data.display_name ?? currentPermission.display_name,
      data.description ?? currentPermission.description,
      data.resource ?? currentPermission.resource,
      data.action ?? currentPermission.action,
      id
    );

    return result.changes > 0;
  },

  // 删除权限
  delete(id: number): boolean {
    const result = permissionQueries.delete.run(id);
    return result.changes > 0;
  },
};

// 用户角色关联操作函数
export const userRoleOperations = {
  // 分配角色给用户
  assignRole(userId: string, roleId: string, assignedBy?: string): boolean {
    const result = userRoleQueries.assign.run(userId, roleId, assignedBy || null);
    return result.changes > 0;
  },

  // 移除用户角色
  removeRole(userId: string, roleId: string): boolean {
    const result = userRoleQueries.remove.run(userId, roleId);
    return result.changes > 0;
  },

  // 获取用户的所有角色
  getUserRoles(userId: string): Role[] {
    return userRoleQueries.getUserRoles.all(userId) as Role[];
  },

  // 获取角色的所有用户
  getRoleUsers(roleId: string) {
    return userRoleQueries.getRoleUsers.all(roleId);
  },

  // 检查用户是否有指定角色
  hasRole(userId: string, roleId: string): boolean {
    const result = userRoleQueries.hasRole.get(userId, roleId) as { count: number };
    return result.count > 0;
  },
};

// 角色权限关联操作函数
export const rolePermissionOperations = {
  // 授予权限给角色
  grantPermission(roleId: string, permissionId: string, grantedBy?: string): boolean {
    const result = rolePermissionQueries.grant.run(roleId, permissionId, grantedBy || null);
    return result.changes > 0;
  },

  // 撤销角色权限
  revokePermission(roleId: string, permissionId: string): boolean {
    const result = rolePermissionQueries.revoke.run(roleId, permissionId);
    return result.changes > 0;
  },

  // 获取角色的所有权限
  getRolePermissions(roleId: string): Permission[] {
    return rolePermissionQueries.getRolePermissions.all(roleId) as Permission[];
  },

  // 获取权限的所有角色
  getPermissionRoles(permissionId: string): Role[] {
    return rolePermissionQueries.getPermissionRoles.all(permissionId) as Role[];
  },

  // 检查角色是否有指定权限
  hasPermission(roleId: string, permissionId: string): boolean {
    const result = rolePermissionQueries.hasPermission.get(roleId, permissionId) as { count: number };
    return result.count > 0;
  },

  // 获取用户的所有权限（通过角色）
  getUserPermissions(userId: string): Permission[] {
    return rolePermissionQueries.getUserPermissions.all(userId) as Permission[];
  },
}
