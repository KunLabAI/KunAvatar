// Electron API 类型定义
export interface ElectronAPI {
  // 应用信息
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  
  // 更新检查
  checkForUpdates: () => Promise<{ hasUpdate: boolean; version: string }>;
  
  // 菜单事件监听
  onMenuAction: (callback: () => void) => void;
  
  // 移除监听器
  removeAllListeners: (channel: string) => void;
  
  // 窗口控制
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  
  // 文件系统操作
  selectFile: () => Promise<string | null>;
  selectFolder: () => Promise<string | null>;
  
  // 通知
  showNotification: (title: string, body: string) => Promise<void>;
  
  // 启动页面相关
  onSplashUpdate: (callback: (message: string) => void) => void;
  onSplashClose: (callback: () => void) => void;
  
  // 日志相关
  getLogPath: () => Promise<string>;
  getLogs: () => Promise<string>;
  exportLogs: () => Promise<{ success: boolean; path?: string; error?: string }>;
  openLogFolder: () => Promise<{ success: boolean; error?: string }>;
  
  // 页面导航
  reloadToLogin: () => Promise<{ success: boolean; error?: string }>;
}

// 扩展全局 Window 接口
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    electronDev?: {
      isDev: boolean;
      versions: NodeJS.ProcessVersions;
    };
  }
}

export {};