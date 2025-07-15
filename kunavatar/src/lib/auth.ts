import jwt from 'jsonwebtoken';
import { authTokenOperations, userOperations } from './database';
import { User } from './database/types';

// JWT配置
const JWT_SECRET = process.env.JWT_SECRET || 'kun-avatar-default-secret-key-change-in-production';
export const JWT_ACCESS_EXPIRES_IN = '30d'; // 30天
export const JWT_REFRESH_EXPIRES_IN = '30d'; // 30天
export const JWT_RESET_PASSWORD_EXPIRES_IN = '30d'; // 30天

// JWT载荷接口
export interface JWTPayload {
  sub: string; // 用户ID
  type: 'access' | 'refresh' | 'reset_password';
  iat: number; // 签发时间
  exp: number; // 过期时间
  jti: string; // JWT ID
}

// 认证结果接口
export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// 令牌验证结果接口
export interface TokenVerificationResult {
  valid: boolean;
  payload?: JWTPayload;
  user?: User;
  error?: string;
}

// JWT工具类
export class JWTManager {
  // 生成访问令牌
  static generateAccessToken(userId: string): string {
    const payload = authTokenOperations.generateJWTPayload(userId, 'access');
    return jwt.sign(payload, JWT_SECRET);
  }

  // 生成刷新令牌
  static generateRefreshToken(userId: string): string {
    const payload = authTokenOperations.generateJWTPayload(userId, 'refresh');
    return jwt.sign(payload, JWT_SECRET);
  }

  // 生成密码重置令牌
  static generateResetPasswordToken(userId: string): string {
    const payload = authTokenOperations.generateJWTPayload(userId, 'reset_password');
    return jwt.sign(payload, JWT_SECRET);
  }

  // 验证令牌
  static verifyToken(token: string): TokenVerificationResult {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

      // 验证载荷格式
      if (!authTokenOperations.validateJWTPayload(decoded)) {
        return { valid: false, error: '令牌格式无效' };
      }

      return { valid: true, payload: decoded };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return { valid: false, error: '令牌已过期' };
      } else if (error instanceof jwt.JsonWebTokenError) {
        return { valid: false, error: '令牌无效' };
      } else {
        return { valid: false, error: '令牌验证失败' };
      }
    }
  }

  // 刷新访问令牌
  static async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string } | null> {
    const verification = this.verifyToken(refreshToken);
    
    if (!verification.valid || !verification.payload) {
      return null;
    }

    if (verification.payload.type !== 'refresh') {
      return null;
    }

    const userId = verification.payload.sub;
    const accessToken = this.generateAccessToken(userId);
    
    return { accessToken };
  }

  // 解码令牌（不验证签名）
  static decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch {
      return null;
    }
  }
}

