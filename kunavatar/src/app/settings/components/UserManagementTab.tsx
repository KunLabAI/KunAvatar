'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus, Edit, Trash2, Shield, Eye, X, Save, Mail, User, Lock, Check, UserCheck } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { useNotification } from '@/components/notification';
import { PageLoading } from '@/components/Loading';
import { motion, AnimatePresence } from 'framer-motion';
import { formatTime } from '@/lib/utils/time';

interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  status: 'pending' | 'active' | 'inactive' | 'suspended';
  email_verified: boolean;
  roles: Array<{
    id: string;
    name: string;
    display_name: string;
  }>;
  created_at: string;
  last_login_at?: string;
}



interface Role {
  id: string;
  name: string;
  display_name: string;
  description?: string;
}

interface UserForm {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  status: 'pending' | 'active' | 'inactive' | 'suspended';
  password?: string;
  email_verified: boolean;
  roles: string[];
}

interface UserManagementTabProps {
  // 可以接收一些props
}

// 模态框组件 - 移到组件外部避免重新渲染
const Modal = ({ isOpen, onClose, title, children }: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-theme-card rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-theme-foreground">{title}</h3>
          <button
            onClick={onClose}
            className="text-theme-foreground-muted hover:text-theme-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export function UserManagementTab({}: UserManagementTabProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { success, error: notifyError, warning } = useNotification();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  
  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // 表单状态
  const [userForm, setUserForm] = useState<UserForm>({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    status: 'pending',
    password: '',
    email_verified: false,
    roles: [],
  });

  // 处理401认证失败
  const handleAuthError = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    router.push('/login');
  }, [router]);

  // 优化表单更新函数，避免重新渲染
  const updateUserForm = useCallback((updates: Partial<UserForm>) => {
    setUserForm(prev => ({ ...prev, ...updates }));
  }, []);

  // 获取用户列表
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError(t('settings.users.messages.pleaseLogin'));
        return;
      }

      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleAuthError();
          return;
        }
        throw new Error(t('settings.users.messages.fetchUsersFailed'));
      }

      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      } else {
        setError(data.error || t('settings.users.messages.fetchUsersFailed'));
      }
    } catch (error) {
      console.error(t('settings.users.messages.fetchUsersFailed') + ':', error);
      setError(error instanceof Error ? error.message : t('settings.users.messages.fetchUsersFailed'));
    } finally {
      setLoading(false);
    }
  }, [handleAuthError]);

  // 获取当前用户信息
  const fetchCurrentUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/auth/me', {
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
          setCurrentUserId(data.user.id);
        }
      }
    } catch (error) {
      console.error(t('settings.users.messages.fetchCurrentUserFailed') + ':', error);
    }
  }, [handleAuthError]);

  // 获取角色列表
  const fetchRoles = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
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
      } else {
        const data = await response.json();
        if (data.success) {
          setRoles(data.roles);
        }
      }
    } catch (error) {
      console.error(t('settings.users.messages.fetchRolesFailed') + ':', error);
    }
  }, [handleAuthError]);

  useEffect(() => {
    fetchUsers();
    fetchCurrentUser();
    fetchRoles();
  }, [fetchUsers, fetchCurrentUser, fetchRoles]);

  // 创建用户
  const handleCreateUser = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(userForm),
      });

      const data = await response.json();
      if (data.success) {
        setShowCreateModal(false);
        // 重置表单，保持默认角色选择
        const defaultUserRole = roles.find(role => role.name === 'user');
        setUserForm({
          username: '',
          email: '',
          first_name: '',
          last_name: '',
          status: 'pending',
          password: '',
          email_verified: false,
          roles: defaultUserRole ? [defaultUserRole.id] : [],
        });
        fetchUsers();
        success(t('settings.users.messages.createSuccess'), t('settings.users.messages.userCreated'));
      } else {
        notifyError(t('settings.users.messages.createFailed'), data.error || t('settings.users.messages.createUserFailed'));
      }
    } catch (error) {
      console.error(t('settings.users.messages.createUserFailed') + ':', error);
      notifyError(t('settings.users.messages.createFailed'), t('settings.users.messages.createUserFailed'));
    }
  };

  // 更新用户
  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      const token = localStorage.getItem('accessToken');
      const { password, ...updateData } = userForm;
      
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();
      if (data.success) {
        setShowEditModal(false);
        setSelectedUser(null);
        fetchUsers();
        success(t('settings.users.messages.updateSuccess'), t('settings.users.messages.userUpdated'));
      } else {
        notifyError(t('settings.users.messages.updateFailed'), data.error || t('settings.users.messages.updateUserFailed'));
      }
    } catch (error) {
      console.error(t('settings.users.messages.updateUserFailed') + ':', error);
      notifyError(t('settings.users.messages.updateFailed'), t('settings.users.messages.updateUserFailed'));
    }
  };

  // 更新用户角色
  const handleUpdateUserRoles = async () => {
    if (!selectedUser) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/users/${selectedUser.id}/roles`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ roles: userForm.roles }),
      });

      const data = await response.json();
      if (data.success) {
        setShowRoleModal(false);
        setSelectedUser(null);
        fetchUsers();
        success(t('settings.users.messages.roleUpdateSuccess'), t('settings.users.messages.userRoleUpdated'));
      } else {
        notifyError(t('settings.users.messages.roleUpdateFailed'), data.error || t('settings.users.messages.updateUserRoleFailed'));
      }
    } catch (error) {
      console.error(t('settings.users.messages.updateUserRoleFailed') + ':', error);
      notifyError(t('settings.users.messages.roleUpdateFailed'), t('settings.users.messages.updateUserRoleFailed'));
    }
  };

  // 激活用户 - 打开角色选择模态框
  const handleActivateUser = async (user: User) => {
    setSelectedUser(user);
    // 默认选择普通用户角色
    const defaultUserRole = roles.find(role => role.name === 'user');
    setUserForm({
      ...userForm,
      roles: defaultUserRole ? [defaultUserRole.id] : [],
    });
    setShowActivateModal(true);
  };

  // 确认激活用户并分配角色
  const handleConfirmActivateUser = async () => {
    if (!selectedUser) return;

    try {
      const token = localStorage.getItem('accessToken');
      
      // 同时激活用户并分配角色
      const activateResponse = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'active' }),
      });

      if (!activateResponse.ok) {
        const data = await activateResponse.json();
        notifyError(t('settings.users.messages.activationFailed'), data.error || t('settings.users.messages.activateUserFailed'));
        return;
      }

      // 分配角色
      const roleResponse = await fetch(`/api/users/${selectedUser.id}/roles`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ roles: userForm.roles }),
      });

      if (!roleResponse.ok) {
        const data = await roleResponse.json();
        notifyError(t('settings.users.messages.roleAssignFailed'), data.error || t('settings.users.messages.assignUserRoleFailed'));
        return;
      }

      setShowActivateModal(false);
      setSelectedUser(null);
      fetchUsers(); // 重新获取用户列表
      success(t('settings.users.messages.activationSuccess'), t('settings.users.messages.userActivated'));
    } catch (error) {
      console.error(t('settings.users.messages.activateUserFailed') + ':', error);
      notifyError(t('settings.users.messages.activationFailed'), t('settings.users.messages.activateUserFailed'));
    }
  };

  // 删除用户
  const handleDeleteUser = async (userId: number) => {
    // 检查是否尝试删除自己的账户
    if (currentUserId && userId === currentUserId) {
      warning(t('settings.users.messages.operationFailed'), t('settings.users.messages.cannotDeleteSelf'));
      return;
    }

    if (!confirm(t('settings.users.confirmDelete'))) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleAuthError();
          return;
        }
        const data = await response.json();
        notifyError(t('settings.users.messages.deleteFailed'), data.error || t('settings.users.messages.deleteUserFailed'));
      } else {
        fetchUsers(); // 重新获取用户列表
        success(t('settings.users.messages.deleteSuccess'), t('settings.users.messages.userDeleted'));
      }
    } catch (error) {
      console.error(t('settings.users.messages.deleteUserFailed') + ':', error);
      notifyError(t('settings.users.messages.deleteFailed'), t('settings.users.messages.deleteUserFailed'));
    }
  };

  // 打开创建用户模态框
  const openCreateModal = () => {
    // 默认选择普通用户角色
    const defaultUserRole = roles.find(role => role.name === 'user');
    setUserForm({
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      status: 'pending',
      password: '',
      email_verified: false,
      roles: defaultUserRole ? [defaultUserRole.id] : [],
    });
    setShowCreateModal(true);
  };

  // 打开编辑用户模态框
  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setUserForm({
      username: user.username,
      email: user.email,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      status: user.status,
      email_verified: user.email_verified,
      roles: user.roles.map(r => r.id),
    });
    setShowEditModal(true);
  };

  // 打开查看用户模态框
  const openViewModal = (user: User) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };

  // 打开角色管理模态框
  const openRoleModal = (user: User) => {
    setSelectedUser(user);
    setUserForm({
      ...userForm,
      roles: user.roles.map(r => r.id),
    });
    setShowRoleModal(true);
  };

  // 状态标签样式
  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800',
    };
    const labels = {
      pending: t('settings.users.status.pending'),
      active: t('settings.users.status.active'),
      inactive: t('settings.users.status.inactive'),
      suspended: t('settings.users.status.suspended'),
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  if (loading) {
    return (
      <PageLoading 
        text={t('settings.users.loading')} 
        fullScreen={false}
      />
    );
  }

  return (
    <section className="bg-theme-background">
      <div className="space-y-6">
        {/* 标题和操作栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-theme-foreground flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t('settings.users.title')}
            </h2>
            {users.filter(user => user.status === 'pending').length > 0 && (
              <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                <span className="text-sm text-yellow-700 font-medium">
                  {users.filter(user => user.status === 'pending').length} {t('settings.users.pendingActivation')}
                </span>
              </div>
            )}
          </div>
          <button 
            onClick={openCreateModal}
            className="bg-theme-primary text-white px-4 py-2 rounded-lg hover:bg-theme-primary-hover flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('settings.users.addUser')}
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* 用户列表 */}
        <div className="bg-theme-background-secondary rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-theme-background-tertiary">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">
                    {t('settings.users.user')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">
                    {t('settings.users.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">
                    {t('settings.users.roles')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">
                    {t('settings.users.createdTime')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">
                    {t('settings.users.lastLogin')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">
                    {t('settings.users.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-theme-card divide-y divide-theme-border">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-theme-background transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-theme-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-theme-primary">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-theme-foreground">{user.username}</div>
                          <div className="text-sm text-theme-foreground-muted">{user.email}</div>
                          {(user.first_name || user.last_name) && (
                            <div className="text-sm text-theme-foreground-muted">
                              {user.first_name} {user.last_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(user.status)}
                        {user.email_verified && (
                          <span className="text-xs text-green-600">✓ {t('settings.users.verified')}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                          <span
                            key={role.id}
                            className="px-2 py-1 text-xs bg-theme-primary/10 text-theme-primary rounded-full"
                          >
                            {role.display_name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-theme-foreground-muted">
                      {formatTime(user.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-theme-foreground-muted">
                      {user.last_login_at 
                        ? formatTime(user.last_login_at)
                        : t('settings.users.neverLoggedIn')
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => openViewModal(user)}
                          className="text-theme-primary hover:text-theme-primary-hover transition-colors"
                          title={t('settings.users.viewDetails')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {user.status === 'pending' && (
                          <button 
                            onClick={() => handleActivateUser(user)}
                            className="text-green-600 hover:text-green-700 transition-colors"
                            title={t('settings.users.activateUser')}
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => openEditModal(user)}
                          className="text-theme-primary hover:text-theme-primary-hover transition-colors"
                          title={t('settings.users.editUser')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => openRoleModal(user)}
                          className="text-theme-primary hover:text-theme-primary-hover transition-colors"
                          title={t('settings.users.managePermissions')}
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={currentUserId === user.id}
                          className={`transition-colors ${
                            currentUserId === user.id 
                              ? 'text-gray-400 cursor-not-allowed' 
                              : 'text-red-600 hover:text-red-700'
                          }`}
                          title={currentUserId === user.id ? t('settings.users.cannotDeleteSelf') : t('settings.users.deleteUser')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 空状态 */}
        {users.length === 0 && !loading && (
          <div className="text-center py-8 text-theme-foreground-muted">
            {t('settings.users.noUsersFound')}
          </div>
        )}
      </div>

      {/* 创建用户模态框 */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-start z-50 p-4 pt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="bg-theme-background rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-theme-border"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -10 }}
            >
              {/* 头部 */}
              <div className="flex items-center justify-between p-8 pb-6 border-b border-theme-border">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-theme-primary to-theme-accent flex items-center justify-center">
                    <Plus className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="page-title text-theme-foreground">{t('settings.users.createUser')}</h2>
                    <p className="text-theme-foreground-muted text-sm">{t('settings.users.addNewUser')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-10 h-10 rounded-full bg-theme-card hover:bg-theme-card-hover flex items-center justify-center text-theme-foreground-muted hover:text-theme-foreground transition-all duration-200 border border-theme-border"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 表单内容 */}
              <div className="flex-1 overflow-y-auto scrollbar-thin p-8 space-y-8">
                {/* 基本信息 */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-theme-foreground mb-4">{t('settings.users.basicInfo')}</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-theme-foreground mb-2">
                          {t('settings.users.username')} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={userForm.username}
                          onChange={(e) => updateUserForm({ username: e.target.value })}
                          className="form-input-base w-full"
                          placeholder={t('settings.users.enterUsername')}
                        />
                        {errors.username && (
                          <p className="text-red-500 text-sm mt-1">{errors.username}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-theme-foreground mb-2">
                          {t('settings.users.email')} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={userForm.email}
                          onChange={(e) => updateUserForm({ email: e.target.value })}
                          className="form-input-base w-full"
                          placeholder={t('settings.users.enterEmail')}
                        />
                        {errors.email && (
                          <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-theme-foreground mb-2">
                          {t('settings.users.password')} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          value={userForm.password}
                          onChange={(e) => updateUserForm({ password: e.target.value })}
                          className="form-input-base w-full"
                          placeholder={t('settings.users.enterPassword')}
                        />
                        {errors.password && (
                          <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-theme-foreground mb-2">
                          {t('settings.users.status')}
                        </label>
                        <select
                          value={userForm.status}
                          onChange={(e) => updateUserForm({ status: e.target.value as any })}
                          className="form-input-base w-full"
                        >
                          <option value="pending">{t('settings.users.status.pending')}</option>
                          <option value="active">{t('settings.users.status.active')}</option>
                          <option value="inactive">{t('settings.users.status.inactive')}</option>
                          <option value="suspended">{t('settings.users.status.suspended')}</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-theme-foreground mb-2">
                          {t('settings.users.firstName')}
                        </label>
                        <input
                          type="text"
                          value={userForm.first_name}
                          onChange={(e) => updateUserForm({ first_name: e.target.value })}
                          className="form-input-base w-full"
                          placeholder={t('settings.users.enterFirstName')}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-theme-foreground mb-2">
                          {t('settings.users.lastName')}
                        </label>
                        <input
                          type="text"
                          value={userForm.last_name}
                          onChange={(e) => updateUserForm({ last_name: e.target.value })}
                          className="form-input-base w-full"
                          placeholder={t('settings.users.enterLastName')}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 其他设置 */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-theme-foreground mb-4">{t('settings.users.otherSettings')}</h3>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="email_verified"
                        checked={userForm.email_verified}
                        onChange={(e) => updateUserForm({ email_verified: e.target.checked })}
                        className="rounded border-theme-border"
                      />
                      <label htmlFor="email_verified" className="text-sm text-theme-foreground">
                        {t('settings.users.emailVerified')}
                      </label>
                    </div>
                  </div>
                </div>

                {/* 角色分配 */}
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-theme-foreground">{t('settings.users.roleAssignment')}</h3>
                        <p className="text-sm text-theme-foreground-muted">{t('settings.users.assignRoles')}</p>
                      </div>
                      <div className="text-sm text-theme-foreground-muted">
                        {userForm.roles.length > 0 ? t('settings.users.selectedRoles') : t('settings.users.pleaseSelectRole')}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
                      {roles.map(role => {
                        const isSelected = userForm.roles.includes(role.id);
                        return (
                          <div
                            key={role.id}
                            onClick={() => {
                              updateUserForm({ roles: [role.id] });
                            }}
                            className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                              isSelected
                                ? 'border-theme-primary bg-theme-primary/10 shadow-md'
                                : 'border-theme-border bg-theme-card hover:bg-theme-card-hover'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-theme-foreground">{role.display_name}</div>
                                <div className="text-sm text-theme-foreground-muted mt-1 line-clamp-2">
                                  {role.description || t('settings.users.noDescription')}
                                </div>
                              </div>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ml-3 ${
                                 isSelected
                                   ? 'border-theme-primary bg-theme-primary'
                                   : 'border-theme-border'
                               }`}>
                                 {isSelected && (
                                   <div className="w-2 h-2 bg-white rounded-full" />
                                 )}
                               </div>
                            </div>
                          </div>
                        );
                      })}
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
                  {t('settings.users.cancel')}
                </button>
                <button
                  onClick={handleCreateUser}
                  className="btn-base btn-primary px-6 py-3"
                >
                  <Plus className="w-4 h-4" />
                  {t('settings.users.createUser')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 编辑用户模态框 */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={t('settings.users.editUser')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-foreground-muted mb-1">
              {t('settings.users.username')}
            </label>
            <input
              type="text"
              value={userForm.username}
              onChange={(e) => updateUserForm({ username: e.target.value })}
              className="form-input-base w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-foreground-muted mb-1">
              {t('settings.users.email')}
            </label>
            <input
              type="email"
              value={userForm.email}
              onChange={(e) => updateUserForm({ email: e.target.value })}
              className="form-input-base w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-theme-foreground-muted mb-1">
                {t('settings.users.firstName')}
              </label>
              <input
                   type="text"
                   value={userForm.first_name}
                   onChange={(e) => updateUserForm({ first_name: e.target.value })}
                   className="form-input-base w-full"
                 />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-foreground-muted mb-1">
                {t('settings.users.lastName')}
              </label>
              <input
                   type="text"
                   value={userForm.last_name}
                   onChange={(e) => updateUserForm({ last_name: e.target.value })}
                   className="form-input-base w-full"
                 />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-foreground-muted mb-1">
              {t('settings.users.status')}
            </label>
            <select
              value={userForm.status}
              onChange={(e) => updateUserForm({ status: e.target.value as any })}
              className="form-input-base w-full"
            >
              <option value="pending">{t('settings.users.status.pending')}</option>
              <option value="active">{t('settings.users.status.active')}</option>
              <option value="inactive">{t('settings.users.status.inactive')}</option>
              <option value="suspended">{t('settings.users.status.suspended')}</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="email_verified_edit"
              checked={userForm.email_verified}
              onChange={(e) => updateUserForm({ email_verified: e.target.checked })}
              className="rounded border-theme-border"
            />
            <label htmlFor="email_verified_edit" className="text-sm text-theme-foreground-muted">
              {t('settings.users.emailVerified')}
            </label>
          </div>
          <div className="flex gap-2 pt-4">
            <button
              onClick={handleUpdateUser}
              className="btn-base btn-primary flex-1"
            >
              {t('settings.users.updateUser')}
            </button>
            <button
              onClick={() => setShowEditModal(false)}
              className="btn-base btn-secondary flex-1"
            >
              {t('settings.users.cancel')}
            </button>
          </div>
        </div>
      </Modal>

      {/* 查看用户详情模态框 */}
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title={t('settings.users.userDetails')}
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-theme-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-lg font-medium text-theme-primary">
                  {selectedUser.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-theme-foreground">{selectedUser.username}</h3>
              <p className="text-theme-foreground-muted">{selectedUser.email}</p>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-theme-foreground-muted">{t('settings.users.userStatus')}:</span>
                {getStatusBadge(selectedUser.status)}
              </div>
              <div className="flex justify-between">
                <span className="text-theme-foreground-muted">{t('settings.users.emailVerificationStatus')}:</span>
                <span className={selectedUser.email_verified ? 'text-green-600' : 'text-red-600'}>
                  {selectedUser.email_verified ? t('settings.users.verified') : t('settings.users.unverified')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-theme-foreground-muted">{t('settings.users.fullName')}:</span>
                <span className="text-theme-foreground">
                  {selectedUser.first_name || selectedUser.last_name 
                    ? `${selectedUser.first_name} ${selectedUser.last_name}` 
                    : t('settings.users.notSet')
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-theme-foreground-muted">{t('settings.users.createdAt')}:</span>
                <span className="text-theme-foreground">
                  {formatTime(selectedUser.created_at)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-theme-foreground-muted">{t('settings.users.lastLoginAt')}:</span>
                <span className="text-theme-foreground">
                  {selectedUser.last_login_at 
                    ? formatTime(selectedUser.last_login_at)
                    : t('settings.users.neverLoggedIn')
                  }
                </span>
              </div>
              <div>
                <span className="text-theme-foreground-muted">{t('settings.users.userRoles')}:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedUser.roles.map((role) => (
                    <span
                      key={role.id}
                      className="tag-base tag-primary"
                    >
                      {role.display_name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 角色管理模态框 */}
      <Modal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        title={t('settings.users.manageUserRoles')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-foreground-muted mb-2">
              {t('settings.users.selectRoleRequired')}
            </label>
            <div className="space-y-2">
              {roles.map((role) => (
                <div key={role.id} className="flex items-center">
                  <input
                    type="radio"
                    id={`role-${role.id}`}
                    name="user-role"
                    checked={userForm.roles.includes(role.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateUserForm({ roles: [role.id] });
                      }
                    }}
                    className="rounded border-theme-border"
                  />
                  <label htmlFor={`role-${role.id}`} className="ml-2 text-sm text-theme-foreground">
                    {role.display_name}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <button
              onClick={handleUpdateUserRoles}
              className="btn-base btn-primary flex-1"
            >
              {t('settings.users.updateRole')}
            </button>
            <button
              onClick={() => setShowRoleModal(false)}
              className="btn-base btn-secondary flex-1"
            >
              {t('settings.users.cancel')}
            </button>
          </div>
        </div>
      </Modal>

      {/* 激活用户模态框 */}
      <Modal
        isOpen={showActivateModal}
        onClose={() => setShowActivateModal(false)}
        title={t('settings.users.activateUserWithRole')}
      >
        <div className="space-y-4">
          {selectedUser && (
            <>
              <div className="text-center">
                <div className="h-12 w-12 rounded-full bg-theme-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-lg font-medium text-theme-primary">
                    {selectedUser.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-theme-foreground">{selectedUser.username}</h3>
                <p className="text-theme-foreground-muted">{selectedUser.email}</p>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-700">
                  {t('settings.users.activateDescription')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-foreground-muted mb-2">
                  {t('settings.users.selectRoleRequired')} <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {roles.map((role) => (
                    <div key={role.id} className="flex items-center">
                      <input
                        type="radio"
                        id={`activate-role-${role.id}`}
                        name="activate-user-role"
                        checked={userForm.roles.includes(role.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateUserForm({ roles: [role.id] });
                          }
                        }}
                        className="rounded border-theme-border"
                      />
                      <label htmlFor={`activate-role-${role.id}`} className="ml-2 text-sm text-theme-foreground">
                        <span className="font-medium">{role.display_name}</span>
                        {role.description && (
                          <span className="text-theme-foreground-muted ml-1">- {role.description}</span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleConfirmActivateUser}
                  disabled={userForm.roles.length === 0}
                  className="btn-base btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('settings.users.activateUserButton')}
                </button>
                <button
                  onClick={() => setShowActivateModal(false)}
                  className="btn-base btn-secondary flex-1"
                >
                  {t('settings.users.cancel')}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </section>
  );
}