'use client';

import React from 'react';
import { Users, Globe, Mail, Package, Info, Code } from 'lucide-react';


interface AppInfoTabProps {
  // 可以接收一些props
}

export function AppInfoTab({}: AppInfoTabProps) {
  // 从package.json动态获取版本信息
  const packageJson = require('../../../../../package.json');
  const currentVersion = packageJson.version;

  return (
    <section className="bg-theme-background">
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-6">
        <Info className="w-5 h-5" />
        <h2 className="text-xl font-semibold text-theme-foreground">应用信息</h2>
      </div>
        
        <div className="space-y-8">
        {/* 应用详情板块 */}
        <div className="bg-theme-card rounded-lg p-6 shadow-sm border border-theme-border">
          <h3 className="text-lg font-semibold text-theme-foreground mb-4">应用详情</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 开发团队 */}
            <div className="bg-theme-card rounded-lg p-4 border border-theme-border">
              <div className="flex items-center gap-3 mb-3">
                <Code className="w-5 h-5 text-theme-primary" />
                <h3 className="font-medium text-theme-foreground">开发团队</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-theme-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-theme-primary">Z</span>
                  </div>
                  <span className="text-theme-foreground">Zack</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-theme-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-theme-primary">B</span>
                  </div>
                  <span className="text-theme-foreground">Benny</span>
                </div>
              </div>
            </div>

            {/* 官方网站 */}
            <div className="bg-theme-card rounded-lg p-4 border border-theme-border">
              <div className="flex items-center gap-3 mb-3">
                <Globe className="w-5 h-5 text-theme-primary" />
                <h3 className="font-medium text-theme-foreground">官方网站</h3>
              </div>
              <a 
                href="https://kunpuai.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-theme-primary hover:text-theme-primary-hover transition-colors duration-200 flex items-center gap-2"
              >
                <span>kunpuai.com</span>
              </a>
            </div>

            {/* 支持邮箱 */}
            <div className="bg-theme-card rounded-lg p-4 border border-theme-border md:col-span-2">
              <div className="flex items-center gap-3 mb-3">
                <Mail className="w-5 h-5 text-theme-primary" />
                <h3 className="font-medium text-theme-foreground">支持邮箱</h3>
              </div>
              <a 
                href="mailto:info@kunpuai.com" 
                className="text-theme-primary hover:text-theme-primary-hover transition-colors duration-200 flex items-center gap-2"
              >
                <span>info@kunpuai.com</span>
                <Mail className="w-4 h-4" />
              </a>
              <p className="text-theme-foreground-muted text-sm mt-2">
                如有任何问题或建议，请随时联系我们的支持团队
              </p>
            </div>
          </div>
        </div>

        {/* 版本信息板块 */}
        <div className="bg-theme-card rounded-lg p-6 shadow-sm border border-theme-border">
          <h3 className="text-lg font-semibold text-theme-foreground mb-4">版本信息</h3>

          <div className="bg-theme-card rounded-lg p-4 border border-theme-border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-theme-foreground mb-1">当前版本</h3>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-theme-primary/10 text-theme-primary">
                  v{currentVersion}
                </span>
              </div>
            </div>
          </div>

          {/* 更新日志链接或其他版本相关信息可以在这里添加 */}
          <div className="mt-4 text-center">
            <p className="text-theme-foreground-muted text-sm">
              感谢您使用 Kun Avatar！我们会持续改进产品体验。
            </p>
          </div>
        </div>


        </div>
      </div>
    </section>
  );
}