'use client';

import React, { useState } from 'react';
import { Server, Axe, ChevronDown, ChevronRight, X } from 'lucide-react';
import { McpServer, McpTool } from '@/lib/database';

interface ServerToolSelectorProps {
  availableServers: McpServer[];
  allAvailableTools: McpTool[];
  selectedServerIds: number[];
  selectedToolIds: number[];
  onServerChange: (serverIds: number[]) => void;
  onToolChange: (toolIds: number[]) => void;
  maxTools?: number;
  disabled?: boolean; // 新增：禁用状态
}

export const ServerToolSelector: React.FC<ServerToolSelectorProps> = ({
  availableServers,
  allAvailableTools,
  selectedServerIds,
  selectedToolIds,
  onServerChange,
  onToolChange,
  maxTools = 10,
  disabled = false
}) => {
  // 管理每个服务器的展开状态
  const [expandedServers, setExpandedServers] = useState<Set<number>>(new Set());
  
  const handleServerToggle = (serverId: number) => {
    if (disabled) return; // 禁用时不响应点击
    
    const isSelected = selectedServerIds.includes(serverId);
    let newServerIds: number[];
    
    if (isSelected) {
      newServerIds = selectedServerIds.filter(id => id !== serverId);
      // 移除该服务器下的所有工具
      const toolsToRemove = allAvailableTools
        .filter(tool => tool.server_id === serverId)
        .map(tool => tool.id);
      const newToolIds = selectedToolIds.filter(toolId => !toolsToRemove.includes(toolId));
      onToolChange(newToolIds);
      // 收起服务器
      setExpandedServers(prev => {
        const newSet = new Set(prev);
        newSet.delete(serverId);
        return newSet;
      });
    } else {
      newServerIds = [...selectedServerIds, serverId];
      // 自动选择该服务器下的所有工具（在工具数量限制内）
      const serverTools = allAvailableTools.filter(tool => tool.server_id === serverId);
      const availableSlots = maxTools - selectedToolIds.length;
      const toolsToAdd = serverTools.slice(0, availableSlots).map(tool => tool.id);
      const newToolIds = [...selectedToolIds, ...toolsToAdd];
      onToolChange(newToolIds);
      // 注意：选中服务器时不自动展开，需要用户手动点击展开
    }
    
    onServerChange(newServerIds);
  };

  // 切换服务器展开状态
  const toggleServerExpanded = (serverId: number) => {
    if (disabled) return; // 禁用时不响应点击
    
    setExpandedServers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serverId)) {
        newSet.delete(serverId);
      } else {
        newSet.add(serverId);
      }
      return newSet;
    });
  };

  const handleToolToggle = (toolId: number) => {
    if (disabled) return; // 禁用时不响应点击
    
    const isSelected = selectedToolIds.includes(toolId);
    
    if (isSelected) {
      onToolChange(selectedToolIds.filter(id => id !== toolId));
    } else {
      if (selectedToolIds.length < maxTools) {
        onToolChange([...selectedToolIds, toolId]);
      }
    }
  };

  // 移除单个工具的函数
  const handleRemoveTool = (toolId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡
    if (disabled) return;
    onToolChange(selectedToolIds.filter(id => id !== toolId));
  };

  return (
    <div className={`space-y-4 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {availableServers.map(server => {
        const isServerSelected = selectedServerIds.includes(server.id);
        const isExpanded = expandedServers.has(server.id);
        const serverTools = allAvailableTools.filter(tool => tool.server_id === server.id);
        const selectedServerTools = serverTools.filter(tool => selectedToolIds.includes(tool.id));
        
        return (
          <div key={server.id} className="rounded-lg overflow-hidden">
            {/* 服务器选择 */}
            <div className={`flex items-start gap-3 p-4 transition-colors ${
              isServerSelected
                ? 'bg-theme-primary/10 border-theme-primary/30'
                : 'bg-theme-card hover:bg-theme-card-hover'
            }`}>
              {/* Checkbox区域 - 只负责选择服务器和全选工具 */}
              <label className={`flex items-center gap-3 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} mt-0.5`}>
                <input
                  type="checkbox"
                  checked={isServerSelected}
                  onChange={() => handleServerToggle(server.id)}
                  disabled={disabled}
                  className="w-4 h-4 text-theme-primary rounded focus:ring-theme-primary disabled:opacity-50"
                />
                <Server className="w-5 h-5 text-theme-foreground-muted" />
              </label>
              
              {/* 服务器信息区域 - 点击展开/收起 */}
              <div className="flex-1 min-w-0">
                <div 
                  className={`${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  onClick={() => !disabled && serverTools.length > 0 && toggleServerExpanded(server.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-theme-foreground">
                      {server.display_name}
                    </span>
                    {serverTools.length > 0 && (
                      <span className="text-xs text-theme-foreground-muted">
                        ({serverTools.length} 个工具)
                      </span>
                    )}
                  </div>
                </div>
                
                {/* 选中的工具标签 */}
                {selectedServerTools.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedServerTools.map(tool => (
                      <div
                        key={tool.id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-theme-primary text-white text-xs rounded-md shadow-sm"
                      >
                        <span className="truncate max-w-20">{tool.name}</span>
                        {!disabled && (
                          <button
                            onClick={(e) => handleRemoveTool(tool.id, e)}
                            className="flex-shrink-0 hover:bg-white/20 rounded-sm p-0.5 transition-colors"
                            title={`移除工具: ${tool.name}`}
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* 展开/收起按钮 - 始终显示（如果有工具） */}
              {serverTools.length > 0 && (
                <button
                  onClick={() => !disabled && toggleServerExpanded(server.id)}
                  disabled={disabled}
                  className="p-1 rounded hover:bg-theme-background-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-0.5"
                  title={isExpanded ? '收起工具列表' : '展开工具列表'}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-theme-foreground-muted" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-theme-foreground-muted" />
                  )}
                </button>
              )}
            </div>
            
            {/* 工具列表 */}
            {isExpanded && serverTools.length > 0 && (
              <div className="bg-theme-background-secondary">
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-3 text-xs text-theme-foreground-muted">
                    <Axe className="w-3 h-3" />
                    <span>选择工具 ({selectedServerTools.length}/{serverTools.length})</span>
                  </div>
                  <div className="space-y-2">
                    {serverTools.map(tool => {
                      const isToolSelected = selectedToolIds.includes(tool.id);
                      const isToolDisabled = disabled || (!isToolSelected && selectedToolIds.length >= maxTools);
                      
                      return (
                        <label 
                          key={tool.id}
                          className={`flex items-center gap-2 p-2 rounded text-xs transition-colors ${
                            isToolSelected
                              ? 'bg-theme-primary/5 text-theme-primary '
                              : isToolDisabled
                              ? 'bg-theme-card text-theme-foreground-muted cursor-not-allowed opacity-50'
                              : 'bg-theme-card text-theme-foreground hover:bg-theme-card-hover cursor-pointer'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isToolSelected}
                            onChange={() => handleToolToggle(tool.id)}
                            disabled={isToolDisabled}
                            className="w-3 h-3 text-theme-primary rounded focus:ring-theme-primary disabled:opacity-50"
                          />
                          <span className="font-medium">{tool.name}</span>
                          {tool.description && (
                            <span className="text-theme-foreground-muted ml-auto truncate">
                              {tool.description}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};