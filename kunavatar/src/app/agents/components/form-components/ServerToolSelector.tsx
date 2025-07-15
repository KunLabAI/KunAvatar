'use client';

import React, { useState } from 'react';
import { Server, Axe, ChevronDown, ChevronRight } from 'lucide-react';
import { McpServer, McpTool } from '@/lib/database';

interface ServerToolSelectorProps {
  availableServers: McpServer[];
  allAvailableTools: McpTool[];
  selectedServerIds: number[];
  selectedToolIds: number[];
  onServerChange: (serverIds: number[]) => void;
  onToolChange: (toolIds: number[]) => void;
  maxTools?: number;
}

export const ServerToolSelector: React.FC<ServerToolSelectorProps> = ({
  availableServers,
  allAvailableTools,
  selectedServerIds,
  selectedToolIds,
  onServerChange,
  onToolChange,
  maxTools = 10
}) => {
  // 管理每个服务器的展开状态
  const [expandedServers, setExpandedServers] = useState<Set<number>>(new Set());
  const handleServerToggle = (serverId: number) => {
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
    const isSelected = selectedToolIds.includes(toolId);
    
    if (isSelected) {
      onToolChange(selectedToolIds.filter(id => id !== toolId));
    } else {
      if (selectedToolIds.length < maxTools) {
        onToolChange([...selectedToolIds, toolId]);
      }
    }
  };

  return (
    <div className="space-y-4">
      {availableServers.map(server => {
        const isServerSelected = selectedServerIds.includes(server.id);
        const isExpanded = expandedServers.has(server.id);
        const serverTools = allAvailableTools.filter(tool => tool.server_id === server.id);
        
        return (
          <div key={server.id} className="border border-theme-border rounded-lg overflow-hidden">
            {/* 服务器选择 */}
            <div className={`flex items-center gap-3 p-4 transition-colors ${
              isServerSelected
                ? 'bg-theme-primary/10 border-theme-primary/30'
                : 'bg-theme-card hover:bg-theme-card-hover'
            }`}>
              {/* Checkbox区域 - 只负责选择服务器和全选工具 */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isServerSelected}
                  onChange={() => handleServerToggle(server.id)}
                  className="w-4 h-4 text-theme-primary border-theme-border rounded focus:ring-theme-primary"
                />
                <Server className="w-5 h-5 text-theme-foreground-muted" />
              </label>
              
              {/* 服务器信息区域 - 点击展开/收起 */}
              <div 
                className="flex-1 cursor-pointer" 
                onClick={() => serverTools.length > 0 && toggleServerExpanded(server.id)}
              >
                <span className="text-sm font-medium text-theme-foreground">
                  {server.display_name}
                </span>
                {serverTools.length > 0 && (
                  <p className="text-xs text-theme-foreground-muted mt-1">
                    包含 {serverTools.length} 个工具
                  </p>
                )}
              </div>
              
              {/* 展开/收起按钮 - 始终显示（如果有工具） */}
              {serverTools.length > 0 && (
                <button
                  onClick={() => toggleServerExpanded(server.id)}
                  className="p-1 rounded hover:bg-theme-background-secondary transition-colors"
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
                    <span>选择工具 ({selectedToolIds.filter(id => serverTools.some(t => t.id === id)).length}/{serverTools.length})</span>
                  </div>
                  <div className="space-y-2">
                    {serverTools.map(tool => {
                      const isToolSelected = selectedToolIds.includes(tool.id);
                      const isDisabled = !isToolSelected && selectedToolIds.length >= maxTools;
                      
                      return (
                        <label 
                          key={tool.id}
                          className={`flex items-center gap-2 p-2 rounded text-xs cursor-pointer transition-colors ${
                            isToolSelected
                              ? 'bg-theme-primary/5 text-theme-primary'
                              : isDisabled
                              ? 'bg-theme-card text-theme-foreground-muted cursor-not-allowed opacity-50'
                              : 'bg-theme-card text-theme-foreground hover:bg-theme-card-hover'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isToolSelected}
                            onChange={() => handleToolToggle(tool.id)}
                            disabled={isDisabled}
                            className="w-3 h-3 text-theme-primary border-theme-border rounded focus:ring-theme-primary"
                          />
                          <span className="font-medium">{tool.name}</span>
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