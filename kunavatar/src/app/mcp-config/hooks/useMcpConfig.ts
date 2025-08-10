import { useState, useEffect } from 'react';
import { McpServer, McpTool, McpConfigState } from '../types';
import { useNotification } from '@/components/notification';

export function useMcpConfig() {
  const [servers, setServers] = useState<any[]>([]);
  const [tools, setTools] = useState<McpTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showToolsModal, setShowToolsModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'all' | 'local' | 'external'>('all');
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<{
    success: boolean;
    data?: any;
    error?: string;
    toolName?: string;
  } | null>(null);
  const [usingToolId, setUsingToolId] = useState<string | null>(null);
  const [newServer, setNewServer] = useState<Omit<McpServer, 'id' | 'status' | 'created_at' | 'updated_at'>>({
    name: '',
    display_name: '',
    type: 'sse' as 'stdio' | 'sse' | 'streamable-http',
    description: '',
    enabled: true,
    command: '',
    args: '[]',
    working_directory: '',
    url: '',
    base_url: '',
    port: undefined as number | undefined,
    path: '/',
    protocol: 'http' as 'http' | 'https'
  });
  const notification = useNotification();

  // 加载服务器列表
  const loadServers = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const url = forceRefresh ? '/api/mcp/server-list?refresh=true' : '/api/mcp/server-list';
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setServers(data.servers || []);
      } else {
        console.error('加载服务器列表失败:', data.error);
        setServers([]);
      }
    } catch (error) {
      console.error('加载服务器列表失败:', error);
      setServers([]);
    } finally {
      setLoading(false);
    }
  };

  // 加载工具列表
  const loadTools = async (serverName?: string, forceRefresh = false) => {
    if (!serverName) {
      setTools([]);
      return;
    }
    
    try {
      setToolsLoading(true);
      const params = new URLSearchParams({ 
        server: serverName,
        includeDisabled: 'true' // 配置页面需要显示所有工具（包括禁用的）
      });
      if (forceRefresh) {
        params.append('refresh', 'true');
      }
      
      const response = await fetch(`/api/mcp/tools?${params}`);
      const data = await response.json();
      
      if (data.success && Array.isArray(data.tools)) {
        setTools(data.tools);
      } else {
        console.error('加载工具列表失败:', data.error);
        setTools([]);
      }
    } catch (error) {
      console.error('加载工具列表失败:', error);
      setTools([]);
    } finally {
      setToolsLoading(false);
    }
  };

  // 切换标签页
  const handleTabChange = async (tab: 'all' | 'local' | 'external') => {
    setSelectedTab(tab);
    setSelectedServer(null);
    // 切换标签页时清空工具列表
    setTools([]);
  };
  
  // 选择服务器 - 改为弹窗显示工具列表
  const handleServerSelect = async (serverName: string) => {
    setSelectedServer(serverName);
    await loadTools(serverName);
    setShowToolsModal(true);
  };
  
  // 检查服务器连接状态
  const checkServerStatus = async (serverName: string) => {
    // 立即将状态设置为'connecting'以提供即时反馈
    setServers(prev => prev.map(server => 
      server.name === serverName 
        ? { ...server, status: 'connecting', errorMessage: undefined } 
        : server
    ));

    try {
      const response = await fetch('/api/mcp/server-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serverName }),
      });
      
      const data = await response.json();

      // 根据API返回结果更新最终状态
      setServers(prev => prev.map(server => 
        server.name === serverName 
          ? { ...server, status: data.status || 'error', toolCount: data.toolCount, errorMessage: data.error || data.errorMessage }
          : server
      ));
      if (data.status === 'connected') {
        notification.success?.('服务器连接正常', `服务器「${serverName}」连接成功`);
      } else {
        notification.error?.('服务器连接异常', data.error || data.errorMessage || `服务器「${serverName}」连接失败`);
      }
    } catch (error) {
      console.error('检查服务器状态失败:', error);
      // 处理捕获到的错误
      setServers(prev => prev.map(server => 
        server.name === serverName 
          ? { ...server, status: 'error', errorMessage: '客户端请求失败' }
          : server
      ));
      notification.error?.('检查服务器状态失败', error instanceof Error ? error.message : '未知错误');
    }
  };
  
  // 刷新工具列表
  const refreshTools = async () => {
    if (selectedServer) {
      await loadTools(selectedServer, true);
    }
  };

  // 删除工具（MCP工具通常不支持删除，这里保留接口但可能不会实际使用）
  const handleDeleteTool = async (toolId: number) => {
    // MCP工具通常不支持删除，这里可以添加提示
    console.log('MCP工具不支持删除操作');
  };

  // 使用工具
  const handleUseTool = async (tool: McpTool & { configuredArgs?: any }) => {
    try {
      setUsingToolId(tool.name); // 设置loading状态
      
      // 使用已配置的参数，如果没有配置则为空对象
      const params = tool.configuredArgs || {};

      // 调用工具
      const response = await fetch('/api/mcp/call-tool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: tool.name,
          serverName: selectedServer || 'local',
          arguments: params
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('工具执行成功:', result);
        // 可以在这里添加更好的结果显示方式，比如在页面上显示结果
        setExecutionResult({
          success: true,
          data: result,
          toolName: tool.name
        });
      } else {
        const error = await response.json();
        console.error('工具执行失败:', error);
        setExecutionResult({
          success: false,
          error: error.error || '未知错误',
          toolName: tool.name
        });
      }
    } catch (error) {
      console.error('使用工具失败:', error);
      alert('工具执行失败，请检查控制台获取详细信息');
    } finally {
      setUsingToolId(null); // 清除loading状态
    }
  };

  // 同步本地工具到数据库
  const syncLocalTools = async () => {
    // 立即将本地服务器状态设置为'connecting'以提供即时反馈
    setServers(prev => prev.map(server => 
      server.name === 'local' 
        ? { ...server, status: 'connecting', errorMessage: undefined } 
        : server
    ));

    try {
      const response = await fetch('/api/mcp/tools?server=local&refresh=true', {
        method: 'GET',
      });

      const result = await response.json();
      
      if (result.success) {
        // 更新本地服务器状态为已连接，并更新工具数量
        setServers(prev => prev.map(server => 
          server.name === 'local' 
            ? { ...server, status: 'connected', toolCount: result.tools?.length || 0, errorMessage: undefined }
            : server
        ));
        
        // 重新加载服务器列表和工具列表
        await loadServers();
        if (selectedServer === 'local') {
          await loadTools(selectedServer, true);
        }
        
        // 显示成功通知
        notification.success?.('本地工具同步成功', `已同步 ${result.tools?.length || 0} 个本地工具到数据库`);
      } else {
        // 更新本地服务器状态为错误
        setServers(prev => prev.map(server => 
          server.name === 'local' 
            ? { ...server, status: 'error', errorMessage: result.error || '同步失败' }
            : server
        ));
        
        notification.error?.('本地工具同步失败', result.error || '未知错误');
      }
    } catch (error) {
      console.error('同步本地工具失败:', error);
      
      // 更新本地服务器状态为错误
      setServers(prev => prev.map(server => 
        server.name === 'local' 
          ? { ...server, status: 'error', errorMessage: '客户端请求失败' }
          : server
      ));
      
      notification.error?.('同步本地工具失败', error instanceof Error ? error.message : '未知错误');
    }
  };

  // 检查服务器是否已存在
  const checkServerExists = (serverName: string): boolean => {
    return servers.some(server => server.name === serverName);
  };

  // 删除服务器
  const handleDeleteServer = async (serverName: string) => {
    // 本地服务器不允许删除
    if (serverName === 'local') {
      alert('本地服务器不支持删除操作');
      return;
    }

    if (!confirm(`确定要删除服务器 "${serverName}" 吗？此操作不可撤销。`)) {
      return;
    }

    try {
      // 先找到要删除的服务器，获取其ID
      const targetServer = servers.find(server => server.name === serverName);
      if (!targetServer || !targetServer.id) {
        alert('找不到要删除的服务器');
        return;
      }

      // 先删除数据库记录
      const response = await fetch(`/api/mcp/servers/${targetServer.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // 然后删除配置文件中的记录
        const configResponse = await fetch('/api/mcp/config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'delete',
            serverName: serverName
          }),
        });

        if (configResponse.ok) {
          // 如果删除的是当前选中的服务器，清空选择
          if (selectedServer === serverName) {
            setSelectedServer(null);
            setTools([]);
          }
          await loadServers();
        } else {
          const configErrorData = await configResponse.json();
          console.error('删除配置文件失败:', configErrorData.error || '未知错误');
        }
      } else {
        const errorData = await response.json();
        console.error('删除服务器失败:', errorData.error || '未知错误');
      }
    } catch (error) {
      console.error('删除服务器失败:', error);
    }
  };

  // 添加新服务器（保留原有功能，增加重复检查）
  const handleAddServer = async (serverData?: any) => {
    try {
      // 使用传入的serverData或当前的newServer状态
      const serverToAdd = serverData || newServer;
      
      // 检查服务器名称是否已存在
      if (checkServerExists(serverToAdd.name)) {
        alert(`服务器 "${serverToAdd.name}" 已存在，请使用不同的名称`);
        return;
      }

      console.log('准备发送的服务器数据:', JSON.stringify(serverToAdd, null, 2));

      const response = await fetch('/api/mcp/servers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serverToAdd), // 使用包含validatedTools的完整数据
      });

      if (response.ok) {
        setShowAddModal(false);
        setNewServer({
          name: '',
          display_name: '',
          type: 'stdio',
          description: '',
          enabled: true,
          command: '',
          args: '[]',
          working_directory: '',
          url: '',
          base_url: '',
          port: undefined,
          path: '/',
          protocol: 'http'
        });
        await loadServers();
        // 如果当前选中的服务器就是新添加的服务器，刷新工具列表
        if (selectedServer === newServer.name) {
          await loadTools(selectedServer, true);
        }
        // 移除成功弹窗，静默完成操作
      } else {
        const errorData = await response.json();
        alert(`添加服务器失败: ${errorData.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('添加服务器失败:', error);
      alert('添加服务器失败，请检查网络连接');
    }
  };

  useEffect(() => {
    loadServers();
  }, []);

  return {
    servers,
    tools,
    loading,
    toolsLoading,
    showAddModal,
    showToolsModal,
    selectedTab,
    selectedServer,
    newServer,
    setShowAddModal,
    setShowToolsModal,
    setNewServer,
    setTools,
    loadServers,
    loadTools,
    handleTabChange,
    handleServerSelect,
    checkServerStatus,
    refreshTools,
    handleDeleteTool,
    handleUseTool,
    handleAddServer,
    handleDeleteServer,
    syncLocalTools,
    executionResult,
    setExecutionResult,
    usingToolId
  };
}