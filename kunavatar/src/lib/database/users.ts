import { db } from './connection';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { 
  User, 
  CreateUserData, 
  UpdateUserData, 
  UserQueryParams,
  LoginCredentials 
} from './types';

// Zod 验证模式
export const UserSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(1).max(50),
  email: z.string().email(),
  password_hash: z.string(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  avatar_url: z.string().url().optional(),
  status: z.enum(['pending', 'active', 'inactive', 'suspended']),
  email_verified: z.boolean(),
  last_login_at: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateUserSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6).max(128),
  first_name: z.string().max(50).optional(),
  last_name: z.string().max(50).optional(),
  avatar_url: z.string().url().optional(),
  status: z.enum(['pending', 'active', 'inactive', 'suspended']).default('pending'),
  email_verified: z.boolean().default(false),
  roles: z.array(z.string()).optional().default([]),
});

export const UpdateUserSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/).optional(),
  email: z.string().email().optional(),
  first_name: z.string().max(50).optional(),
  last_name: z.string().max(50).optional(),
  avatar_url: z.string().url().optional(),
  status: z.enum(['pending', 'active', 'inactive', 'suspended']).optional(),
  email_verified: z.boolean().optional(),
});

export const LoginCredentialsSchema = z.object({
  username: z.string().min(1, '用户名或邮箱不能为空'),
  password: z.string().min(1, '密码不能为空'),
});

