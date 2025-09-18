'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, Edit, Save, X, Eye, EyeOff, Shield, Mail, Calendar, Check, LogOut } from 'lucide-react';
import { useNotification } from '@/components/notification';
import { formatTime } from '@/lib/utils/time';
import { PageLoading } from '@/components/Loading';
import type { ElectronAPI } from '@/types/electron';
import { safeNavigateToLogin } from '@/lib/security/url-validator';

interface UserInfo {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  status: 'pending' | 'active' | 'inactive' | 'suspended';
  email_verified: boolean;
  roles: Array<{
    id: number;
    name: string;
    display_name: string;
  }>;
  created_at: string;
  last_login_at?: string;
}

// 默认的空用户信息，防止未定义错误
const defaultUserInfo: UserInfo = {
  id: 0,
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  status: 'active',
  email_verified: false,
  roles: [],
  created_at: new Date().toISOString(),
  last_login_at: undefined,
};

interface AccountManagementTabProps {
  // 可以接收一些props，比如当前用户信息
}

export function AccountManagementTab({}: AccountManagementTabProps) {
  const router = useRouter();
  const notification = useNotification();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  // 获取当前用户信息
  const fetchUserInfo = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) {
        notification.error('认证失败', '请先登录');
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // 认证失败，清除token并跳转到登录页面
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          notification.error('认证失败', '登录已过期，请重新登录');
          // 🔧 安全修复：使用安全导航函数替换直接的 window.location.href
          safeNavigateToLogin(500);
          return;
        }
        throw new Error('获取用户信息失败');
      }

      const data = await response.json();
      if (data.success) {
        // 确保 roles 是数组格式
        const userWithRoles = {
          ...data.user,
          roles: Array.isArray(data.user.roles) ? data.user.roles : []
        };
        setUserInfo(userWithRoles);
        setEditForm({
          first_name: data.user.first_name || '',
          last_name: data.user.last_name || '',
          email: data.user.email || '',
        });
      } else {
        notification.error('获取用户信息失败', data.error || '获取用户信息失败');
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      notification.error('获取用户信息失败', error instanceof Error ? error.message : '获取用户信息失败');
    } finally {
      setLoading(false);
    }
  }, [notification]);

  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  // 获取安全的用户信息（有默认值）
  const getSafeUserInfo = () => userInfo || defaultUserInfo;

  // 更新用户信息
  const handleUpdateProfile = async () => {
    if (!userInfo) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/users/${userInfo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });

      const data = await response.json();
      if (data.success) {
        // 确保 roles 是数组格式
        const userWithRoles = {
          ...data.user,
          roles: Array.isArray(data.user.roles) ? data.user.roles : []
        };
        setUserInfo(userWithRoles);
        setIsEditing(false);
        setError(null);
        notification.success('更新成功', '用户信息已成功更新');
      } else {
        notification.error('更新失败', data.error || '更新用户信息失败');
      }
    } catch (error) {
      console.error('更新用户信息失败:', error);
      notification.error('更新失败', error instanceof Error ? error.message : '更新用户信息失败');
    }
  };

  // 退出登录
  const handleLogout = async () => {
    try {
      // 清除本地存储的token
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      // 显示成功消息
      notification.success('退出成功', '您已成功退出登录');
      
      // 🔧 安全修复：使用安全导航函数替换不安全的导航逻辑
      // 检查是否在Electron环境中并传递给安全导航函数
      const electronAPI = typeof window !== 'undefined' ? window.electronAPI : undefined;
      safeNavigateToLogin(500, electronAPI);
    } catch (error) {
      console.error('退出登录失败:', error);
      notification.error('退出失败', '退出登录时发生错误');
      
      // 即使出错也要跳转到登录页
      const electronAPI = typeof window !== 'undefined' ? window.electronAPI : undefined;
      safeNavigateToLogin(1000, electronAPI);
    }
  };

  // 修改密码
  const handleChangePassword = async () => {
    if (!userInfo) return;

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      notification.error('密码确认错误', '新密码确认不匹配');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/users/${userInfo.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordForm.current_password,
          newPassword: passwordForm.new_password,
          confirmPassword: passwordForm.confirm_password,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setPasswordForm({
          current_password: '',
          new_password: '',
          confirm_password: '',
        });
        setIsChangingPassword(false);
        setError(null);
        notification.success('密码修改成功', '您的密码已成功更新');
      } else {
        notification.error('密码修改失败', data.error || '密码修改失败');
      }
    } catch (error) {
      console.error('密码修改失败:', error);
      notification.error('密码修改失败', error instanceof Error ? error.message : '密码修改失败');
    }
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
      pending: '待审核',
      active: '活跃',
      inactive: '未激活',
      suspended: '已暂停',
    };
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  if (loading) {
    return (
      <PageLoading 
        text="loading..." 
        fullScreen={false}
      />
    );
  }

  if (error) {
    return (
      <section className="bg-theme-card">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchUserInfo}
              className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-colors"
            >
              重试
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!userInfo) {
    return (
      <section className="bg-theme-card">
        <div className="flex items-center justify-center min-h-[200px]">
          <p className="text-theme-foreground-muted">未找到用户信息</p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-theme-background">
      <div className="space-y-6">
        {/* 标题 */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-theme-foreground flex items-center gap-2">
            <User className="w-5 h-5" />
            账户管理
          </h2>
        </div>

        {/* 用户基本信息 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 个人信息卡片 */}
          <div className="bg-theme-card rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-theme-foreground">个人信息</h3>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-theme-primary hover:text-theme-primary-hover transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-theme-foreground-muted">用户名</span>
                <div className="text-theme-foreground font-medium">{getSafeUserInfo().username}</div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-theme-foreground-muted">邮箱</span>
                {isEditing ? (
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="form-input-base max-w-xs"
                    />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-theme-foreground">{getSafeUserInfo().email}</span>
                    {getSafeUserInfo().email_verified && (
                      <Check className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-theme-foreground-muted">名字</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    className="form-input-base max-w-xs"
                  />
                ) : (
                  <div className="text-theme-foreground">{getSafeUserInfo().first_name || '-'}</div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-theme-foreground-muted">姓氏</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                    className="form-input-base max-w-xs"
                  />
                ) : (
                  <div className="text-theme-foreground">{getSafeUserInfo().last_name || '-'}</div>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleUpdateProfile}
                  className="btn-base btn-primary"
                >
                  <Save className="w-4 h-4" />
                  保存
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditForm({
                      first_name: getSafeUserInfo().first_name || '',
                      last_name: getSafeUserInfo().last_name || '',
                      email: getSafeUserInfo().email || '',
                    });
                  }}
                  className="btn-base btn-secondary"
                >
                  <X className="w-4 h-4" />
                  取消
                </button>
              </div>
            )}
          </div>

          {/* 账户状态卡片 */}
          <div className="bg-theme-card rounded-lg p-4">
            <h3 className="text-lg font-medium text-theme-foreground mb-4">账户状态</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-theme-foreground-muted">状态</span>
                {getStatusBadge(getSafeUserInfo().status)}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-theme-foreground-muted">邮箱验证</span>
                <span className={`text-sm font-medium ${getSafeUserInfo().email_verified ? 'text-green-600' : 'text-red-600'}`}>
                  {getSafeUserInfo().email_verified ? '已验证' : '未验证'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-theme-foreground-muted">角色</span>
                <div className="flex gap-1">
                  {getSafeUserInfo().roles.length > 0 ? (
                    getSafeUserInfo().roles.map(role => (
                      <span key={role.id} className="tag-base tag-primary">
                        {role.display_name}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-theme-foreground-muted">无角色</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-theme-foreground-muted">注册时间</span>
                <span className="text-sm text-theme-foreground">
                  {formatTime(getSafeUserInfo().created_at)}
                </span>
              </div>

              {getSafeUserInfo().last_login_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-theme-foreground-muted">最后登录</span>
                  <span className="text-sm text-theme-foreground">
                    {formatTime(getSafeUserInfo().last_login_at!)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 密码修改 */}
        <div className="bg-theme-card rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-theme-foreground flex items-center gap-2">
              <Shield className="w-5 h-5" />
              密码安全
            </h3>
            {!isChangingPassword && (
              <button
                onClick={() => setIsChangingPassword(true)}
                className="text-theme-primary hover:text-theme-primary-hover transition-colors"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
          </div>

          {isChangingPassword ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-foreground-muted mb-1">
                  当前密码
                </label>
                <input
                  type="password"
                  value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                  className="form-input-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-foreground-muted mb-1">
                  新密码
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    className="form-input-base pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-theme-foreground-muted"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-foreground-muted mb-1">
                  确认新密码
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    className="form-input-base pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-theme-foreground-muted"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleChangePassword}
                  className="btn-base btn-primary"
                >
                  <Save className="w-4 h-4" />
                  修改密码
                </button>
                <button
                  onClick={() => {
                    setIsChangingPassword(false);
                    setPasswordForm({
                      current_password: '',
                      new_password: '',
                      confirm_password: '',
                    });
                  }}
                  className="btn-base btn-secondary"
                >
                  <X className="w-4 h-4" />
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div className="text-theme-foreground-muted">
              <p>点击编辑按钮可以修改您的密码</p>
            </div>
          )}
        </div>

        {/* 退出登录 */}
        <div className="bg-theme-background">
          <button
            onClick={handleLogout}
            className="btn-base bg-red-500 hover:bg-red-600 text-white px-4 py-2 flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </button>
        </div>

        {/* 错误信息 */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>
    </section>
  );
}