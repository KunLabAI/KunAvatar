'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, PlugZap, XCircle, Server, Wrench, Unplug } from 'lucide-react';
import { McpServer } from '../types';
import ModalWrapper from '@/app/model-manager/components/ModalWrapper';

interface ValidationResult {
  success: boolean;
  error?: string;
  message?: string;
  tools?: Array<{
    name: string;
    description: string;
    inputSchema?: any;
  }>;
  toolCount?: number;
}

interface AddServerModalProps {
  isOpen: boolean;
  newServer: Omit<McpServer, 'id' | 'status' | 'created_at' | 'updated_at'>;
  onServerChange: (server: Omit<McpServer, 'id' | 'status' | 'created_at' | 'updated_at'>) => void;
  onSubmit: (serverData?: any) => Promise<void>;
  onClose: () => void;
}

// 统一的表单区域组件
const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-6">
    <h3 className="section-title !text-theme-foreground-muted">{title}</h3>
    {children}
  </div>
);

// 统一的表单输入组件
const FormInput = ({ 
  label, 
  required = false, 
  error,
  hint,
  children
}: { 
  label: string; 
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    <label className="text-sm font-medium text-theme-foreground block">
      {label}
      {required && <span className="text-theme-error ml-1">*</span>}
    </label>
    {children}
    {error && (
      <p className="text-sm text-theme-error">{error}</p>
    )}
    {hint && !error && (
      <p className="text-xs text-theme-foreground-muted">{hint}</p>
    )}
  </div>
);

export function AddServerModal({
  isOpen,
  newServer,
  onServerChange,
  onSubmit,
  onClose
}: AddServerModalProps) {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showToolConfig, setShowToolConfig] = useState(false);
  const [toolConfigs, setToolConfigs] = useState<Record<string, any>>({});
  const [cachedServerKey, setCachedServerKey] = useState<string>(''); // 缓存的服务器标识
  const [toolsCache, setToolsCache] = useState<ValidationResult | null>(null); // 工具缓存
  const [nameError, setNameError] = useState<string>(''); // 服务器名称错误

  // 生成服务器唯一标识
  const getServerKey = useCallback((server: typeof newServer) => {
    if (server.type === 'stdio') {
      return `${server.type}-${server.command}-${server.args}`;
    } else {
      return `${server.type}-${server.url || server.base_url}`;
    }
  }, []);

  // 监听服务器配置变更，清除不匹配的缓存
  useEffect(() => {
    const currentKey = getServerKey(newServer);
    if (cachedServerKey && cachedServerKey !== currentKey) {
      // 服务器配置已变更，清除缓存
      setToolsCache(null);
      setValidationResult(null);
      setCachedServerKey('');
      setToolConfigs({});
    }
  }, [newServer, cachedServerKey, getServerKey]);

  // 监听模态框关闭，清除缓存
  useEffect(() => {
    if (!isOpen) {
      setToolsCache(null);
      setValidationResult(null);
      setCachedServerKey('');
      setToolConfigs({});
    }
  }, [isOpen]);

  // 验证服务器连接
  const validateServer = async () => {
    if (newServer.type === 'stdio') {
      if (!newServer.command) {
        alert('请先填写STDIO命令');
        return;
      }
    } else {
      if (!newServer.url) {
        alert('请先填写服务器URL');
        return;
      }
    }

    const currentKey = getServerKey(newServer);
    
    // 检查是否有缓存的结果
    if (toolsCache && cachedServerKey === currentKey) {
      setValidationResult(toolsCache);
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const response = await fetch('/api/mcp/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newServer)
      });

      if (!response.ok) {
        throw new Error(`服务器响应错误: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      setValidationResult(result);
      
      // 缓存验证结果
      if (result.success) {
        setToolsCache(result);
        setCachedServerKey(currentKey);
      }
      
      if (result.success && result.tools) {
        // 初始化工具配置
        const configs: Record<string, any> = {};
        result.tools.forEach((tool: any) => {
          if (tool.inputSchema && tool.inputSchema.properties) {
            const defaultConfig: any = {};
            Object.entries(tool.inputSchema.properties).forEach(([key, prop]: [string, any]) => {
              if (prop.default !== undefined) {
                defaultConfig[key] = prop.default;
              }
            });
            configs[tool.name] = defaultConfig;
          }
        });
        setToolConfigs(configs);
      }
    } catch (error) {
      const errorResult = {
        success: false,
        error: error instanceof Error ? error.message : '连接测试失败'
      };
      setValidationResult(errorResult);
    } finally {
      setIsValidating(false);
    }
  };

  // 处理添加服务器
  const handleAdd = async () => {
    // 验证服务器名称
    if (!newServer.name || !newServer.name.trim()) {
      setNameError('服务器名称不能为空');
      return;
    }
    
    const currentKey = getServerKey(newServer);
    let resultToUse = validationResult;
    
    // 如果没有验证结果但有缓存，使用缓存
    if (!resultToUse && toolsCache && cachedServerKey === currentKey) {
      resultToUse = toolsCache;
      setValidationResult(toolsCache);
    }
    
    // 验证连接是否通过
    if (!resultToUse?.success) {
      alert('请先测试服务器连接并确保连接成功');
      return;
    }
    
    // 将工具配置和验证时获取的工具信息添加到服务器配置中
    const serverWithConfig = {
      ...newServer,
      toolConfigs: toolConfigs,
      validatedTools: resultToUse.tools // 传递验证时获取的工具信息
    };
    
    console.log('AddServerModal: 准备提交的服务器配置:', JSON.stringify(serverWithConfig, null, 2));
    
    // 直接传递完整的服务器配置给onSubmit
    await onSubmit(serverWithConfig);
  };

  // 处理关闭
  const handleClose = () => {
    onClose();
    // 清理所有状态
    setValidationResult(null);
    setShowToolConfig(false);
    setToolConfigs({});
    setToolsCache(null);
    setCachedServerKey('');
    setNameError('');
  };

  // 检查是否可以提交
  const canSubmit = (() => {
    // 检查服务器名称是否填写
    if (!newServer.name || !newServer.name.trim()) {
      return false;
    }
    
    // 检查连接验证是否通过
    const currentKey = getServerKey(newServer);
    const hasValidResult = validationResult?.success;
    const hasCachedResult = toolsCache?.success && cachedServerKey === currentKey;
    
    return hasValidResult || hasCachedResult;
  })();

  const modalIcon = (
    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-theme-primary to-theme-accent flex items-center justify-center">
      <Server className="w-8 h-8 text-white" />
    </div>
  );

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={handleClose}
      title="添加 MCP 服务器"
      subtitle="配置新的模型上下文协议服务器"
      maxWidth="4xl"
      icon={modalIcon}
    >
      <div className="flex-1 flex flex-col min-h-0">
        {/* 主内容区域 */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-8 space-y-8">
            {/* 基本配置 */}
            <FormSection title="基本配置">
              <div className="space-y-6">
                <FormInput
                  label="服务器名称"
                  required={true}
                  error={nameError}
                >
                  <input
                    type="text"
                    value={newServer.name}
                    onChange={(e) => {
                      const value = e.target.value;
                      onServerChange({ ...newServer, name: value, display_name: value });
                      // 清除错误状态
                      if (nameError && value.trim()) {
                        setNameError('');
                      }
                    }}
                    className="form-input-base"
                    placeholder="用于识别服务器的唯一名称"
                  />
                </FormInput>
                <FormInput
                  label="描述"
                >
                  <textarea
                    value={newServer.description || ''}
                    onChange={(e) => onServerChange({ ...newServer, description: e.target.value })}
                    className="form-input-base h-20 resize-none"
                    placeholder="可选：描述服务器的用途和功能"
                  />
                </FormInput>

                <FormInput
                  label="服务器类型（选择服务器的连接方式）"
                >
                  <select
                    value={newServer.type}
                    onChange={(e) => {
                      const type = e.target.value as 'sse' | 'streamable-http';
                      onServerChange({ 
                        ...newServer, 
                        type
                      });
                    }}
                    className="form-input-base"
                  >
                    <option value="sse">SSE (Server-Sent Events)</option>
                    <option value="streamable-http">Streamable HTTP</option>
                  </select>
                </FormInput>

               
              </div>
            </FormSection>

            {/* 连接配置 */}
            <FormSection title="连接配置">
              <FormInput
                label="服务器URL"
                required={true}
              >
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newServer.url || ''}
                    onChange={(e) => onServerChange({ 
                      ...newServer, 
                      url: e.target.value 
                    })}
                    className="form-input-base flex-1"
                    placeholder={newServer.type === 'sse' ? "例如: https://mcp.api-inference.modelscope.net/******/sse" : "例如: http://localhost:8080/mcp"}
                  />
                  {/* 连接/断开按钮组 */}
                  <div className="flex">
                    {toolsCache && cachedServerKey === getServerKey(newServer) ? (
                      <button
                        onClick={() => {
                          // 断开连接 - 清除缓存
                          setToolsCache(null);
                          setValidationResult(null);
                          setCachedServerKey('');
                          setToolConfigs({});
                          setShowToolConfig(false);
                        }}
                        className="btn-base bg-theme-error text-white hover:bg-theme-error/80 px-4 py-2 flex-shrink-0"
                      >
                        <Unplug className="w-4 h-4 mr-2" />
                        断开
                      </button>
                    ) : (
                      <button
                        onClick={validateServer}
                        disabled={isValidating || !newServer.url}
                        className="btn-base btn-primary px-4 py-2 flex-shrink-0"
                      >
                        {isValidating ? (
                          <>
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                            连接中...
                          </>
                        ) : (
                          <>
                            <PlugZap className="w-4 h-4" />
                            连接
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </FormInput>

              {/* 验证结果 */}
              {validationResult && (
                <div className={`p-4 rounded-lg border ${
                  validationResult.success 
                    ? 'bg-theme-success/10 border-theme-success/20'
                    : 'bg-theme-error/10 border-theme-error/20'
                }`}>
                  <div className="flex items-center gap-3">
                    {validationResult.success ? (
                      <CheckCircle className="w-5 h-5 text-theme-success flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-theme-error flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <span className={`text-sm font-medium ${
                        validationResult.success 
                          ? 'text-theme-success'
                          : 'text-theme-error'
                      }`}>
                        {validationResult.success ? validationResult.message : validationResult.error}
                      </span>
                      {validationResult.success && validationResult.toolCount !== undefined && (
                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-sm text-theme-success">
                            发现 {validationResult.toolCount} 个可用工具
                          </p>
                          {validationResult.toolCount > 0 && (
                            <button
                              onClick={() => setShowToolConfig(!showToolConfig)}
                              className="btn-base bg-theme-card text-theme-primary hover:bg-theme-background-secondary px-3 py-1 text-sm"
                            >
                              <Wrench className="w-4 h-4 mr-2" />
                              {showToolConfig ? '隐藏' : '查看'}工具参数
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </FormSection>

            {/* 工具配置 */}
            {showToolConfig && validationResult?.success && validationResult.tools && (
              <FormSection title="工具参数配置">
                <div className="bg-theme-background-secondary rounded-lg p-6 border border-theme-border">
                  <div className="space-y-6 max-h-60 overflow-y-auto scrollbar-thin pr-2">
                    {validationResult.tools.map((tool) => (
                      <div key={tool.name} className="bg-theme-background rounded-lg p-4 border border-theme-border">
                        <div className="mb-3">
                          <h5 className="font-semibold text-theme-foreground text-sm">
                            {tool.name}
                          </h5>
                          <p className="text-xs text-theme-foreground-muted mt-1">
                            {tool.description}
                          </p>
                        </div>
                        {tool.inputSchema?.properties && (
                          <div className="space-y-3">
                            {Object.entries(tool.inputSchema.properties).map(([key, prop]: [string, any]) => (
                              <FormInput
                                key={key}
                                label={`${key}${prop.description ? ` (${prop.description})` : ''}`}
                              >
                                <input
                                  type="text"
                                  value={toolConfigs[tool.name]?.[key] || prop.default || ''}
                                  onChange={(e) => {
                                    const value = prop.type === 'number' ? Number(e.target.value) : e.target.value;
                                    setToolConfigs(prev => ({
                                      ...prev,
                                      [tool.name]: {
                                        ...prev[tool.name],
                                        [key]: value
                                      }
                                    }));
                                  }}
                                  className="form-input-base"
                                  placeholder={prop.default?.toString() || ''}
                                />
                              </FormInput>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </FormSection>
            )}
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="flex-shrink-0 p-8 pt-6 border-t border-theme-border bg-theme-background-secondary rounded-b-2xl">
          <div className="flex justify-end gap-3">
            <button
              onClick={handleClose}
              className="btn-base btn-secondary px-6 py-3"
            >
              取消
            </button>
            <button 
              onClick={handleAdd}
              disabled={!canSubmit}
              className="btn-base btn-primary px-6 py-3"
            >
              添加服务器
            </button>
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
}