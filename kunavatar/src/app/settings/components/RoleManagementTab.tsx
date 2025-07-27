'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Shield, Users, Check, X, AlertCircle, Eye } from 'lucide-react';
import Modal from '@/components/Modal';
import { PageLoading } from '@/components/Loading';
import { useNotification } from '@/components/notification';
import { useAuthErrorHandler } from '@/lib/utils/auth-utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Role {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  is_system: boolean;
  user_count: number;
  permission_count: number;
  permissions: Permission[];
  created_at: string;
  updated_at: string;
}

interface Permission {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  resource: string;
  action: string;
}

interface RoleForm {
  display_name: string;
  description: string;
  permissions: string[];
}

// 资源显示名称映射
const getResourceDisplayName = (resource: string): string => {
  const resourceNames: Record<string, string> = {
    users: '👥 用户管理',
    roles: '🛡️ 角色管理',
    permissions: '🔐 权限管理',
    conversations: '💬 对话管理',
    agents: '🤖 智能体管理',
    models: '🧠 模型管理',
    settings: '⚙️ 系统设置',
    system: '🔧 系统管理',
  };
  return resourceNames[resource] || resource;
};

export function RoleManagementTab() {
  const { success, error: notifyError } = useNotification();
  const { handleAuthError } = useAuthErrorHandler();
  
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  
  // 表单状态
  const [roleForm, setRoleForm] = useState<RoleForm>({
    display_name: '',
    description: '',
    permissions: [],
  });

  const updateRoleForm = useCallback((updates: Partial<RoleForm>) => {
    setRoleForm(prev => ({ ...prev, ...updates }));
  }, []);

  // 获取角色列表
  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('请先登录');
        return;
      }

      const response = await fetch('/api/roles', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleAuthError();
          return;
        }
        throw new Error('获取角色列表失败');
      }

      const data = await response.json();
      if (data.success) {
        setRoles(data.roles);
      } else {
        setError(data.error || '获取角色列表失败');
      }
    } catch (error) {
      console.error('获取角色列表失败:', error);
      setError(error instanceof Error ? error.message : '获取角色列表失败');
    } finally {
      setLoading(false);
    }
  }, [handleAuthError]);

  // 获取权限列表
  const fetchPermissions = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/permissions', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleAuthError();
          return;
        }
      } else {
        const data = await response.json();
        if (data.success) {
          setPermissions(data.permissions);
        }
      }
    } catch (error) {
      console.error('获取权限列表失败:', error);
    }
  }, [handleAuthError]);

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, [fetchRoles, fetchPermissions]);

  // 创建角色
  const handleCreateRole = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(roleForm),
      });

      const data = await response.json();
      if (data.success) {
        setShowCreateModal(false);
        setRoleForm({
          display_name: '',
          description: '',
          permissions: [],
        });
        fetchRoles();
        success('创建成功', '角色创建成功');
      } else {
        notifyError('创建失败', data.error || '创建角色失败');
      }
    } catch (error) {
      console.error('创建角色失败:', error);
      notifyError('创建失败', '创建角色失败');
    }
  };

  // 编辑角色
  const handleEditRole = async () => {
    if (!selectedRole) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/roles/${selectedRole.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          display_name: roleForm.display_name,
          description: roleForm.description,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowEditModal(false);
        setSelectedRole(null);
        setRoleForm({
          display_name: '',
          description: '',
          permissions: [],
        });
        fetchRoles();
        success('编辑成功', '角色信息更新成功');
      } else {
        notifyError('编辑失败', data.error || '更新角色信息失败');
      }
    } catch (error) {
      console.error('更新角色信息失败:', error);
      notifyError('编辑失败', '更新角色信息失败');
    }
  };

  // 删除角色
  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`确定要删除角色 "${roleName}" 吗？此操作不可撤销。`)) {
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        fetchRoles();
        success('删除成功', '角色删除成功');
      } else {
        notifyError('删除失败', data.error || '删除角色失败');
      }
    } catch (error) {
      console.error('删除角色失败:', error);
      notifyError('删除失败', '删除角色失败');
    }
  };

  // 更新角色权限
  const handleUpdateRolePermissions = async () => {
    if (!selectedRole) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/roles/${selectedRole.id}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ permissions: roleForm.permissions.map(String) }),
      });

      const data = await response.json();
      if (data.success) {
        setShowPermissionModal(false);
        setSelectedRole(null);
        fetchRoles();
        success('权限更新成功', '角色权限更新成功');
      } else {
        notifyError('权限更新失败', data.error || '更新角色权限失败');
      }
    } catch (error) {
      console.error('更新角色权限失败:', error);
      notifyError('权限更新失败', '更新角色权限失败');
    }
  };

  // 打开创建角色模态框
  const openCreateModal = () => {
    setRoleForm({
      display_name: '',
      description: '',
      permissions: [],
    });
    setShowCreateModal(true);
  };

  // 打开编辑角色模态框
  const openEditModal = (role: Role) => {
    setSelectedRole(role);
    setRoleForm({
      display_name: role.display_name,
      description: role.description || '',
      permissions: role.permissions.map(p => p.id),
    });
    setShowEditModal(true);
  };

  // 打开权限管理模态框
  const openPermissionModal = (role: Role) => {
    setSelectedRole(role);
    setRoleForm({
      ...roleForm,
      permissions: role.permissions.map(p => p.id),
    });
    setShowPermissionModal(true);
  };

  if (loading) {
    return (
      <PageLoading 
        text="loading..." 
        fullScreen={false}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 标题和操作栏 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-theme-foreground flex items-center gap-2">
          <Shield className="w-5 h-5" />
          角色管理
        </h2>
        <button 
          onClick={openCreateModal}
          className="bg-theme-primary text-white px-4 py-2 rounded-lg hover:bg-theme-primary-hover flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          创建角色
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* 角色列表 */}
      <div className="bg-theme-card rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-theme-border">
          <thead className="bg-theme-background-tertiary">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">
                角色信息
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">
                用户数量
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">
                权限数量
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">
                类型
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-theme-card divide-y divide-theme-border">
            {roles.map((role) => (
              <tr key={role.id} className="hover:bg-theme-background-secondary transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-theme-foreground">
                      {role.display_name}
                    </div>
                    <div className="text-sm text-theme-foreground-muted">
                      ID: {role.id}
                    </div>
                    {role.description && (
                      <div className="text-xs text-theme-foreground-muted mt-1">
                        {role.description}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-theme-foreground">
                    <Users className="w-4 h-4 mr-1" />
                    {role.user_count}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-theme-foreground">
                    <Shield className="w-4 h-4 mr-1" />
                    {role.permission_count}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    role.is_system 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {role.is_system ? '系统角色' : '自定义角色'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => openPermissionModal(role)}
                      className="text-theme-primary hover:text-theme-primary-hover transition-colors"
                      title="管理权限"
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                    {!role.is_system && (
                      <>
                        <button 
                          onClick={() => openEditModal(role)}
                          className="text-theme-primary hover:text-theme-primary-hover transition-colors"
                          title="编辑角色"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteRole(role.id, role.display_name)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="删除角色"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 创建角色模态框 */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-theme-card rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 头部区域 */}
              <div className="flex items-center justify-between p-8 pb-6 border-b border-theme-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-theme-primary/10 rounded-lg flex items-center justify-center">
                    <Plus className="w-5 h-5 text-theme-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-theme-foreground">创建角色</h2>
                    <p className="text-sm text-theme-foreground-muted">为系统创建新的角色并分配权限</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-lg bg-theme-background hover:bg-theme-background-secondary transition-colors flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-theme-foreground-muted" />
                </button>
              </div>

              {/* 内容区域 */}
              <div className="p-8 space-y-8 max-h-[calc(90vh-200px)] overflow-y-auto">
                {/* 基本信息 */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-theme-foreground mb-4">基本信息</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-theme-foreground mb-2">
                          角色名称 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={roleForm.display_name}
                          onChange={(e) => updateRoleForm({ display_name: e.target.value })}
                          className="form-input-base w-full"
                          placeholder="例如: 编辑者"
                        />
                        <p className="text-xs text-theme-foreground-muted mt-1">
                          💡 系统将自动生成唯一的角色标识符，您只需输入易于理解的显示名称
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-theme-foreground mb-2">
                          描述
                        </label>
                        <textarea
                          value={roleForm.description}
                          onChange={(e) => updateRoleForm({ description: e.target.value })}
                          className="form-input-base w-full h-20 resize-none"
                          placeholder="描述此角色的功能和用途..."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 权限分配 */}
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-theme-foreground">权限分配</h3>
                        <p className="text-sm text-theme-foreground-muted">为此角色分配相应的权限</p>
                      </div>
                      <div className="text-sm text-theme-foreground-muted">
                         已选择 {roleForm.permissions.length} / {permissions.length} 项权限
                       </div>
                    </div>
                    
                    <div className="w-full bg-theme-background-secondary rounded-full h-2 mb-4">
                      <div 
                        className="bg-theme-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${permissions.length > 0 ? (roleForm.permissions.length / permissions.length) * 100 : 0}%` }}
                      />
                    </div>

                    <div className="space-y-4 max-h-64 overflow-y-auto border border-theme-border rounded-lg p-4">
                      {Object.entries(
                        permissions.reduce((acc, permission) => {
                          if (!acc[permission.resource]) {
                            acc[permission.resource] = [];
                          }
                          acc[permission.resource].push(permission);
                          return acc;
                        }, {} as Record<string, Permission[]>)
                      ).map(([resource, resourcePermissions]) => (
                        <div key={resource} className="space-y-3">
                          <h4 className="font-medium text-theme-foreground text-sm border-b border-theme-border pb-2">
                            {getResourceDisplayName(resource)}
                          </h4>
                          <div className="grid grid-cols-1 gap-2 pl-2">
                            {resourcePermissions.map((permission) => {
                              const isSelected = roleForm.permissions.includes(permission.id);
                              return (
                                <div
                                  key={permission.id}
                                  onClick={() => {
                                    if (isSelected) {
                                      updateRoleForm({ permissions: roleForm.permissions.filter(p => p !== permission.id) });
                                    } else {
                                      updateRoleForm({ permissions: [...roleForm.permissions, permission.id] });
                                    }
                                  }}
                                  className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                                    isSelected
                                      ? 'border-theme-primary bg-theme-primary/10 shadow-md'
                                      : 'border-theme-border bg-theme-card hover:bg-theme-card-hover'
                                  }`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="font-medium text-theme-foreground text-sm">{permission.display_name}</div>

                                    </div>
                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ml-3 ${
                                      isSelected
                                        ? 'border-theme-primary bg-theme-primary'
                                        : 'border-theme-border'
                                    }`}>
                                      {isSelected && (
                                        <Check className="w-3 h-3 text-white" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 底部操作栏 */}
              <div className="flex justify-end gap-3 p-8 pt-6 border-t border-theme-border bg-theme-background">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="btn-base btn-secondary px-6 py-3"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateRole}
                  className="btn-base btn-primary px-6 py-3"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  创建角色
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 编辑角色模态框 */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-theme-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 头部区域 */}
              <div className="flex items-center justify-between p-6 border-b border-theme-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-theme-primary/10 rounded-lg flex items-center justify-center">
                    <Edit className="w-5 h-5 text-theme-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-theme-foreground">编辑角色</h2>
                    <p className="text-sm text-theme-foreground-muted">修改角色的基本信息</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="w-8 h-8 rounded-lg bg-theme-background hover:bg-theme-background-secondary transition-colors flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-theme-foreground-muted" />
                </button>
              </div>

              {/* 内容区域 */}
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-theme-foreground mb-2">
                      显示名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={roleForm.display_name}
                      onChange={(e) => updateRoleForm({ display_name: e.target.value })}
                      className="form-input-base w-full"
                      placeholder="例如: 编辑者"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-foreground mb-2">
                      描述
                    </label>
                    <textarea
                      value={roleForm.description}
                      onChange={(e) => updateRoleForm({ description: e.target.value })}
                      className="form-input-base w-full h-20 resize-none"
                      placeholder="描述此角色的功能和用途..."
                    />
                  </div>
                </div>
              </div>

              {/* 底部操作栏 */}
              <div className="flex justify-end gap-3 p-6 border-t border-theme-border bg-theme-background">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="btn-base btn-secondary px-6 py-2"
                >
                  取消
                </button>
                <button
                  onClick={handleEditRole}
                  className="btn-base btn-primary px-6 py-2"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  保存修改
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 权限管理模态框 */}
      <Modal
        open={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        title="管理角色权限"
      >
        {selectedRole && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-theme-foreground-muted mb-4">
                为角色 &ldquo;{selectedRole.display_name}&rdquo; 分配权限
              </p>
              <div className="space-y-4 max-h-64 overflow-y-auto border border-theme-border rounded-lg p-3">
                {Object.entries(
                  permissions.reduce((acc, permission) => {
                    if (!acc[permission.resource]) {
                      acc[permission.resource] = [];
                    }
                    acc[permission.resource].push(permission);
                    return acc;
                  }, {} as Record<string, Permission[]>)
                ).map(([resource, resourcePermissions]) => (
                  <div key={resource} className="space-y-2">
                    <h4 className="font-medium text-theme-foreground text-sm border-b border-theme-border pb-1">
                      {getResourceDisplayName(resource)}
                    </h4>
                    <div className="space-y-1 pl-2">
                      {resourcePermissions.map((permission) => (
                        <div key={permission.id} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`permission-${permission.id}`}
                            checked={roleForm.permissions.includes(permission.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                updateRoleForm({ permissions: [...roleForm.permissions, permission.id] });
                              } else {
                                updateRoleForm({ permissions: roleForm.permissions.filter(p => p !== permission.id) });
                              }
                            }}
                            className="rounded border-theme-border"
                          />
                          <label htmlFor={`permission-${permission.id}`} className="ml-2 text-sm">
                            <span className="text-theme-foreground">{permission.display_name}</span>
                            {permission.description && (
                              <div className="text-xs text-theme-foreground-muted mt-1">
                                {permission.description}
                              </div>
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <button
                onClick={handleUpdateRolePermissions}
                className="btn-base btn-primary flex-1"
              >
                更新权限
              </button>
              <button
                onClick={() => setShowPermissionModal(false)}
                className="btn-base btn-secondary flex-1"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
