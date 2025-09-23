'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/contexts/I18nContext';

const TABS = [
  { key: 'account', label: 'settings.tabs.account' },
  { key: 'users', label: 'settings.tabs.users', adminOnly: true },
  { key: 'roles', label: 'settings.tabs.roles', adminOnly: true },
  { key: 'assistant', label: 'settings.tabs.assistant' },
  { key: 'inference', label: 'settings.tabs.inference' },
  { key: 'appearance', label: 'settings.tabs.appearance' },
  { key: 'logs', label: 'settings.tabs.logs', electronOnly: true },
  { key: 'appinfo', label: 'settings.tabs.appinfo' },
];

interface SettingsTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isAdmin: boolean;
  // 控制是否显示“日志管理”标签（需通过隐藏手势解锁）
  showLogsTab?: boolean;
}

export function SettingsTabs({ activeTab, onTabChange, isAdmin, showLogsTab = false }: SettingsTabsProps) {
  const [isElectron, setIsElectron] = useState(false);
  const { t } = useI18n();

  // 检查是否在Electron环境中
  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && !!(window as any).electronAPI);
  }, []);

  // 根据用户权限和环境过滤标签页
  const availableTabs = TABS.filter(tab => {
    // 检查管理员权限
    if (tab.adminOnly && !isAdmin) return false;
    // 检查Electron环境
    if (tab.electronOnly && !isElectron) return false;
    // 受控隐藏“日志管理”标签
    if (tab.key === 'logs' && !showLogsTab) return false;
    return true;
  });

  return (
    <div className="mb-6">
      <div className="border-b border-theme-border">
        <nav className="-mb-px flex space-x-8">
          {availableTabs.map((tab) => {
            return (
              <button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                className={`${
                  activeTab === tab.key
                    ? 'border-theme-primary text-theme-primary'
                    : 'border-transparent text-theme-foreground-muted hover:text-theme-foreground hover:border-theme-border-secondary'
                } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 focus:outline-none`}
              >
                <span>{t(tab.label)}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}