// 数据库查询语句
const userQueries = {
  // 创建用户
  create: db.prepare(`
    INSERT INTO users (id, username, email, password_hash, first_name, last_name, avatar_url, status, email_verified)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  // 获取所有用户（支持分页和搜索）
  getAll: db.prepare(`
    SELECT u.*, 
           GROUP_CONCAT(r.display_name) as roles
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    WHERE 1=1
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `),

  // 根据ID获取用户
  getById: db.prepare(`
    SELECT u.*, 
           GROUP_CONCAT(r.display_name) as roles
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    WHERE u.id = ?
    GROUP BY u.id
  `),

  // 根据用户名获取用户
  getByUsername: db.prepare(`
    SELECT * FROM users WHERE username = ?
  `),

  // 根据邮箱获取用户
  getByEmail: db.prepare(`
    SELECT * FROM users WHERE email = ?
  `),

  // 根据用户名或邮箱获取用户（用于登录）
  getByUsernameOrEmail: db.prepare(`
    SELECT * FROM users WHERE username = ? OR email = ?
  `),

  // 更新用户信息
  update: db.prepare(`
    UPDATE users 
    SET username = ?, email = ?, first_name = ?, last_name = ?, 
        avatar_url = ?, status = ?, email_verified = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  // 更新用户密码
  updatePassword: db.prepare(`
    UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `),

  // 更新最后登录时间
  updateLastLogin: db.prepare(`
    UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?
  `),

  // 删除用户
  delete: db.prepare(`DELETE FROM users WHERE id = ?`),

  // 检查用户名是否存在
  checkUsernameExists: db.prepare(`
    SELECT COUNT(*) as count FROM users WHERE username = ? AND id != ?
  `),

  // 检查邮箱是否存在
  checkEmailExists: db.prepare(`
    SELECT COUNT(*) as count FROM users WHERE email = ? AND id != ?
  `),

  // 获取用户统计信息
  getStats: db.prepare(`
    SELECT 
      COUNT(*) as total_users,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_users,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
      COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_users,
      COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_users,
      COUNT(CASE WHEN email_verified = 1 THEN 1 END) as verified_users
    FROM users
  `)
};

// 用户数据库操作函数
export const userOperations = {
  // 创建用户
  async create(data: CreateUserData): Promise<string> {
    // 验证输入数据
    const validatedData = CreateUserSchema.parse(data);
    
    // 生成UUID
    const userId = uuidv4();
    
    // 检查用户名是否已存在
    const usernameExists = userQueries.checkUsernameExists.get(validatedData.username, '') as { count: number };
    if (usernameExists.count > 0) {
      throw new Error('用户名已存在');
    }

    // 检查邮箱是否已存在
    const emailExists = userQueries.checkEmailExists.get(validatedData.email, '') as { count: number };
    if (emailExists.count > 0) {
      throw new Error('邮箱已存在');
    }

    // 加密密码
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(validatedData.password, saltRounds);

    // 插入用户数据
    userQueries.create.run(
      userId,
      validatedData.username,
      validatedData.email,
      passwordHash,
      validatedData.first_name || null,
      validatedData.last_name || null,
      validatedData.avatar_url || null,
      validatedData.status,
      validatedData.email_verified ? 1 : 0
    );

    return userId;
  },

  // 获取所有用户
  getAll(params: UserQueryParams = {}): User[] {
    // 这里简化实现，实际应该支持分页、搜索、排序等
    const users = userQueries.getAll.all() as User[];
    return users;
  },

  // 根据ID获取用户
  getById(id: string): User | undefined {
    return userQueries.getById.get(id) as User | undefined;
  },

  // 根据用户名获取用户
  getByUsername(username: string): User | undefined {
    return userQueries.getByUsername.get(username) as User | undefined;
  },

  // 根据邮箱获取用户
  getByEmail(email: string): User | undefined {
    return userQueries.getByEmail.get(email) as User | undefined;
  },

  // 用户登录验证
  async authenticate(credentials: LoginCredentials): Promise<User | null> {
    const validatedCredentials = LoginCredentialsSchema.parse(credentials);
    
    // 根据用户名或邮箱查找用户
    const user = userQueries.getByUsernameOrEmail.get(
      validatedCredentials.username, 
      validatedCredentials.username
    ) as User | undefined;

    if (!user) {
      return null;
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(validatedCredentials.password, user.password_hash);
    if (!isPasswordValid) {
      return null;
    }

    // 检查用户状态
    if (user.status === 'pending') {
      throw new Error('用户账户待审核，请等待管理员审核后再登录');
    } else if (user.status !== 'active') {
      throw new Error('用户账户已被禁用或暂停');
    }

    // 更新最后登录时间
    userQueries.updateLastLogin.run(user.id);

    return user;
  },

  // 更新用户信息
  async update(id: string, data: UpdateUserData): Promise<boolean> {
    const validatedData = UpdateUserSchema.parse(data);
    
    // 获取当前用户信息
    const currentUser = userQueries.getById.get(id) as User | undefined;
    if (!currentUser) {
      throw new Error('用户不存在');
    }

    // 检查用户名是否已被其他用户使用
    if (validatedData.username) {
      const usernameExists = userQueries.checkUsernameExists.get(validatedData.username, id) as { count: number };
      if (usernameExists.count > 0) {
        throw new Error('用户名已存在');
      }
    }

    // 检查邮箱是否已被其他用户使用
    if (validatedData.email) {
      const emailExists = userQueries.checkEmailExists.get(validatedData.email, id) as { count: number };
      if (emailExists.count > 0) {
        throw new Error('邮箱已存在');
      }
    }

    // 更新用户信息
    const result = userQueries.update.run(
      validatedData.username ?? currentUser.username,
      validatedData.email ?? currentUser.email,
      validatedData.first_name ?? currentUser.first_name,
      validatedData.last_name ?? currentUser.last_name,
      validatedData.avatar_url ?? currentUser.avatar_url,
      validatedData.status ?? currentUser.status,
      (validatedData.email_verified ?? currentUser.email_verified) ? 1 : 0,
      id
    );

    return result.changes > 0;
  },

  // 更新用户密码
  async updatePassword(id: string, newPassword: string): Promise<boolean> {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('密码长度至少为6位');
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    const result = userQueries.updatePassword.run(passwordHash, id);
    return result.changes > 0;
  },

  // 删除用户
  delete(id: string): boolean {
    const result = userQueries.delete.run(id);
    return result.changes > 0;
  },

  // 获取用户统计信息
  getStats() {
    return userQueries.getStats.get();
  },
};
