import { z } from 'zod';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { db } from './connection';
import { AuthToken, CreateAuthTokenData } from './types';
import { JWT_ACCESS_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN, JWT_RESET_PASSWORD_EXPIRES_IN } from '../auth';

// 认证令牌验证模式
export const AuthTokenSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  token_hash: z.string(),
  token_type: z.enum(['access', 'refresh', 'reset_password']),
  expires_at: z.string(),
  created_at: z.string(),
  used_at: z.string().optional(),
  revoked_at: z.string().optional(),
});

export const CreateAuthTokenSchema = z.object({
  user_id: z.string().uuid(),
  token: z.string(),
  token_type: z.enum(['access', 'refresh', 'reset_password']),
  expires_at: z.string(),
});

// 认证令牌数据库查询语句
const authTokenQueries = {
  // 创建令牌
  create: db.prepare(`
    INSERT INTO auth_tokens (id, user_id, token_hash, token_type, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `),

  // 根据令牌哈希获取令牌信息
  getByTokenHash: db.prepare(`
    SELECT * FROM auth_tokens 
    WHERE token_hash = ? AND expires_at > datetime('now') AND revoked_at IS NULL
  `),

  // 根据用户ID和令牌类型获取令牌
  getByUserIdAndType: db.prepare(`
    SELECT * FROM auth_tokens 
    WHERE user_id = ? AND token_type = ? AND expires_at > datetime('now') AND revoked_at IS NULL
    ORDER BY created_at DESC
  `),

  // 根据用户ID获取所有有效令牌
  getValidTokensByUserId: db.prepare(`
    SELECT * FROM auth_tokens 
    WHERE user_id = ? AND expires_at > datetime('now') AND revoked_at IS NULL
    ORDER BY created_at DESC
  `),

  // 标记令牌为已使用
  markAsUsed: db.prepare(`
    UPDATE auth_tokens SET used_at = datetime('now') WHERE id = ?
  `),

  // 撤销令牌
  revoke: db.prepare(`
    UPDATE auth_tokens SET revoked_at = datetime('now') WHERE id = ?
  `),

  // 撤销用户的所有令牌
  revokeAllUserTokens: db.prepare(`
    UPDATE auth_tokens SET revoked_at = datetime('now') 
    WHERE user_id = ? AND revoked_at IS NULL
  `),

  // 撤销用户指定类型的令牌
  revokeUserTokensByType: db.prepare(`
    UPDATE auth_tokens SET revoked_at = datetime('now') 
    WHERE user_id = ? AND token_type = ? AND revoked_at IS NULL
  `),

  // 清理过期令牌
  cleanupExpired: db.prepare(`
    DELETE FROM auth_tokens WHERE expires_at <= datetime('now')
  `),

  // 获取令牌统计信息
  getStats: db.prepare(`
    SELECT 
      token_type,
      COUNT(*) as total,
      COUNT(CASE WHEN expires_at > datetime('now') AND revoked_at IS NULL THEN 1 END) as active,
      COUNT(CASE WHEN expires_at <= datetime('now') THEN 1 END) as expired,
      COUNT(CASE WHEN revoked_at IS NOT NULL THEN 1 END) as revoked
    FROM auth_tokens
    GROUP BY token_type
  `),
};

