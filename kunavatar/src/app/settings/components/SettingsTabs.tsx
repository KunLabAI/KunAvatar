'use client';

import React from 'react';

const TABS = [
  { key: 'account', label: '账户管理' },
  { key: 'users', label: '用户管理', adminOnly: true },
  { key: 'roles', label: '角色管理', adminOnly: true },
  { key: 'assistant', label: '辅助模型' },
  { key: 'inference', label: '推理引擎' },
  { key: 'appearance', label: '界面设置' },
  { key: 'appinfo', label: '应用信息' },
];

interface SettingsTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isAdmin: boolean;
}

export function SettingsTabs({ activeTab, onTabChange, isAdmin }: SettingsTabsProps) {
  // 根据用户权限过滤标签页
  const availableTabs = TABS.filter(tab => !tab.adminOnly || isAdmin);

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
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}