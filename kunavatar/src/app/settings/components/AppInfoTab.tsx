'use client';

import React, { useState, useEffect } from 'react';
import { Users, Globe, Mail, Package, Info, Code, Download, RefreshCw, CheckCircle, AlertCircle, History, ExternalLink } from 'lucide-react';
import { useNotification } from '@/components/notification';
import { MarkdownRenderer } from '../../chat/components/ui/MarkdownRenderer';



interface AppInfoTabProps {
  // 可以接收一些props
}

export function AppInfoTab({}: AppInfoTabProps) {
  const notification = useNotification();
  
  // 状态管理
  const [isElectron, setIsElectron] = useState(false);
  const [appInfo, setAppInfo] = useState<any>(null);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [versionHistory, setVersionHistory] = useState<any[]>([]);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error'>('idle');
  const [lastError, setLastError] = useState<string>('');
  
  // 从package.json动态获取版本信息（作为fallback）
  const packageJson = require('../../../../../package.json');
  const fallbackVersion = packageJson.version;

  // 检查是否在Electron环境中
  useEffect(() => {
    const checkElectron = typeof window !== 'undefined' && !!window.electronAPI;
    setIsElectron(checkElectron);
    
    if (checkElectron) {
      loadAppInfo();
      loadVersionHistory();
      setupUpdateListeners();
    }

    // 清理函数：移除所有事件监听器
    return () => {
      if (window.electronAPI && window.electronAPI.removeAllListeners) {
        window.electronAPI.removeAllListeners('update-checking');
        window.electronAPI.removeAllListeners('update-available');
        window.electronAPI.removeAllListeners('update-not-available');
        window.electronAPI.removeAllListeners('update-error');
        window.electronAPI.removeAllListeners('update-download-progress');
        window.electronAPI.removeAllListeners('update-downloaded');
        window.electronAPI.removeAllListeners('update-install-simulated');
      }
    };
  }, []);

  // 加载应用信息
  const loadAppInfo = async () => {
    try {
      if (window.electronAPI) {
        const info = await window.electronAPI.getAppInfo();
        setAppInfo(info);
      }
    } catch (error) {
      console.error('获取应用信息失败:', error);
    }
  };

  // 加载版本历史
  const loadVersionHistory = async () => {
    try {
      if (window.electronAPI) {
        // 首先清理重复的本地数据
        await window.electronAPI.cleanDuplicateHistory();
        
        // 然后尝试获取完整的GitHub版本历史
        const githubHistory = await window.electronAPI.fetchGitHubReleases();
        console.log('获取到的GitHub版本历史:', githubHistory);
        
        if (githubHistory && githubHistory.length > 0) {
          setVersionHistory(githubHistory);
        } else {
          // 如果GitHub API失败，回退到本地存储的版本历史
          const localHistory = await window.electronAPI.getVersionHistory();
          console.log('获取到的本地版本历史:', localHistory);
          setVersionHistory(localHistory || []);
        }
      }
    } catch (error) {
      console.error('获取版本历史失败:', error);
      // 出错时尝试获取本地版本历史
      try {
        if (window.electronAPI) {
          const localHistory = await window.electronAPI.getVersionHistory();
          setVersionHistory(localHistory || []);
        }
      } catch (localError) {
        console.error('获取本地版本历史也失败:', localError);
        setVersionHistory([]);
      }
    }
  };

  // 设置更新事件监听器
  const setupUpdateListeners = () => {
    if (!window.electronAPI) return;

    window.electronAPI.onUpdateChecking(() => {
      setUpdateStatus('checking');
      setIsCheckingUpdate(true);
    });

    window.electronAPI.onUpdateAvailable((info) => {
      setUpdateStatus('available');
      setUpdateInfo(info);
      setIsCheckingUpdate(false);
      notification.info('发现新版本', `新版本 ${info.version} 可用`);
    });

    window.electronAPI.onUpdateNotAvailable(() => {
      setUpdateStatus('idle');
      setIsCheckingUpdate(false);
      notification.success('已是最新版本', '当前版本已是最新版本');
    });

    window.electronAPI.onUpdateError((error) => {
      setUpdateStatus('error');
      setIsCheckingUpdate(false);
      setIsDownloading(false);
      setLastError(error);
      
      // 更优雅的错误处理和分类
      const processError = (errorMessage: string) => {
        // 开发模式相关错误（不显示给用户）
        const developmentErrors = [
          'dev-app-update.yml',
          'ENOENT',
          'no such file or directory',
          'Cannot parse releases feed',
          'HttpError: 406',
          'Unable to find latest version on GitHub'
        ];
        
        const isDevelopmentError = developmentErrors.some(pattern => 
          errorMessage.includes(pattern)
        );
        
        if (isDevelopmentError) {
          console.warn('开发模式更新检查错误（已忽略）:', errorMessage);
          return null; // 不显示给用户
        }
        
        // 网络相关错误
        if (errorMessage.includes('network') || 
            errorMessage.includes('timeout') || 
            errorMessage.includes('ECONNREFUSED') ||
            errorMessage.includes('ENOTFOUND')) {
          return {
            title: '网络连接问题',
            message: '无法连接到更新服务器，请检查网络连接后重试'
          };
        }
        
        // GitHub API相关错误
        if (errorMessage.includes('GitHub') || 
            errorMessage.includes('api.github.com') ||
            errorMessage.includes('releases')) {
          return {
            title: 'GitHub服务暂时不可用',
            message: '无法访问GitHub更新服务，请稍后重试'
          };
        }
        
        // 版本相关错误
        if (errorMessage.includes('No published versions') ||
            errorMessage.includes('no releases found')) {
          return {
            title: '暂无可用版本',
            message: '当前项目暂未发布正式版本，请关注项目更新'
          };
        }
        
        // 权限相关错误
        if (errorMessage.includes('permission') || 
            errorMessage.includes('EACCES')) {
          return {
            title: '权限不足',
            message: '没有足够权限执行更新操作，请以管理员身份运行'
          };
        }
        
        // 其他未知错误
        return {
          title: '更新检查失败',
          message: '检查更新时遇到问题，请稍后重试'
        };
      };
      
      const errorInfo = processError(error);
      
      if (errorInfo) {
        notification.error(errorInfo.title, errorInfo.message);
      }
    });

    window.electronAPI.onDownloadProgress((progress) => {
      setDownloadProgress(progress.percent);
      setUpdateStatus('downloading');
      setIsDownloading(true);
    });

    window.electronAPI.onUpdateDownloaded(() => {
      setUpdateStatus('downloaded');
      setIsDownloading(false);
      setDownloadProgress(100);
      notification.success('下载完成', '更新已下载完成，重启应用以安装更新');
    });

    // 监听开发模式下的模拟安装事件
    if (window.electronAPI.onUpdateInstallSimulated) {
      window.electronAPI.onUpdateInstallSimulated((data) => {
        notification.info('开发模式', data.message);
      });
    }
  };

  // 检查更新
  const handleCheckUpdate = async () => {
    if (!window.electronAPI) {
      notification.warning('功能限制', '更新检查功能仅在桌面应用中可用');
      return;
    }

    try {
      setIsCheckingUpdate(true);
      setUpdateStatus('checking');
      setLastError(''); // 清除之前的错误
      // 调用检查更新，结果通过事件监听器处理
      await window.electronAPI.checkForUpdates();
    } catch (error) {
      // 如果IPC调用本身失败，处理错误
      setIsCheckingUpdate(false);
      setUpdateStatus('error');
      const errorMsg = error instanceof Error ? error.message : String(error);
      setLastError(errorMsg);
      notification.error('检查更新失败', '无法启动更新检查，请稍后重试');
    }
  };

  // 下载更新
  const handleDownloadUpdate = async () => {
    if (!window.electronAPI) return;

    try {
      setIsDownloading(true);
      setUpdateStatus('downloading');
      setLastError(''); // 清除之前的错误
      await window.electronAPI.downloadUpdate();
    } catch (error) {
      setIsDownloading(false);
      setUpdateStatus('error');
      const errorMsg = error instanceof Error ? error.message : String(error);
      setLastError(errorMsg);
      notification.error('下载失败', '更新下载失败，请稍后重试');
    }
  };

  // 安装更新
  const handleInstallUpdate = async () => {
    if (!window.electronAPI) return;

    try {
      await window.electronAPI.installUpdate();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setLastError(errorMsg);
      setUpdateStatus('error');
      notification.error('安装失败', '更新安装失败，请稍后重试');
    }
  };

  // 获取当前版本
  const getCurrentVersion = () => {
    return appInfo?.version || fallbackVersion;
  };

  return (
    <section className="bg-theme-background">
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-6">
        <Info className="w-5 h-5" />
        <h2 className="text-xl font-semibold text-theme-foreground">应用信息</h2>
      </div>
        
        <div className="space-y-8">
        {/* 应用详情板块 */}
        <div className="bg-theme-card rounded-lg p-6 ">
          <h3 className="text-lg font-semibold text-theme-foreground mb-4">应用详情</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 开发团队 */}
            <div className="bg-theme-card rounded-lg p-4 border border-theme-border">
              <div className="flex items-center gap-3 mb-3">
                <Code className="w-5 h-5 text-theme-primary" />
                <h3 className="font-medium text-theme-foreground">开发团队</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-theme-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-theme-primary">Z</span>
                  </div>
                  <span className="text-theme-foreground">Zack</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-theme-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-theme-primary">B</span>
                  </div>
                  <span className="text-theme-foreground">Benny</span>
                </div>
              </div>
            </div>

            {/* 官方网站 */}
            <div className="bg-theme-card rounded-lg p-4 border border-theme-border">
              <div className="flex items-center gap-3 mb-3">
                <Globe className="w-5 h-5 text-theme-primary" />
                <h3 className="font-medium text-theme-foreground">官方网站</h3>
              </div>
              <a 
                href="https://kunpuai.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-theme-primary hover:text-theme-primary-hover transition-colors duration-200 flex items-center gap-2"
              >
                <span>kunpuai.com</span>
              </a>
            </div>

            {/* 支持邮箱 */}
            <div className="bg-theme-card rounded-lg p-4 border border-theme-border md:col-span-2">
              <div className="flex items-center gap-3 mb-3">
                <Mail className="w-5 h-5 text-theme-primary" />
                <h3 className="font-medium text-theme-foreground">支持邮箱</h3>
              </div>
              <a 
                href="mailto:info@kunpuai.com" 
                className="text-theme-primary hover:text-theme-primary-hover transition-colors duration-200 flex items-center gap-2"
              >
                <span>info@kunpuai.com</span>
                <Mail className="w-4 h-4" />
              </a>
              <p className="text-theme-foreground-muted text-sm mt-2">
                如有任何问题或建议，请随时联系我们的支持团队
              </p>
            </div>
          </div>
        </div>

        {/* 版本信息板块 */}
        <div className="bg-theme-card rounded-lg p-6">
          <h3 className="text-lg font-semibold text-theme-foreground mb-4">版本信息</h3>

          {/* 当前版本信息 */}
          <div className="bg-theme-card rounded-lg p-4 border border-theme-border mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium text-theme-foreground mb-1">当前版本</h4>
                {isElectron && appInfo && (
                  <p className="text-sm text-theme-foreground-muted">
                    {appInfo.platform} • {appInfo.arch}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-theme-primary/10 text-theme-primary">
                  v{getCurrentVersion()}
                </span>
              </div>
            </div>

            {/* 更新状态和操作 */}
            {isElectron && (
              <div className="space-y-3">
                {/* 更新状态指示器 */}
                <div className="flex items-center gap-2">
                  {updateStatus === 'checking' && (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-theme-primary" />
                      <span className="text-sm text-theme-foreground-muted">正在检查更新...</span>
                    </>
                  )}
                  {updateStatus === 'available' && updateInfo && (
                    <>
                      <AlertCircle className="w-4 h-4 text-orange-500" />
                      <span className="text-sm text-theme-foreground">发现新版本 v{updateInfo.version}</span>
                    </>
                  )}
                  {updateStatus === 'downloading' && (
                    <>
                      <Download className="w-4 h-4 text-theme-primary" />
                      <span className="text-sm text-theme-foreground-muted">
                        正在下载... {Math.round(downloadProgress)}%
                      </span>
                    </>
                  )}
                  {updateStatus === 'downloaded' && (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-theme-foreground">更新已下载完成</span>
                    </>
                  )}
                  {updateStatus === 'idle' && (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-theme-foreground-muted">已是最新版本</span>
                    </>
                  )}
                  {updateStatus === 'error' && (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-500">检查更新失败</span>
                    </>
                  )}
                </div>

                {/* 下载进度条 */}
                {updateStatus === 'downloading' && (
                  <div className="w-full bg-theme-border rounded-full h-2">
                    <div 
                      className="bg-theme-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                )}

                {/* 错误信息显示 - 更优雅的错误展示 */}
                {updateStatus === 'error' && lastError && (
                  <div className=" border-red-200 rounded-lg">
                    {(() => {
                      // 根据错误类型显示不同的用户友好信息
                      const getErrorDisplay = (errorMessage: string) => {
                        // 开发模式错误
                        const developmentErrors = [
                          'dev-app-update.yml',
                          'ENOENT',
                          'no such file or directory',
                          'Cannot parse releases feed',
                          'HttpError: 406',
                          'Unable to find latest version on GitHub'
                        ];
                        
                        const isDevelopmentError = developmentErrors.some(pattern => 
                          errorMessage.includes(pattern)
                        );
                        
                        if (isDevelopmentError) {
                          return {
                            userMessage: '开发模式下的更新检查功能受限，这是正常现象。在正式发布版本中，更新功能将正常工作。',
                            showDetails: false,
                            severity: 'info'
                          };
                        }
                        
                        // 网络错误
                        if (errorMessage.includes('network') || 
                            errorMessage.includes('timeout') || 
                            errorMessage.includes('ECONNREFUSED') ||
                            errorMessage.includes('ENOTFOUND')) {
                          return {
                            userMessage: '网络连接问题，请检查您的网络连接后重试。',
                            showDetails: true,
                            severity: 'warning'
                          };
                        }
                        
                        // GitHub相关错误
                        if (errorMessage.includes('GitHub') || 
                            errorMessage.includes('api.github.com') ||
                            errorMessage.includes('releases')) {
                          return {
                            userMessage: 'GitHub服务暂时不可用，请稍后重试。这可能是由于GitHub服务器维护或网络问题导致的。',
                            showDetails: true,
                            severity: 'warning'
                          };
                        }
                        
                        // 版本相关错误
                        if (errorMessage.includes('No published versions') ||
                            errorMessage.includes('no releases found')) {
                          return {
                            userMessage: '当前项目暂未发布正式版本，请关注项目更新。',
                            showDetails: false,
                            severity: 'info'
                          };
                        }
                        
                        // 默认错误
                        return {
                          userMessage: '检查更新时遇到问题，请稍后重试。',
                          showDetails: true,
                          severity: 'error'
                        };
                      };
                      
                      const errorDisplay = getErrorDisplay(lastError);
                      const bgColor = errorDisplay.severity === 'info' ? 'bg-blue-50 border-blue-200' : 
                                     errorDisplay.severity === 'warning' ? 'bg-yellow-50 border-yellow-200' : 
                                     'bg-red-50 border-red-200';
                      const textColor = errorDisplay.severity === 'info' ? 'text-blue-600' : 
                                       errorDisplay.severity === 'warning' ? 'text-yellow-600' : 
                                       'text-red-600';
                      const detailColor = errorDisplay.severity === 'info' ? 'text-blue-500' : 
                                         errorDisplay.severity === 'warning' ? 'text-yellow-500' : 
                                         'text-red-500';
                      
                      return (
                        <div className={`${bgColor} border rounded-lg p-3`}>
                          <p className={`text-sm ${textColor} mb-2`}>
                            {errorDisplay.userMessage}
                          </p>
                          {errorDisplay.showDetails && (
                            <details className="mt-2">
                              <summary className={`text-xs ${textColor} cursor-pointer hover:underline`}>
                                查看技术详情
                              </summary>
                              <p className={`text-xs ${detailColor} mt-1 font-mono bg-white/50 p-2 rounded border`}>
                                {lastError}
                              </p>
                            </details>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex gap-2">
                  <button
                    onClick={handleCheckUpdate}
                    disabled={isCheckingUpdate || isDownloading}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    检查更新
                  </button>

                  {updateStatus === 'available' && (
                    <button
                      onClick={handleDownloadUpdate}
                      disabled={isDownloading}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      下载更新
                    </button>
                  )}

                  {updateStatus === 'downloaded' && (
                    <button
                      onClick={handleInstallUpdate}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      <Package className="w-4 h-4" />
                      安装并重启
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 更新日志 */}
          {isElectron && versionHistory.length > 0 && (
            <div className="bg-theme-card rounded-lg p-4 border border-theme-border">
              <h4 className="font-medium text-theme-foreground mb-4 flex items-center gap-2">
                <History className="w-4 h-4" />
                更新日志
              </h4>
              <div className="space-y-4 max-h-80 rounded-lg overflow-y-auto scrollbar-thin bg-theme-background">
                {versionHistory.slice(0, 5).map((version, index) => {
                  return (
                    <div key={index} className="relative">
                      {/* 版本分隔线 */}
                      {index > 0 && (
                        <div className="absolute -top-2 left-0 right-0 h-px bg-theme-border/50"></div>
                      )}
                      
                      <div className="bg-theme-background/50 rounded-lg p-4">
                        {version.releaseNotes ? (
                          <div className="changelog-content">
                            <MarkdownRenderer content={version.releaseNotes} />
                          </div>
                        ) : (
                          <div className="text-theme-foreground-muted">
                            <p className="text-sm">暂无详细说明</p>
                          </div>
                        )}
                        
                        {/* 版本来源标签 */}
                        {version.source && (
                          <div className="mt-3 flex justify-end">
                            <span className="text-xs px-2 py-1 bg-theme-primary/10 text-theme-primary rounded-full border border-theme-primary/20">
                              来源: {version.source}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* 查看完整更新日志链接 */}
              <div className="mt-4 pt-4 border-t border-theme-border">
                <a 
                  href="https://github.com/KunLabAI/KunAvatar/releases" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-theme-primary hover:text-theme-primary-hover transition-colors duration-200 flex items-center gap-2 text-sm font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  查看完整更新日志
                </a>
              </div>
            </div>
          )}

          {/* 非Electron环境的提示 */}
          {!isElectron && (
            <div className="mt-4 text-center">
              <p className="text-theme-foreground-muted text-sm">
                感谢您使用 Kun Avatar！我们会持续改进产品体验。
              </p>
              <p className="text-theme-foreground-muted text-xs mt-2">
                更新功能仅在桌面应用中可用
              </p>
            </div>
          )}
        </div>


        </div>
      </div>
    </section>
  );
}