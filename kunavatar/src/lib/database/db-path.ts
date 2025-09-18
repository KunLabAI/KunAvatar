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
  // 🔧 修复：添加更严格的环境检查，避免在Next.js构建时尝试加载electron
  if (typeof window === 'undefined' && 
      typeof process !== 'undefined' && 
      process.versions && 
      process.versions.electron &&
      typeof require !== 'undefined' &&
      // 确保不在Next.js构建环境中
      !process.env.NEXT_PHASE &&
      // 确保不在Webpack构建过程中
      typeof (globalThis as any).__webpack_require__ === 'undefined') {
    try {
      // 🔧 安全修复：使用更安全的方式动态导入electron模块
      // 只在真正的Electron运行时环境中尝试加载
      let electronModule;
      
      // 检查electron模块是否真的可用
       try {
         // 🔧 修复：使用更安全的动态require方式
         // 通过Function构造函数避免Webpack静态分析
         const dynamicRequire = new Function('moduleName', 'return require(moduleName)');
         electronModule = dynamicRequire('electron');
       } catch (requireError) {
         // electron模块不可用，跳过
         console.debug('Electron模块不可用，使用默认路径');
         return path.join(process.cwd(), 'chat.db');
       }
      
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
      console.debug('无法加载electron模块，使用默认数据库路径:', error);
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