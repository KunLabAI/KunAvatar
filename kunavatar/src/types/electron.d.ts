// Electron API 类型定义
export interface ElectronAPI {
  // 应用信息
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  
  // 更新检查
  checkForUpdates: () => Promise<{ hasUpdate: boolean; version: string }>;
  
  // 版本更新相关
  getAppInfo: () => Promise<{
    name: string;
    version: string;
    platform: string;
    arch: string;
    electronVersion: string;
    nodeVersion: string;
    chromeVersion: string;
  }>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  getVersionHistory: () => Promise<Array<{
    version: string;
    date: string;
    changes: string[];
  }>>;
  fetchGitHubReleases: () => Promise<Array<{
    version: string;
    releaseNotes: string;
    releaseDate: string;
    source: string;
    name: string;
    htmlUrl: string;
    timestamp: string;
    previousVersion: string | null;
  }>>;
  cleanDuplicateHistory: () => Promise<Array<{
    version: string;
    releaseNotes: string;
    releaseDate: string;
    source: string;
    name: string;
    htmlUrl: string;
    timestamp: string;
    previousVersion: string | null;
  }>>;
  getUpdateSettings: () => Promise<{
    autoCheck: boolean;
    checkInterval: number;
    skippedVersions: string[];
  }>;
  updateSettings: (settings: {
    autoCheck: boolean;
    checkInterval: number;
  }) => Promise<void>;
  skipVersion: (version: string) => Promise<void>;
  checkGitHubReleases: () => Promise<{
    hasUpdate: boolean;
    latestVersion: string;
    releaseNotes: string;
    downloadUrl: string;
  }>;
  exportSystemInfo: () => Promise<{ success: boolean; path?: string; error?: string }>;
  openVersionInfo: () => Promise<void>;
  openUpdateSettings: () => Promise<void>;
  
  // 更新事件监听
  onUpdateChecking: (callback: () => void) => void;
  onUpdateAvailable: (callback: (info: { version: string; releaseNotes: string }) => void) => void;
  onUpdateNotAvailable: (callback: () => void) => void;
  onUpdateError: (callback: (error: string) => void) => void;
  onDownloadProgress: (callback: (progress: { percent: number; bytesPerSecond: number; total: number; transferred: number }) => void) => void;
  onUpdateDownloaded: (callback: () => void) => void;
  onUpdateInstallSimulated: (callback: (data: { message: string }) => void) => void;
  
  // 菜单事件监听
  onMenuAction: (callback: () => void) => void;
  
  // 移除监听器
  removeAllListeners: (channel: string) => void;
  
  // 窗口控制
  minimize: () => Promise<{ success: boolean; error?: string }>;
  maximize: () => Promise<{ success: boolean; isMaximized?: boolean; error?: string }>;
  close: () => Promise<{ success: boolean; error?: string }>;
  
  // 截图覆盖窗口
  createScreenshotOverlay: () => Promise<{ success: boolean; error?: string }>;
  closeScreenshotOverlay: () => Promise<{ success: boolean; error?: string }>;
  onScreenshotOverlayReady: (callback: () => void) => void;
  onScreenshotSelection: (callback: (selection: { x: number; y: number; width: number; height: number }) => void) => void;
  onScreenshotCancel: (callback: () => void) => void;
  onScreenshotTaken: (callback: (imageDataUrl: string) => void) => void;
  onScreenshotError: (callback: (error: string) => void) => void;
  sendScreenshotSelection: (selection: { x: number; y: number; width: number; height: number }) => void;
  sendScreenshotCancel: () => void;
  
  // 窗口拖动区域设置
  setDragRegion: (selector: string) => void;
  removeDragRegion: (selector: string) => void;
  
  // 新增的窗口拖拽和状态管理 API
  getWindowState: () => Promise<{
    isMaximized: boolean;
    isMinimized: boolean;
    isFullScreen: boolean;
    bounds: { x: number; y: number; width: number; height: number };
  }>;
  startWindowDrag: () => void;
  stopWindowDrag: () => void;
  setupSmartDragRegion: (options: {
    headerSelectors?: string[];
    excludeSelectors?: string[];
    dragClass?: string;
  }) => void;
  
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