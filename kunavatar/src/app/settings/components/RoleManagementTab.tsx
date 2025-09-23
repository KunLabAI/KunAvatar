'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Shield, Users, Check, X, AlertCircle, Eye } from 'lucide-react';
import Modal from '@/components/Modal';
import { PageLoading } from '@/components/Loading';
import { useNotification } from '@/components/notification';
import { useAuthErrorHandler } from '@/lib/utils/auth-utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';

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

export function RoleManagementTab() {
  const { t } = useI18n();
  const { success, error: notifyError } = useNotification();
  const { handleAuthError } = useAuthErrorHandler();
  
  // 资源显示名称映射
  const getResourceDisplayName = useCallback((resource: string): string => {
    return t(`settings.roles.resourceNames.${resource}`) || resource;
  }, [t]);
  
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
        setError(t('settings.roles.pleaseLogin'));
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
        throw new Error(t('settings.roles.messages.fetchRolesFailed'));
      }

      const data = await response.json();
      if (data.success) {
        setRoles(data.roles);
      } else {
        setError(data.error || t('settings.roles.messages.fetchRolesFailed'));
      }
    } catch (error) {
      console.error(t('settings.roles.messages.fetchRolesFailed') + ':', error);
      setError(error instanceof Error ? error.message : t('settings.roles.messages.fetchRolesFailed'));
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
      console.error(t('settings.roles.messages.fetchPermissionsFailed') + ':', error);
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
        success(t('settings.roles.messages.createSuccess'), t('settings.roles.messages.roleCreatedSuccess'));
      } else {
        notifyError(t('settings.roles.messages.createFailed'), data.error || t('settings.roles.messages.createRoleFailed'));
      }
    } catch (error) {
      console.error(t('settings.roles.messages.createRoleFailed') + ':', error);
      notifyError(t('settings.roles.messages.createFailed'), t('settings.roles.messages.createRoleFailed'));
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
        success(t('settings.roles.messages.editSuccess'), t('settings.roles.messages.roleUpdatedSuccess'));
      } else {
        notifyError(t('settings.roles.messages.editFailed'), data.error || t('settings.roles.messages.updateRoleFailed'));
      }
    } catch (error) {
      console.error(t('settings.roles.messages.updateRoleFailed') + ':', error);
      notifyError(t('settings.roles.messages.editFailed'), t('settings.roles.messages.updateRoleFailed'));
    }
  };

  // 删除角色
  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(t('settings.roles.confirmDeleteRole').replace('{roleName}', roleName))) {
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
        success(t('settings.roles.messages.deleteSuccess'), t('settings.roles.messages.roleDeletedSuccess'));
      } else {
        notifyError(t('settings.roles.messages.deleteFailed'), data.error || t('settings.roles.messages.deleteRoleFailed'));
      }
    } catch (error) {
      console.error(t('settings.roles.messages.deleteRoleFailed') + ':', error);
      notifyError(t('settings.roles.messages.deleteFailed'), t('settings.roles.messages.deleteRoleFailed'));
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
        success(t('settings.roles.messages.permissionUpdateSuccess'), t('settings.roles.messages.rolePermissionUpdatedSuccess'));
      } else {
        notifyError(t('settings.roles.messages.permissionUpdateFailed'), data.error || t('settings.roles.messages.updateRolePermissionFailed'));
      }
    } catch (error) {
      console.error(t('settings.roles.messages.updateRolePermissionFailed') + ':', error);
      notifyError(t('settings.roles.messages.permissionUpdateFailed'), t('settings.roles.messages.updateRolePermissionFailed'));
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
        text={t('settings.roles.loading')} 
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
          {t('settings.roles.title')}
        </h2>
        <button 
          onClick={openCreateModal}
          className="bg-theme-primary text-white px-4 py-2 rounded-lg hover:bg-theme-primary-hover flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('settings.roles.createRole')}
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
                {t('settings.roles.roleInfo')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">
                {t('settings.roles.userCount')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">
                {t('settings.roles.permissionCount')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">
                {t('settings.roles.type')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">
                {t('settings.roles.actions')}
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
                    {role.is_system ? t('settings.roles.systemRole') : t('settings.roles.customRole')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => openPermissionModal(role)}
                      className="text-theme-primary hover:text-theme-primary-hover transition-colors"
                      title={t('settings.roles.managePermissions')}
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                    {!role.is_system && (
                      <>
                        <button 
                          onClick={() => openEditModal(role)}
                          className="text-theme-primary hover:text-theme-primary-hover transition-colors"
                          title={t('settings.roles.editRole')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteRole(role.id, role.display_name)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title={t('settings.roles.deleteRole')}
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
                    <h2 className="text-xl font-semibold text-theme-foreground">{t('settings.roles.createRole')}</h2>
                    <p className="text-sm text-theme-foreground-muted">{t('settings.roles.createNewRole')}</p>
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
                    <h3 className="text-lg font-medium text-theme-foreground mb-4">{t('settings.roles.basicInfo')}</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-theme-foreground mb-2">
                          {t('settings.roles.roleName')} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={roleForm.display_name}
                          onChange={(e) => updateRoleForm({ display_name: e.target.value })}
                          className="form-input-base w-full"
                          placeholder={t('settings.roles.enterRoleName')}
                        />
                        <p className="text-xs text-theme-foreground-muted mt-1">
                          {t('settings.roles.roleNameHint')}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-theme-foreground mb-2">
                          {t('settings.roles.description')}
                        </label>
                        <textarea
                          value={roleForm.description}
                          onChange={(e) => updateRoleForm({ description: e.target.value })}
                          className="form-input-base w-full h-20 resize-none"
                          placeholder={t('settings.roles.descriptionPlaceholder')}
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
                        <h3 className="text-lg font-medium text-theme-foreground">{t('settings.roles.permissionAssignment')}</h3>
                        <p className="text-sm text-theme-foreground-muted">{t('settings.roles.assignPermissions')}</p>
                      </div>
                      <div className="text-sm text-theme-foreground-muted">
                         {t('settings.roles.permissionsSelected').replace('{count}', roleForm.permissions.length.toString()).replace('{total}', permissions.length.toString())}
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
                  {t('settings.roles.cancel')}
                </button>
                <button
                  onClick={handleCreateRole}
                  className="btn-base btn-primary px-6 py-3"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('settings.roles.createRole')}
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
                    <h2 className="text-xl font-semibold text-theme-foreground">{t('settings.roles.editRole')}</h2>
                    <p className="text-sm text-theme-foreground-muted">{t('settings.roles.editRoleInfo')}</p>
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
                      {t('settings.roles.roleDisplayName')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={roleForm.display_name}
                      onChange={(e) => updateRoleForm({ display_name: e.target.value })}
                      className="form-input-base w-full"
                      placeholder={t('settings.roles.enterRoleName')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-foreground mb-2">
                      {t('settings.roles.description')}
                    </label>
                    <textarea
                      value={roleForm.description}
                      onChange={(e) => updateRoleForm({ description: e.target.value })}
                      className="form-input-base w-full h-20 resize-none"
                      placeholder={t('settings.roles.descriptionPlaceholder')}
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
                  {t('settings.roles.cancel')}
                </button>
                <button
                  onClick={handleEditRole}
                  className="btn-base btn-primary px-6 py-2"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {t('settings.roles.saveChanges')}
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
        title={t('settings.roles.manageRolePermissions')}
      >
        {selectedRole && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-theme-foreground-muted mb-4">
                {t('settings.roles.assignPermissionsTo').replace('{roleName}', selectedRole.display_name)}
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
                {t('settings.roles.updatePermissions')}
              </button>
              <button
                onClick={() => setShowPermissionModal(false)}
                className="btn-base btn-secondary flex-1"
              >
                {t('settings.roles.cancel')}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
