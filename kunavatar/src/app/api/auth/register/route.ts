import { NextRequest, NextResponse } from 'next/server';
import { userOperations, roleOperations, userRoleOperations, rolePermissionOperations, permissionOperations, executeInitialization } from '@/lib/database';
import { getDatabasePath, getLockFilePath } from '@/lib/database/db-path';
import { z } from 'zod';
import Database from 'better-sqlite3';
import fs from 'fs';

// 注册请求验证模式
const RegisterRequestSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6).max(128, '密码长度必须在6-128位之间'),
  confirmPassword: z.string(),
  first_name: z.string().max(50).optional(),
  last_name: z.string().max(50).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "密码确认不匹配",
  path: ["confirmPassword"],
});

// 检查是否为第一个用户
function isFirstUser(): boolean {
  const stats = userOperations.getStats() as { total_users: number };
  return stats.total_users === 0;
}

// 确保数据库已初始化
function ensureDatabaseInitialized(): void {
  const dbPath = getDatabasePath();
  const lockFilePath = getLockFilePath();
  
  console.log(`检查数据库初始化状态 - 数据库路径: ${dbPath}, 锁文件路径: ${lockFilePath}`);
  
  // 如果锁文件不存在，说明数据库未初始化
  if (!fs.existsSync(lockFilePath)) {
    console.log('数据库未初始化，开始初始化...');
    const db = new Database(dbPath);
    executeInitialization(db);
    db.close();
    console.log('数据库初始化完成');
  } else {
    console.log('数据库已初始化');
  }
}

// 获取管理员角色
function getAdminRole(): string {
  // 获取系统预设的管理员角色
  const adminRole = roleOperations.getByName('admin');
  
  if (!adminRole) {
    throw new Error('系统管理员角色不存在，请检查数据库初始化');
  }
  
  return adminRole.id;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 验证请求数据
    const validatedData = RegisterRequestSchema.parse(body);
    
    // 确保数据库已初始化
    ensureDatabaseInitialized();
    
    // 检查是否为第一个用户
    const isFirst = isFirstUser();
    
    // 创建用户数据
    const userData = {
      username: validatedData.username,
      email: validatedData.email,
      password: validatedData.password,
      first_name: validatedData.first_name,
      last_name: validatedData.last_name,
      status: isFirst ? 'active' as const : 'pending' as const, // 第一个用户直接激活，其他用户需要审核
      email_verified: isFirst, // 第一个用户自动验证邮箱
    };

    // 创建用户
    const userId = await userOperations.create(userData);
    
    let message = '用户注册成功';
    let isFirstUserFlag = false;
    
    // 如果是第一个用户，自动设置为超级管理员
    if (isFirst) {
      try {
        // 获取超级管理员角色
        const superAdminRole = roleOperations.getByName('superadmin');
        if (!superAdminRole) {
          throw new Error('系统超级管理员角色不存在，请检查数据库初始化');
        }
        
        // 分配超级管理员角色给用户
        userRoleOperations.assignRole(userId, superAdminRole.id);
        
        message = '恭喜！您是第一个注册的用户，已自动设置为超级管理员，拥有所有系统权限';
        isFirstUserFlag = true;
      } catch (error) {
        console.error('设置超级管理员失败:', error);
        // 即使设置超级管理员失败，用户创建仍然成功
        message = '用户注册成功，但设置超级管理员权限时出现问题，请联系技术支持';
      }
    } else {
      message = '用户注册成功，请等待管理员审核后方可登录';
    }

    // 获取创建的用户信息（不包含密码）
    const user = userOperations.getById(userId);
    if (!user) {
      throw new Error('用户创建失败');
    }

    // 移除密码哈希字段
    const { password_hash, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      message,
      user: userWithoutPassword,
      isFirstUser: isFirstUserFlag,
    }, { status: 201 });

  } catch (error) {
    console.error('用户注册失败:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: '输入数据验证失败',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      }, { status: 400 });
    }

    if (error instanceof Error) {
      // 处理特定的业务错误
      if (error.message.includes('用户名已存在') || error.message.includes('邮箱已存在')) {
        return NextResponse.json({
          success: false,
          error: error.message,
        }, { status: 409 });
      }
    }

    return NextResponse.json({
      success: false,
      error: '用户注册失败',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}
