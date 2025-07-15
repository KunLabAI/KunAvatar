# 更新日志 / Changelog

本文件记录了 KunAvatar 项目的所有重要变更。
This file documents all notable changes to the KunAvatar project.

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [未发布] / [Unreleased]

### 新增 / Added
- 完整的项目文档和README
- MIT开源许可证
- 贡献指南文档

### 变更 / Changed
- 优化了项目结构说明
- 改进了安装和使用指南

## [1.0.0] - 2024-01-XX

### 新增 / Added
- 🤖 智能AI对话系统
  - 流式对话响应
  - 多模型支持（兼容所有Ollama模型）
  - 上下文记忆管理
  - 对话历史记录和搜索

- 🧠 智能体系统
  - 可配置的AI智能体
  - 角色扮演功能
  - 系统提示词管理
  - 智能体性能统计

- 🔧 MCP工具集成
  - Model Context Protocol支持
  - 多服务器连接管理
  - 实时工具调用
  - 工具状态监控

- 🎨 现代化用户界面
  - 响应式设计（桌面端和移动端）
  - 深浅主题切换
  - 流畅动画效果（基于Framer Motion）
  - 直观的操作界面

- 🔐 安全与权限系统
  - JWT令牌认证
  - 角色权限管理
  - 用户数据隔离
  - 安全的密码加密

- 🌐 部署功能
  - 一键智能启动
  - 自动IP检测和局域网配置
  - Docker容器化支持
  - 本地数据存储

- 📊 数据管理
  - SQLite数据库集成
  - 完整的数据备份和恢复
  - 对话统计和分析
  - 数据导出功能

### 技术栈 / Tech Stack
- **前端**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **后端**: Next.js API Routes, SQLite, JWT认证
- **AI集成**: Ollama, MCP协议, 流式响应
- **动画**: Framer Motion
- **数据库**: Better-SQLite3

### 支持的功能 / Supported Features
- ✅ 多轮对话与上下文保持
- ✅ 实时流式AI响应
- ✅ 代码高亮和Markdown渲染
- ✅ 多种AI模型切换
- ✅ 自定义智能体创建
- ✅ 外部工具调用（MCP）
- ✅ 对话历史管理
- ✅ 用户认证和权限控制
- ✅ 响应式界面设计
- ✅ 深浅主题切换

---

## 版本说明 / Version Notes

### 版本号格式 / Version Format
- **主版本号**: 不兼容的API修改 / Major: Incompatible API changes
- **次版本号**: 向下兼容的功能性新增 / Minor: Backwards compatible functionality additions
- **修订号**: 向下兼容的问题修正 / Patch: Backwards compatible bug fixes

### 变更类型 / Change Types
- **新增 / Added**: 新功能 / New features
- **变更 / Changed**: 对现有功能的变更 / Changes to existing functionality
- **弃用 / Deprecated**: 即将移除的功能 / Features that will be removed
- **移除 / Removed**: 已移除的功能 / Removed features
- **修复 / Fixed**: 任何bug修复 / Any bug fixes
- **安全 / Security**: 安全相关的修复 / Security related fixes