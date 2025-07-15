'use client';

import React, { useState, useEffect } from 'react';
import { Cpu, CheckCircle, XCircle } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { authenticatedFetch } from '@/lib/utils/auth-utils';

interface OllamaStatus {
  connected: boolean;
  version: string;
  error?: string;
}

export function InferenceEngineTab() {
  const { isAdmin } = usePermissions();
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>({
    connected: false,
    version: '检测中...'
  });
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [tempUrl, setTempUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 检测Ollama连接状态和版本
  const checkOllamaStatus = async () => {
    try {
      // 检查连接状态
      const statusResponse = await authenticatedFetch('/api/ollama/status');
      const versionResponse = await authenticatedFetch('/api/version');
      
      if (statusResponse.ok && versionResponse.ok) {
        const versionData = await versionResponse.json();
        setOllamaStatus({
          connected: true,
          version: versionData.version || '未知'
        });
      } else {
        setOllamaStatus({
          connected: false,
          version: '无法连接',
          error: '服务不可用'
        });
      }
    } catch (error) {
      console.error('检测Ollama状态失败:', error);
      setOllamaStatus({
        connected: false,
        version: '检测失败',
        error: '网络错误'
      });
    }
  };

  // 获取当前Ollama配置
  const fetchOllamaConfig = async () => {
    try {
      const response = await authenticatedFetch('/api/ollama/config');
      if (response.ok) {
        const config = await response.json();
        setOllamaUrl(config.baseUrl || 'http://localhost:11434');
      }
    } catch (error) {
      console.error('获取Ollama配置失败:', error);
    }
  };

  // 保存Ollama配置
  const saveOllamaConfig = async (url: string) => {
    if (url === ollamaUrl || !url.trim()) return;
    
    setIsSaving(true);
    try {
      const response = await authenticatedFetch('/api/ollama/config', {
        method: 'POST',
        body: JSON.stringify({ baseUrl: url.trim() }),
      });
      
      if (response.ok) {
        setOllamaUrl(url);
        // 保存后重新检测状态
        await checkOllamaStatus();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('保存配置失败:', errorData);
        // 恢复原值
        setTempUrl(ollamaUrl);
      }
    } catch (error) {
      console.error('保存Ollama配置失败:', error);
      // 恢复原值
      setTempUrl(ollamaUrl);
    } finally {
      setIsSaving(false);
    }
  };

  // 处理输入框失焦
  const handleBlur = () => {
    if (tempUrl !== ollamaUrl) {
      saveOllamaConfig(tempUrl);
    }
  };

  // 处理回车键
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.currentTarget as HTMLInputElement).blur();
    }
  };

  useEffect(() => {
    fetchOllamaConfig();
    checkOllamaStatus();
  }, []);

  // 同步tempUrl和ollamaUrl
  useEffect(() => {
    setTempUrl(ollamaUrl);
  }, [ollamaUrl]);

  return (
    <div className="bg-theme-background">
      <div className="space-y-6">
        {/* 标题 */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-theme-foreground flex items-center gap-2">
            <Cpu className="w-5 h-5" />
            推理引擎
          </h2>
        </div>
        
        {/* Ollama 板块 */}
        <div className="bg-theme-card rounded-lg p-4 border border-theme-border">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-theme-card border border-theme-border flex items-center justify-center">
                <svg 
                  width={36} 
                  height={36}
                  viewBox="0 0 24 24" 
                  className="text-theme-foreground fill-current"
                >
                  <title>Ollama</title>
                  <path d="M7.905 1.09c.216.085.411.225.588.41.295.306.544.744.734 1.263.191.522.315 1.1.362 1.68a5.054 5.054 0 012.049-.636l.051-.004c.87-.07 1.73.087 2.48.474.101.053.2.11.297.17.05-.569.172-1.134.36-1.644.19-.52.439-.957.733-1.264a1.67 1.67 0 01.589-.41c.257-.1.53-.118.796-.042.401.114.745.368 1.016.737.248.337.434.769.561 1.287.23.934.27 2.163.115 3.645l.053.04.026.019c.757.576 1.284 1.397 1.563 2.35.435 1.487.216 3.155-.534 4.088l-.018.021.002.003c.417.762.67 1.567.724 2.4l.002.03c.064 1.065-.2 2.137-.814 3.19l-.007.01.01.024c.472 1.157.62 2.322.438 3.486l-.006.039a.651.651 0 01-.747.536.648.648 0 01-.54-.742c.167-1.033.01-2.069-.48-3.123a.643.643 0 01.04-.617l.004-.006c.604-.924.854-1.83.8-2.72-.046-.779-.325-1.544-.8-2.273a.644.644 0 01.18-.886l.009-.006c.243-.159.467-.565.58-1.12a4.229 4.229 0 00-.095-1.974c-.205-.7-.58-1.284-1.105-1.683-.595-.454-1.383-.673-2.38-.61a.653.653 0 01-.632-.371c-.314-.665-.772-1.141-1.343-1.436a3.288 3.288 0 00-1.772-.332c-1.245.099-2.343.801-2.67 1.686a.652.652 0 01-.61.425c-1.067.002-1.893.252-2.497.703-.522.39-.878.935-1.066 1.588a4.07 4.07 0 00-.068 1.886c.112.558.331 1.02.582 1.269l.008.007c.212.207.257.53.109.785-.36.622-.629 1.549-.673 2.44-.05 1.018.186 1.902.719 2.536l.016.019a.643.643 0 01.095.69c-.576 1.236-.753 2.252-.562 3.052a.652.652 0 01-1.269.298c-.243-1.018-.078-2.184.473-3.498l.014-.035-.008-.012a4.339 4.339 0 01-.598-1.309l-.005-.019a5.764 5.764 0 01-.177-1.785c.044-.91.278-1.842.622-2.59l.012-.026-.002-.002c-.293-.418-.51-.953-.63-1.545l-.005-.024a5.352 5.352 0 01.093-2.49c.262-.915.777-1.701 1.536-2.269.06-.045.123-.09.186-.132-.159-1.493-.119-2.73.112-3.67.127-.518.314-.95.562-1.287.27-.368.614-.622 1.015-.737.266-.076.54-.059.797.042zm4.116 9.09c.936 0 1.8.313 2.446.855.63.527 1.005 1.235 1.005 1.94 0 .888-.406 1.58-1.133 2.022-.62.375-1.451.557-2.403.557-1.009 0-1.871-.259-2.493-.734-.617-.47-.963-1.13-.963-1.845 0-.707.398-1.417 1.056-1.946.668-.537 1.55-.849 2.485-.849zm0 .896a3.07 3.07 0 00-1.916.65c-.461.37-.722.835-.722 1.25 0 .428.21.829.61 1.134.455.347 1.124.548 1.943.548.799 0 1.473-.147 1.932-.426.463-.28.7-.686.7-1.257 0-.423-.246-.89-.683-1.256-.484-.405-1.14-.643-1.864-.643zm.662 1.21l.004.004c.12.151.095.37-.056.49l-.292.23v.446a.375.375 0 01-.376.373.375.375 0 01-.376-.373v-.46l-.271-.218a.347.347 0 01-.052-.49.353.353 0 01.494-.051l.215.172.22-.174a.353.353 0 01.49.051zm-5.04-1.919c.478 0 .867.39.867.871a.87.87 0 01-.868.871.87.87 0 01-.867-.87.87.87 0 01.867-.872zm8.706 0c.48 0 .868.39.868.871a.87.87 0 01-.868.871.87.87 0 01-.867-.87.87.87 0 01.867-.872zM7.44 2.3l-.003.002a.659.659 0 00-.285.238l-.005.006c-.138.189-.258.467-.348.832-.17.692-.216 1.631-.124 2.782.43-.128.899-.208 1.404-.237l.01-.001.019-.034c.046-.082.095-.161.148-.239.123-.771.022-1.692-.253-2.444-.134-.364-.297-.65-.453-.813a.628.628 0 00-.107-.09L7.44 2.3zm9.174.04l-.002.001a.628.628 0 00-.107.09c-.156.163-.32.45-.453.814-.29.794-.387 1.776-.23 2.572l.058.097.008.014h.03a5.184 5.184 0 011.466.212c.086-1.124.038-2.043-.128-2.722-.09-.365-.21-.643-.349-.832l-.004-.006a.659.659 0 00-.285-.239h-.004z"></path>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-theme-foreground mb-1">Ollama</h3>
                <p className="text-sm text-theme-foreground-muted">本地大语言模型推理引擎</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* 连接状态 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h4 className="text-lg font-medium text-theme-foreground mb-1">连接状态</h4>
              </div>
              <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                ollamaStatus.connected 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
              }`}>
                {ollamaStatus.connected ? 'online' : 'offline'}
              </span>
            </div>

            {/* 版本信息 */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-medium text-theme-foreground mb-1">版本信息</h4>
              </div>
              <span className="px-3 py-1 rounded-lg text-sm font-medium bg-theme-background border border-theme-border text-theme-foreground">
                {ollamaStatus.version}
              </span>
            </div>

            {/* 连接设置 - 仅管理员可见 */}
             {isAdmin && (
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-medium text-theme-foreground mb-1">连接设置</h4>
                </div>
                <div className="flex items-center gap-2">
                  {isSaving && (
                    <span className="text-sm text-theme-foreground-muted">保存中...</span>
                  )}
                  <div className="relative">
                    <input
                      type="url"
                      value={tempUrl}
                      onChange={(e) => setTempUrl(e.target.value)}
                      onBlur={handleBlur}
                      onKeyPress={handleKeyPress}
                      placeholder="http://localhost:11434"
                      className="px-3 py-2 text-sm font-mono bg-theme-background border border-theme-border rounded-lg text-theme-foreground focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent transition-colors min-w-[280px]"
                      disabled={isSaving}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
         </div>
       </div>
     </div>
   );
}