'use client';

import { useState, useEffect } from 'react';
import { Settings, Play, Axe, Power, PowerOff, Loader2 } from 'lucide-react';
import { McpTool } from '../types';
import ModalWrapper from '../../model-manager/components/ModalWrapper';

interface ToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverName: string;
  tools: McpTool[];
  onUseTool: (tool: McpTool) => void;
  onToolUpdate?: (updatedTool: McpTool) => void;
  usingToolId?: string | null;
}

interface ToolConfig {
  [key: string]: any;
}

export function ToolsModal({
  isOpen,
  onClose,
  serverName,
  tools,
  onUseTool,
  onToolUpdate,
  usingToolId
}: ToolsModalProps) {
  const [selectedTool, setSelectedTool] = useState<McpTool | null>(null);
  const [toolConfigs, setToolConfigs] = useState<Record<string, ToolConfig>>({});
  const [showConfig, setShowConfig] = useState(false);

  // 当服务器或工具列表变化时，默认选中第一个工具
  useEffect(() => {
    if (tools && tools.length > 0) {
      const firstTool = tools[0];
      setSelectedTool(firstTool);
      initializeToolConfig(firstTool);
    } else {
      setSelectedTool(null);
    }
    setShowConfig(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverName, tools]);

  // 初始化工具配置
  const initializeToolConfig = (tool: McpTool) => {
    if (toolConfigs[tool.name]) return;
    
    const config: ToolConfig = {};
    if (tool.input_schema) {
      try {
        const schema = typeof tool.input_schema === 'string' 
          ? JSON.parse(tool.input_schema) 
          : tool.input_schema;
        
        if (schema.properties) {
          Object.entries(schema.properties).forEach(([key, prop]: [string, any]) => {
            config[key] = prop.default || '';
          });
        }
      } catch (error) {
        console.error('解析工具参数模式失败:', error);
      }
    }
    
    setToolConfigs(prev => ({
      ...prev,
      [tool.name]: config
    }));
  };

  // 更新工具配置
  const updateToolConfig = (toolName: string, key: string, value: any) => {
    setToolConfigs(prev => ({
      ...prev,
      [toolName]: {
        ...prev[toolName],
        [key]: value
      }
    }));
  };

  // 使用工具
  const handleUseTool = (tool: McpTool) => {
    const config = toolConfigs[tool.name] || {};
    const toolWithConfig = {
      ...tool,
      configuredArgs: config
    };
    onUseTool(toolWithConfig);
  };

  // 保存工具配置到数据库
  const saveToolConfig = async (tool: McpTool) => {
    try {
      const config = toolConfigs[tool.name] || {};
      const response = await fetch('/api/mcp/tool-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toolId: tool.id,
          serverName,
          toolName: tool.name,
          config
        })
      });
      
      if (response.ok) {
        alert('工具配置已保存');
      } else {
        alert('保存配置失败');
      }
    } catch (error) {
      console.error('保存工具配置失败:', error);
      alert('保存配置失败');
    }
  };

  // 切换工具启用状态
  const toggleToolEnabled = async (tool: McpTool) => {
    try {
      const newEnabled = !tool.enabled;
      const response = await fetch(`/api/mcp/tools/${tool.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: newEnabled
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && onToolUpdate) {
          onToolUpdate(result.tool);
        }
      } else {
        console.error('更新工具状态失败');
      }
    } catch (error) {
      console.error('更新工具状态失败:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={`${serverName} - 工具列表`}
      subtitle={`共 ${tools.length} 个工具`}
      icon={<Axe className="w-6 h-6 text-theme-primary" />}
      maxWidth="4xl"
    >
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(90vh - 120px)' }}>
          {/* 工具列表 */}
          <div className="w-1/2 border-r border-theme-border overflow-y-auto scrollbar-thin">
            <div className="p-4">
              {!Array.isArray(tools) || tools.length === 0 ? (
                <div className="text-center py-8">
                  <Axe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-theme-foreground-muted">暂无可用工具</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tools.map((tool, index) => {
                    const toolKey = tool.id ? tool.id.toString() : `${tool.name}-${index}`;
                    const isSelected = selectedTool?.name === tool.name;
                    
                    return (
                      <div
                        key={toolKey}
                        onClick={() => {
                          setSelectedTool(tool);
                          initializeToolConfig(tool);
                        }}
                        className={`border rounded-lg p-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-theme-primary bg-theme-primary/10'
                            : 'border-theme-border hover:border-theme-border-secondary'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium text-theme-foreground text-sm">
                              {tool.name}
                            </h5>
                            <p className="text-xs text-theme-foreground-muted mt-1">
                              {tool.description || '无描述'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleToolEnabled(tool);
                              }}
                              title={tool.enabled ? "禁用工具" : "启用工具"}
                              className={`p-1 rounded-md transition-colors ${
                                tool.enabled 
                                  ? 'text-theme-success hover:text-theme-error hover:bg-theme-error/10' 
                                  : 'text-theme-foreground-muted hover:text-theme-success hover:bg-theme-success/10'
                              }`}
                            >
                              {tool.enabled ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 工具详情和配置 */}
          <div className="w-1/2 overflow-y-auto scrollbar-thin">
            <div className="p-4">
              {!selectedTool ? (
                <div className="text-center py-8">
                  <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-theme-foreground-muted">选择工具查看详情</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 工具基本信息 */}
                  <div>
                    <h4 className="font-medium text-theme-foreground mb-2">
                      {selectedTool.name}
                    </h4>
                    <p className="text-sm text-theme-foreground-muted mb-4">
                      {selectedTool.description || '无描述'}
                    </p>
                  </div>

                  {/* 参数配置 */}
                  {selectedTool.input_schema && (
                    <div>
                      <h5 className="font-medium text-theme-foreground mb-3">
                        参数配置
                      </h5>
                      {(() => {
                        try {
                          const schema = typeof selectedTool.input_schema === 'string'
                            ? JSON.parse(selectedTool.input_schema)
                            : selectedTool.input_schema;
                          
                          if (!schema.properties) {
                            return (
                              <p className="text-sm text-theme-foreground-muted">该工具无需参数</p>
                            );
                          }

                          return (
                            <div className="space-y-3">
                              {Object.entries(schema.properties).map(([key, prop]: [string, any]) => {
                                const currentValue = toolConfigs[selectedTool.name]?.[key] || '';
                                const isRequired = schema.required?.includes(key);
                                
                                return (
                                  <div key={key}>
                                    <label className="block text-sm font-medium text-theme-foreground-muted mb-1">
                                      {key}
                                      {isRequired && <span className="text-red-500 ml-1">*</span>}
                                    </label>
                                    <p className="text-xs text-theme-foreground-muted mb-2">
                                      {prop.description || '无描述'}
                                    </p>
                                    {prop.type === 'boolean' ? (
                                      <select
                                        value={currentValue.toString()}
                                        onChange={(e) => updateToolConfig(
                                          selectedTool.name,
                                          key,
                                          e.target.value === 'true'
                                        )}
                                        className="w-full p-2 border border-theme-border rounded-md bg-theme-input text-theme-foreground text-sm"
                                      >
                                        <option value="false">false</option>
                                        <option value="true">true</option>
                                      </select>
                                    ) : prop.enum ? (
                                      <select
                                        value={currentValue}
                                        onChange={(e) => updateToolConfig(
                                          selectedTool.name,
                                          key,
                                          e.target.value
                                        )}
                                        className="w-full p-2 border border-theme-border rounded-md bg-theme-input text-theme-foreground text-sm"
                                      >
                                        <option value="">请选择...</option>
                                        {prop.enum.map((option: any) => (
                                          <option key={option} value={option}>
                                            {option}
                                          </option>
                                        ))}
                                      </select>
                                    ) : prop.type === 'number' || prop.type === 'integer' ? (
                                      <input
                                        type="number"
                                        value={currentValue}
                                        onChange={(e) => updateToolConfig(
                                          selectedTool.name,
                                          key,
                                          prop.type === 'integer' 
                                            ? parseInt(e.target.value) || 0
                                            : parseFloat(e.target.value) || 0
                                        )}
                                        className="w-full p-2 border border-theme-border rounded-md bg-theme-input text-theme-foreground text-sm"
                                        placeholder={prop.default?.toString() || ''}
                                      />
                                    ) : (
                                      <textarea
                                        value={currentValue}
                                        onChange={(e) => updateToolConfig(
                                          selectedTool.name,
                                          key,
                                          e.target.value
                                        )}
                                        className="w-full p-2 border border-theme-border rounded-md bg-theme-input text-theme-foreground text-sm"
                                        placeholder={prop.default?.toString() || ''}
                                        rows={prop.type === 'string' && prop.format === 'textarea' ? 3 : 1}
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        } catch (error) {
                          return (
                            <p className="text-sm text-theme-error">参数模式解析失败</p>
                          );
                        }
                      })()}
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex justify-center pt-4 border-t border-theme-border">
                    <button
                      onClick={() => handleUseTool(selectedTool)}
                      disabled={usingToolId === selectedTool.name}
                      title={usingToolId === selectedTool.name ? "工具执行中..." : "使用工具"}
                      className={`p-3 rounded-full transition-colors ${
                        usingToolId === selectedTool.name
                          ? 'bg-theme-primary/20 text-theme-primary cursor-not-allowed'
                          : 'bg-theme-primary text-white hover:bg-theme-primary-hover'
                      }`}
                    >
                      {usingToolId === selectedTool.name ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
      </div>
    </ModalWrapper>
  );
}