// 认证服务类
export class AuthService {
  // 用户登录
  static async login(username: string, password: string): Promise<AuthResult | null> {
    try {
      // 验证用户凭据
      const user = await userOperations.authenticate({ username, password });
      if (!user) {
        return null;
      }

      // 生成令牌
      const accessToken = JWTManager.generateAccessToken(user.id);
      const refreshToken = JWTManager.generateRefreshToken(user.id);

      // 存储刷新令牌到数据库
      const refreshPayload = JWTManager.decodeToken(refreshToken);
      if (refreshPayload) {
        await authTokenOperations.create({
          user_id: user.id,
          token: refreshToken,
          token_type: 'refresh',
          expires_at: new Date(refreshPayload.exp * 1000).toISOString(),
        });
      }

      return {
        user,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      console.error('登录失败:', error);
      return null;
    }
  }

  // 用户登出
  static async logout(refreshToken: string): Promise<boolean> {
    try {
      // 撤销刷新令牌
      return authTokenOperations.revokeByToken(refreshToken);
    } catch (error) {
      console.error('登出失败:', error);
      return false;
    }
  }

  // 验证访问令牌并获取用户信息
  static async verifyAccessToken(token: string): Promise<TokenVerificationResult> {
    const verification = JWTManager.verifyToken(token);
    
    if (!verification.valid || !verification.payload) {
      return verification;
    }

    if (verification.payload.type !== 'access') {
      return { valid: false, error: '令牌类型错误' };
    }

    // 获取用户信息
    const userId = verification.payload.sub;
    const user = userOperations.getById(userId);
    
    if (!user) {
      return { valid: false, error: '用户不存在' };
    }

    if (user.status !== 'active') {
      return { valid: false, error: '用户账户已被禁用' };
    }

    return {
      valid: true,
      payload: verification.payload,
      user,
    };
  }

  // 刷新访问令牌
  static async refreshToken(refreshToken: string): Promise<{ accessToken: string } | null> {
    try {
      // 验证刷新令牌是否在数据库中存在且有效
      const tokenRecord = authTokenOperations.verify(refreshToken);
      if (!tokenRecord || tokenRecord.token_type !== 'refresh') {
        return null;
      }

      // 使用JWT管理器刷新令牌
      return await JWTManager.refreshAccessToken(refreshToken);
    } catch (error) {
      console.error('刷新令牌失败:', error);
      return null;
    }
  }

  // 生成密码重置令牌
  static async generatePasswordResetToken(email: string): Promise<string | null> {
    try {
      // 查找用户
      const user = userOperations.getByEmail(email);
      if (!user) {
        return null;
      }

      // 生成重置令牌
      const resetToken = JWTManager.generateResetPasswordToken(user.id);
      const payload = JWTManager.decodeToken(resetToken);
      
      if (payload) {
        // 撤销之前的重置令牌
        authTokenOperations.revokeUserTokensByType(user.id, 'reset_password');
        
        // 存储新的重置令牌
        await authTokenOperations.create({
          user_id: user.id,
          token: resetToken,
          token_type: 'reset_password',
          expires_at: new Date(payload.exp * 1000).toISOString(),
        });
      }

      return resetToken;
    } catch (error) {
      console.error('生成密码重置令牌失败:', error);
      return null;
    }
  }

  // 验证密码重置令牌
  static async verifyPasswordResetToken(token: string): Promise<{ valid: boolean; userId?: string; error?: string }> {
    try {
      // 验证JWT令牌
      const verification = JWTManager.verifyToken(token);
      if (!verification.valid || !verification.payload) {
        return { valid: false, error: verification.error };
      }

      if (verification.payload.type !== 'reset_password') {
        return { valid: false, error: '令牌类型错误' };
      }

      // 验证令牌是否在数据库中存在且有效
      const tokenRecord = authTokenOperations.verify(token);
      if (!tokenRecord || tokenRecord.token_type !== 'reset_password') {
        return { valid: false, error: '令牌无效或已过期' };
      }

      const userId = verification.payload.sub;
      return { valid: true, userId };
    } catch (error) {
      console.error('验证密码重置令牌失败:', error);
      return { valid: false, error: '令牌验证失败' };
    }
  }

  // 重置密码
  static async resetPassword(token: string, newPassword: string): Promise<boolean> {
    try {
      // 验证重置令牌
      const verification = await this.verifyPasswordResetToken(token);
      if (!verification.valid || !verification.userId) {
        return false;
      }

      // 更新密码
      const success = await userOperations.updatePassword(verification.userId, newPassword);
      if (success) {
        // 标记令牌为已使用
        const tokenRecord = authTokenOperations.verify(token);
        if (tokenRecord) {
          authTokenOperations.markAsUsed(tokenRecord.id);
        }
        
        // 撤销用户的所有令牌（强制重新登录）
        authTokenOperations.revokeAllUserTokens(verification.userId);
      }

      return success;
    } catch (error) {
      console.error('重置密码失败:', error);
      return false;
    }
  }

  // 清理过期令牌
  static cleanupExpiredTokens(): number {
    return authTokenOperations.cleanupExpired();
  }
}
