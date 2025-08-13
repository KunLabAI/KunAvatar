import path from 'path';

/**
 * 获取数据库路径的统一函数
 * 在不同环境下返回合适的数据库路径
 */
export const getDatabasePath = (): string => {
  // 🔧 修复：优先使用环境变量中的数据库路径（由Electron主进程设置）
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }
  
  // 🔧 修复：在生产环境中，检查是否在Windows用户数据目录中运行
  // 这是Electron应用的典型特征
  if (process.env.NODE_ENV === 'production' && process.platform === 'win32') {
    const cwd = process.cwd();
    // 检查是否在Electron应用的资源目录中
    if (cwd.includes('\\resources\\app') || cwd.includes('/resources/app')) {
      // 构建用户数据目录路径
      const os = require('os');
      const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'kun-avatar');
      return path.join(userDataPath, 'chat.db');
    }
  }
  
  // 检查是否在Electron环境中
  if (typeof window !== 'undefined' && window.process && window.process.type === 'renderer') {
    // 在渲染进程中，无法直接访问electron模块，使用默认路径
    return path.join(process.cwd(), 'chat.db');
  }
  
  // 检查是否在真正的Electron运行时环境中（不是构建时）
  if (typeof window === 'undefined' && 
      typeof process !== 'undefined' && 
      process.versions && 
      process.versions.electron &&
      typeof require !== 'undefined') {
    try {
      // 使用动态require避免构建时解析
      const electronModule = eval('require')('electron');
      const { app } = electronModule;
      if (app && typeof app.isReady === 'function' && app.isReady()) {
        // 在Electron环境中且app已就绪，使用用户数据目录
        const userDataPath = app.getPath('userData');
        return path.join(userDataPath, 'chat.db');
      } else if (app) {
        // Electron环境但app未就绪，返回临时路径，稍后会重新初始化
        return path.join(process.cwd(), 'chat.db');
      }
    } catch (error) {
      // electron模块不可用或其他错误，继续使用默认路径
    }
  }
  
  // 开发环境或非Electron环境，使用项目目录
  return path.join(process.cwd(), 'chat.db');
};

/**
 * 获取数据库锁文件路径
 */
export const getLockFilePath = (): string => {
  // 🔧 修复：优先使用环境变量中的锁文件路径（由Electron主进程设置）
  if (process.env.DATABASE_LOCK_PATH) {
    return process.env.DATABASE_LOCK_PATH;
  }
  
  // 🔧 修复：在生产环境中，检查是否在Windows用户数据目录中运行
  if (process.env.NODE_ENV === 'production' && process.platform === 'win32') {
    const cwd = process.cwd();
    // 检查是否在Electron应用的资源目录中
    if (cwd.includes('\\resources\\app') || cwd.includes('/resources/app')) {
      // 构建用户数据目录路径
      const os = require('os');
      const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'kun-avatar');
      return path.join(userDataPath, '.db-initialized');
    }
  }
  
  const dbPath = getDatabasePath();
  return path.join(path.dirname(dbPath), '.db-initialized');
};