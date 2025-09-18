/**
 * Electron应用启动时的数据库初始化模块
 * 确保在electron环境中数据库和notes表正确初始化
 */

import path from 'path';
import fs from 'fs';

// 动态导入初始化脚本
let initializeElectronDatabase: () => void;

/**
 * 在electron应用启动时初始化数据库
 * 这个函数应该在app.whenReady()之前调用
 */
export async function initElectronDatabase(): Promise<void> {
  try {
    console.log('🚀 开始初始化Electron数据库...');
    
    // 动态导入初始化脚本
    const initScript = require(path.join(process.cwd(), 'scripts', 'electron-db-init.cjs'));
    initializeElectronDatabase = initScript.initializeElectronDatabase;
    
    // 执行数据库初始化
    await initializeElectronDatabase();
    
    console.log('✅ Electron数据库初始化完成');
  } catch (error) {
    console.error('❌ Electron数据库初始化失败:', error);
    // 不要阻止应用启动，但记录错误
  }
}

/**
 * 获取electron环境下的数据库路径
 */
export function getElectronDatabasePath(): string {
  // 优先使用环境变量
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }
  
  // 使用环境变量中的用户数据目录
  const userDataPath = process.env.ELECTRON_USER_DATA || process.env.APPDATA || process.env.HOME || '.';
  
  // 确保目录存在
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  
  return path.join(userDataPath, 'chat.db');
}

/**
 * 检查数据库是否需要初始化
 */
export function shouldInitializeDatabase(): boolean {
  try {
    const dbPath = getElectronDatabasePath();
    
    // 如果数据库文件不存在，需要初始化
    if (!fs.existsSync(dbPath)) {
      return true;
    }
    
    // 检查数据库文件大小，如果太小可能是空文件
    const stats = fs.statSync(dbPath);
    if (stats.size < 1024) { // 小于1KB
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('检查数据库状态时出错:', error);
    return true; // 出错时默认需要初始化
  }
}

/**
 * 设置electron环境的数据库路径环境变量
 */
export function setupElectronDatabaseEnv(): void {
  if (!process.env.DATABASE_PATH) {
    const dbPath = getElectronDatabasePath();
    process.env.DATABASE_PATH = dbPath;
    console.log('设置数据库路径环境变量:', dbPath);
  }
}

/**
 * 完整的electron数据库初始化流程
 * 应该在electron主进程启动时调用
 */
export async function setupElectronDatabase(): Promise<void> {
  try {
    console.log('🔧 开始设置Electron数据库环境...');
    
    // 1. 设置环境变量
    setupElectronDatabaseEnv();
    
    // 2. 总是执行数据库初始化（包括版本升级检查）
    console.log('📦 执行数据库初始化和版本检查...');
    await initElectronDatabase();
    
    console.log('🎉 Electron数据库环境设置完成');
  } catch (error) {
    console.error('❌ 设置Electron数据库环境失败:', error);
    throw error;
  }
}