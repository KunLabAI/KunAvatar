'use client';

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { CheckSquare, Square, ChevronDown, ChevronRight, Server, Globe, GripVertical, X } from 'lucide-react';
import { Tool } from '@/lib/ollama';

interface ToolPanelProps {
  allTools: Tool[];
  selectedTools: string[];
  onToolSelection: (toolName: string) => void;
  onToggle: () => void;
}

interface GroupedTool extends Tool {
  serverName?: string;
  serverType?: string;
}

interface ServerGroup {
  name: string;
  displayName: string;
  type: 'local' | 'external';
  tools: GroupedTool[];
  expanded: boolean;
}

export function ToolPanel({ allTools, selectedTools, onToolSelection, onToggle }: ToolPanelProps) {
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set(['local']));
  const [panelHeight, setPanelHeight] = useState(300); // 默认高度与记忆面板保持一致
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [dragProgress, setDragProgress] = useState(0); // 拖拽进度 0-1
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const startHeight = useRef(0);
  const animationFrameRef = useRef<number>(0);
  const lastUpdateTime = useRef(0);
  const originalHeight = 400;
  const maxHeight = originalHeight * 2; // 原尺寸的2倍
  const minHeight = 200; // 最小高度200px

  // 按服务器分组工具
  const serverGroups = useMemo(() => {
    const groups = new Map<string, ServerGroup>();
    
    // 只显示启用的工具
    const enabledTools = allTools.filter((tool: any) => {
      return tool.enabled !== false;
    }) as GroupedTool[];

    enabledTools.forEach((tool) => {
      const serverName = (tool as any).serverName || 'local';
      // 使用数据库中的server_type字段来正确分类服务器
      const dbServerType = (tool as any).serverType || 'stdio';
      const serverType = dbServerType === 'stdio' ? 'local' : 'external';
      
      
      if (!groups.has(serverName)) {
        groups.set(serverName, {
          name: serverName,
          displayName: serverName === 'local' ? '本地工具' : serverName,
          type: serverType,
          tools: [],
          expanded: expandedServers.has(serverName)
        });
      }
      
      groups.get(serverName)!.tools.push({
        ...tool,
        serverName,
        serverType: dbServerType
      });
    });

    // 转换为数组并排序（本地工具在前）
    return Array.from(groups.values()).sort((a, b) => {
      if (a.type === 'local' && b.type !== 'local') return -1;
      if (a.type !== 'local' && b.type === 'local') return 1;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [allTools, expandedServers]);

  const toggleServerExpansion = (serverName: string) => {
    const newExpanded = new Set(expandedServers);
    if (newExpanded.has(serverName)) {
      newExpanded.delete(serverName);
    } else {
      newExpanded.add(serverName);
    }
    setExpandedServers(newExpanded);
  };

  const getServerSelectedCount = (tools: GroupedTool[]) => {
    return tools.filter(tool => selectedTools.includes(tool.function.name)).length;
  };

  // 平滑动画更新高度
  const smoothUpdateHeight = useCallback((targetHeight: number) => {
    const now = performance.now();
    if (now - lastUpdateTime.current < 8) return; // 限制更新频率到120fps
    
    lastUpdateTime.current = now;
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      setPanelHeight(targetHeight);
      // 计算拖拽进度
      const progress = (targetHeight - minHeight) / (maxHeight - minHeight);
      setDragProgress(Math.max(0, Math.min(1, progress)));
    });
  }, [minHeight, maxHeight]);

  // 清理动画帧
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    dragStartY.current = e.clientY;
    startHeight.current = panelHeight;
    
    // 添加触觉反馈（如果支持）
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      
      const deltaY = dragStartY.current - e.clientY; // 向上拖拽为正值
      
      // 改进的拖拽算法：使用缓动函数和更精确的计算
      const sensitivity = 1.2; // 提高敏感度
      const rawHeightChange = deltaY * sensitivity;
      
      // 在边界附近添加阻力效果
      let heightChange = rawHeightChange;
      const targetHeight = startHeight.current + rawHeightChange;
      
      if (targetHeight < minHeight) {
        // 下边界阻力
        const overflow = minHeight - targetHeight;
        heightChange = rawHeightChange + overflow * 0.7; // 70%的阻力
      } else if (targetHeight > maxHeight) {
        // 上边界阻力
        const overflow = targetHeight - maxHeight;
        heightChange = rawHeightChange - overflow * 0.7; // 70%的阻力
      }
      
      const newHeight = Math.max(
        minHeight * 0.9, // 允许轻微超出下边界
        Math.min(
          maxHeight * 1.1, // 允许轻微超出上边界
          startHeight.current + heightChange
        )
      );
      
      smoothUpdateHeight(newHeight);
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      
      // 边界回弹动画
      const finalHeight = Math.max(minHeight, Math.min(maxHeight, panelHeight));
      if (finalHeight !== panelHeight) {
        // 使用CSS transition实现回弹
        if (panelRef.current) {
          panelRef.current.style.transition = 'height 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
          setTimeout(() => {
            if (panelRef.current) {
              panelRef.current.style.transition = '';
            }
          }, 300);
        }
        smoothUpdateHeight(finalHeight);
      }
      
      setIsDragging(false);
      
      // 添加完成触觉反馈
       if ('vibrate' in navigator) {
         navigator.vibrate(5);
       }
       
       // 清理动画帧
       if (animationFrameRef.current) {
         cancelAnimationFrame(animationFrameRef.current);
       }
    };
    
    // 防止页面滚动和文本选择
     document.body.style.overflow = 'hidden';
     document.body.style.userSelect = 'none';
     
     // 增强的mouseup处理函数
     const enhancedHandleMouseUp = (e: MouseEvent) => {
       // 恢复页面状态
       document.body.style.overflow = '';
       document.body.style.userSelect = '';
       
       // 移除事件监听器
       document.removeEventListener('mousemove', handleMouseMove);
       document.removeEventListener('mouseup', enhancedHandleMouseUp);
       
       // 调用原始处理函数
       handleMouseUp(e);
     };
     
     document.addEventListener('mousemove', handleMouseMove, { passive: false });
     document.addEventListener('mouseup', enhancedHandleMouseUp, { passive: false });
  }, [panelHeight, smoothUpdateHeight, minHeight, maxHeight]);

  return (
    <div 
        ref={panelRef}
        className="w-full bg-theme-card border border-theme-border rounded-xl shadow-lg overflow-hidden flex flex-col"
        style={{ height: `${panelHeight}px` }}
      >
      {/* 拖拽手柄 */}
      <div 
        className={`relative flex items-center justify-center h-2 bg-theme-background-secondary border-b border-theme-border cursor-ns-resize select-none transition-all duration-200 ${
          isDragging 
            ? 'bg-theme-primary/15' 
            : isHovering 
            ? 'bg-theme-card-hover' 
            : 'hover:bg-theme-card-hover'
        }`}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        title="拖拽调整面板高度"
        style={{ userSelect: 'none' }}
      >
        {/* 拖拽进度指示器 */}
        <div 
          className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-theme-primary to-theme-primary/60 transition-all duration-200"
          style={{ 
            width: `${dragProgress * 100}%`,
            opacity: isDragging || isHovering ? 1 : 0
          }}
        />
        
        {/* 简化的拖拽图标 */}
        <GripVertical className={`w-3 h-3 transition-colors duration-200 ${
          isDragging 
            ? 'text-theme-primary' 
            : isHovering 
            ? 'text-theme-foreground'
            : 'text-theme-foreground-muted'
        }`} />
      </div>
      
      <div className="p-4 flex-1 flex flex-col min-h-0">
        {/* 工具面板头部 */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-theme-primary" />
              <span className="text-sm font-medium text-theme-foreground">MCP 工具选择</span>
            </div>
            <div className="text-xs text-theme-foreground-muted ml-6">
              选择要启用的工具，已选择 {selectedTools.length} 个工具
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={onToggle}
              className="p-1 hover:bg-theme-card-hover rounded-lg transition-colors"
              title="关闭工具面板"
            >
              <X className="w-4 h-4 text-theme-foreground-muted hover:text-theme-foreground transition-colors" />
            </button>
          </div>
        </div>
        <div 
          className={`space-y-2 overflow-y-auto scrollbar-thin transition-all duration-200 flex-1 ${
            isDragging ? 'scroll-smooth' : ''
          }`}
          style={{ 
             scrollBehavior: isDragging ? 'smooth' : 'auto',
             // 拖拽时减少滚动敏感度
             overflowY: isDragging ? 'hidden' : 'auto'
           }}
        >
        {serverGroups.map((serverGroup) => {
          const isExpanded = expandedServers.has(serverGroup.name);
          const selectedCount = getServerSelectedCount(serverGroup.tools);
          
          return (
            <div key={serverGroup.name} className="rounded-lg">
              {/* 服务器头部 */}
              <div
                onClick={() => toggleServerExpansion(serverGroup.name)}
                className="flex items-center gap-2 p-3 cursor-pointer hover:bg-theme-card-hover transition-colors rounded-lg"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-theme-foreground-muted" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-theme-foreground-muted" />
                )}
                
                {serverGroup.type === 'local' ? (
                  <Server className="w-4 h-4 text-theme-primary" />
                ) : (
                  <Globe className="w-4 h-4 text-green-500" />
                )}
                
                <div className="flex-1 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-theme-foreground">
                      {serverGroup.displayName}
                    </span>
                    <span className="ml-2 text-xs text-theme-foreground-muted">
                      ({serverGroup.type === 'local' ? '本地' : '外部'})
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-theme-foreground-muted">
                      {serverGroup.tools.length} 个工具
                    </span>
                  </div>
                </div>
              </div>
              
              {/* 工具列表 */}
              {isExpanded && (
                <div className=" p-2 space-y-1">
                  {serverGroup.tools.map((tool) => {
                    const isSelected = selectedTools.includes(tool.function.name);
                    return (
                      <div
                        key={tool.function.name}
                        onClick={() => onToolSelection(tool.function.name)}
                        className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? 'bg-theme-primary/5 hover:bg-theme-primary/10'
                            : 'hover:bg-theme-card-hover'
                        }`}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-theme-primary mt-0.5 flex-shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-theme-foreground-muted mt-0.5 flex-shrink-0 hover:text-theme-foreground" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium ${
                            isSelected 
                              ? 'text-theme-primary'
                              : 'text-theme-foreground'
                          }`}>
                            {tool.function.name}
                          </div>
                          <div className={`text-xs mt-1 line-clamp-2 ${
                            isSelected
                              ? 'text-theme-primary/80'
                              : 'text-theme-foreground-muted'
                          }`}>
                            {tool.function.description || '暂无描述'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        </div>
        
        {/* 当没有工具时显示占位内容 */}
        {serverGroups.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-center py-8">
            <div className="text-theme-foreground-muted">
              <div className="text-sm mb-2">暂无可用工具</div>
              <div className="text-xs">请检查 MCP 服务器配置</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}