// 认证令牌操作函数
export const authTokenOperations = {
  // 创建令牌
  create(data: CreateAuthTokenData): string {
    const validatedData = CreateAuthTokenSchema.parse(data);
    
    // 生成UUID
    const tokenId = uuidv4();
    
    // 生成令牌哈希
    const tokenHash = crypto.createHash('sha256').update(validatedData.token).digest('hex');
    
    authTokenQueries.create.run(
      tokenId,
      validatedData.user_id,
      tokenHash,
      validatedData.token_type,
      validatedData.expires_at
    );

    return tokenId;
  },

  // 验证令牌
  verify(token: string): AuthToken | null {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const authToken = authTokenQueries.getByTokenHash.get(tokenHash) as AuthToken | undefined;
    
    if (!authToken) {
      return null;
    }

    // 检查令牌是否过期
    const now = new Date();
    const expiresAt = new Date(authToken.expires_at);
    if (now > expiresAt) {
      return null;
    }

    return authToken;
  },

  // 根据用户ID和令牌类型获取令牌
  getByUserIdAndType(userId: string, tokenType: 'access' | 'refresh' | 'reset_password'): AuthToken[] {
    return authTokenQueries.getByUserIdAndType.all(userId, tokenType) as AuthToken[];
  },

  // 获取用户的所有有效令牌
  getValidTokensByUserId(userId: string): AuthToken[] {
    return authTokenQueries.getValidTokensByUserId.all(userId) as AuthToken[];
  },

  // 标记令牌为已使用
  markAsUsed(tokenId: string): boolean {
    const result = authTokenQueries.markAsUsed.run(tokenId);
    return result.changes > 0;
  },

  // 撤销令牌
  revoke(tokenId: string): boolean {
    const result = authTokenQueries.revoke.run(tokenId);
    return result.changes > 0;
  },

  // 撤销令牌（通过令牌字符串）
  revokeByToken(token: string): boolean {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const authToken = authTokenQueries.getByTokenHash.get(tokenHash) as AuthToken | undefined;
    
    if (!authToken) {
      return false;
    }

    return this.revoke(authToken.id);
  },

  // 撤销用户的所有令牌
  revokeAllUserTokens(userId: string): boolean {
    const result = authTokenQueries.revokeAllUserTokens.run(userId);
    return result.changes > 0;
  },

  // 撤销用户指定类型的令牌
  revokeUserTokensByType(userId: string, tokenType: 'access' | 'refresh' | 'reset_password'): boolean {
    const result = authTokenQueries.revokeUserTokensByType.run(userId, tokenType);
    return result.changes > 0;
  },

  // 清理过期令牌
  cleanupExpired(): number {
    const result = authTokenQueries.cleanupExpired.run();
    return result.changes;
  },

  // 获取令牌统计信息
  getStats() {
    return authTokenQueries.getStats.all();
  },

  // 生成安全的随机令牌
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  },

  // 解析时间字符串为秒数
  parseTimeToSeconds(timeStr: string): number {
    const match = timeStr.match(/^(\d+)([smhd])$/);
    if (!match) return 3600; // 默认1小时
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 3600;
    }
  },

  // 生成JWT令牌的载荷
  generateJWTPayload(userId: string, tokenType: 'access' | 'refresh' | 'reset_password' = 'access') {
    const now = Math.floor(Date.now() / 1000);
    let expiresIn: number;
    
    switch (tokenType) {
      case 'access':
        expiresIn = this.parseTimeToSeconds(JWT_ACCESS_EXPIRES_IN);
        break;
      case 'refresh':
        expiresIn = this.parseTimeToSeconds(JWT_REFRESH_EXPIRES_IN);
        break;
      case 'reset_password':
        expiresIn = this.parseTimeToSeconds(JWT_RESET_PASSWORD_EXPIRES_IN);
        break;
      default:
        expiresIn = this.parseTimeToSeconds(JWT_ACCESS_EXPIRES_IN);
    }
    
    return {
      sub: userId,
      type: tokenType,
      iat: now,
      exp: now + expiresIn,
      jti: this.generateSecureToken(16), // JWT ID
    };
  },

  // 验证JWT令牌载荷
  validateJWTPayload(payload: any): boolean {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    const requiredFields = ['sub', 'type', 'iat', 'exp', 'jti'];
    for (const field of requiredFields) {
      if (!(field in payload)) {
        return false;
      }
    }

    // 检查令牌类型
    if (!['access', 'refresh', 'reset_password'].includes(payload.type)) {
      return false;
    }

    // 检查用户ID
    if (typeof payload.sub !== 'string' || !payload.sub) {
      return false;
    }

    // 检查时间戳
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      return false;
    }

    return true;
  },
};
