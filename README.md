<div align="center">

<img src="./banner/logoiconbg.png" alt="KunAvatar Logo" width="200" height="200" />

# KunAvatar - AI就是你的化身

<div class="badges-container">

[![Version](https://img.shields.io/github/package-json/v/KunLabAI/kun-avatar/main?filename=kunavatar%2Fpackage.json&style=for-the-badge&logo=github&logoColor=white&color=gradient)](https://github.com/KunLabAI/kun-avatar) [![Ollama](https://img.shields.io/badge/Ollama-Compatible-00D4AA?style=for-the-badge&logo=ollama&logoColor=white)](https://ollama.ai/) [![License](https://img.shields.io/badge/License-Apache%202.0-FF6B6B?style=for-the-badge&logo=apache&logoColor=white)](https://opensource.org/licenses/Apache-2.0) 

</div>

[English](./README_EN.md) | 简体中文

</div>

## ✨ 项目简介

KunAvatar 是一个轻量级本地部署的AI应用，它不仅提供了完整的AI对话解决方案，更在**记忆系统**、**辅助模型**、**MCP工具调用**和**企业级用户管理**等方面具有突出优势。

## 📋 目录

<table>
<tr>
<td width="33%">

**🚀 快速开始**
- [项目简介](#-项目简介)
- [核心优势](#-核心优势)
- [快速开始](#-快速开始)
- [使用指南](#-使用指南)

</td>
<td width="33%">

**⚡ 核心功能**
- [核心特性](#-核心特性)
- [功能亮点](#-功能亮点)
- [技术栈](#️-技术栈)
- [项目结构](#-项目结构)

</td>
<td width="33%">

**🤝 社区参与**
- [后续计划](#-后续计划)
- [贡献指南](#-贡献指南)
- [许可证](#-许可证)
- [联系我们](#-联系我们)

</td>
</tr>
</table>


### 🎯 核心优势

- **🧠 智能记忆** - 递归式记忆系统，让AI真正"记住"对话内容
- **🎯 模型协作** - 多模型协同工作，主模型专注对话，辅助模型优化体验  
- **🔧 工具生态** - 支持SSE、Streamable HTTP等多种协议的MCP工具集成
- **👥 企业级管理** - 完整的RBAC权限体系，支持多租户和资源级数据管理
- **🚀 本地部署** - 数据完全本地化，保护隐私安全，支持局域网访问

无论是个人使用、团队协作还是企业部署，KunAvatar 都能为您提供专业、安全、智能的AI交互体验。

## 🎯 核心特性

### 🤖 智能对话系统
- **流式对话响应** - 实时显示AI回复，提供流畅的对话体验
- **多模型支持** - 兼容所有 Ollama 模型，支持模型热切换
- **上下文记忆** - 智能记忆管理，保持长对话的连贯性
- **对话历史** - 完整的对话记录和搜索功能

### 🧠 高级记忆系统
- **智能上下文管理** - 自动分析对话内容，提取关键信息
- **递归式记忆更新** - 动态更新和优化记忆内容
- **记忆优化算法** - 智能压缩和整理历史对话
- **后台记忆服务** - 异步处理记忆生成，不影响对话流畅度
- **全局记忆设置** - 支持用户级别的记忆配置和管理

### 🔧 MCP 工具集成
- **多传输协议支持** - 支持 stdio、SSE、Streamable HTTP 三种连接方式
- **一键连接获取工具** - 自动发现和连接MCP服务器，快速获取可用工具
- **多服务器管理** - 同时管理多个MCP服务器，统一工具调用接口
- **实时工具调用** - 让AI具备执行外部工具的能力
- **工具状态监控** - 实时监控工具连接状态和执行结果
- **工具权限管理** - 细粒度控制工具的访问权限
- **SSE 流式连接** - 支持 Server-Sent Events 实时通信
- **HTTP 流式传输** - 官方推荐的 Streamable HTTP 传输方式
- **STDIO 标准输入输出** - 已集成多款本地STDIO工具

### 🎯 辅助模型系统
- **多模型协作** - 主模型与辅助模型协同工作
- **提示词优化** - 专用模型优化用户输入和系统提示
- **标题摘要生成** - 自动生成对话标题和内容摘要
- **记忆模型** - 支持自定义记忆模型，优化对话效果

### 🧠 智能体系统
- **可配置智能体** - 创建专业领域的AI助手
- **MCP工具自定义** - 为每个智能体定制专属的工具列表
- **系统提示词管理** - 灵活的提示词配置和优化
- **智能体记忆关联** - 每个智能体拥有独立的记忆系统

### 👥 企业级用户管理
- **资源级别数据管理** - 支持用户、角色、权限的细粒度管理
- **RBAC 权限控制** - 基于角色的访问控制系统
- **企业级模块** - 支持多租户、数据隔离、权限审计
- **用户状态管理** - 支持用户激活、暂停、禁用等状态控制
- **角色权限分配** - 灵活的角色创建和权限分配机制
- **数据安全隔离** - 确保不同用户数据完全隔离

## 🛠️ 技术栈

### 前端技术
- **Next.js 15** - React 全栈框架，支持 App Router
- **React 19** - 最新的 React 版本，提供更好的性能
- **TypeScript** - 类型安全的 JavaScript 超集
- **Tailwind CSS** - 实用优先的 CSS 框架
- **Framer Motion** - 强大的动画库
- **three.js** - 3D 图形库

### 后端技术
- **Next.js API Routes** - 服务端 API 实现
- **SQLite3** - 轻量级数据库，支持 Better-SQLite3
- **JWT** - JSON Web Token 认证
- **bcryptjs** - 密码加密

### AI 集成
- **Ollama** - 本地大语言模型运行时
- **MCP (Model Context Protocol)** - 工具调用协议

## 🚀 快速开始

### 环境要求

- **Node.js** >= 22.15.0+
- **npm** >= 11.3.0+
- **Ollama** >= 0.9.6+ (推荐)

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/KunLabAI/kun-avatar.git
cd kun-avatar
```

2. **安装依赖**
```bash
npm run install
```

3. **构建项目**
```bash
npm run build
```

4. **启动应用**
```bash
npx start
```

### 启动开发模式

如果需要手动启动，可以使用：

```bash
cd kunavatar
npx next dev
```
如果需要脚本一键启动，可以使用：

```bash
node start.js
```

应用将自动：
- 🔍 检测本机IP地址
- 🌐 配置局域网访问
- 🚀 启动开发服务器
- 📱 在浏览器中打开应用


## 📖 使用指南

### 首次配置

1. **安装 Ollama**
   - 访问 [Ollama 官网](https://ollama.ai/) 下载安装
   - 拉取您需要的模型：`ollama pull gemma3`

2. **创建管理员账户**
```bash
cd kunavatar/scripts
node init-admin.js
```

### 基本使用

1. **开始对话**
   - 选择AI模型
   - 选择智能体（可选）
   - 开始与AI对话

2. **管理对话**
   - 查看对话历史
   - 搜索历史消息
   - 导出对话记录

3. **配置智能体**
   - 创建专业领域的AI助手
   - 设置系统提示词
   - 配置模型参数

## 📁 项目结构

```
Kun-Avatar/
├── 📄 start.js                    # 智能启动脚本
├── 📄 package.json                # 启动器配置
├── 📁 kunavatar/                  # 主应用目录
│   ├── 📁 src/                    # 源代码
│   │   ├── 📁 app/                # Next.js 页面和API
│   │   │   ├── 📁 api/            # API 路由
│   │   │   │   ├── 📁 chat/       # 聊天相关API
│   │   │   │   ├── 📁 models/     # 模型管理API
│   │   │   │   ├── 📁 mcp/        # MCP工具API
│   │   │   │   └── 📁 auth/       # 认证API
│   │   │   ├── 📁 simple-chat/    # 聊天界面
│   │   │   ├── 📁 model-manager/  # 模型管理
│   │   │   ├── 📁 mcp-config/     # MCP配置
│   │   │   └── 📁 agents/         # 智能体管理
│   │   ├── 📁 components/         # 共享组件
│   │   ├── 📁 lib/                # 核心库
│   │   │   ├── 📁 database/       # 数据库操作
│   │   │   ├── 📁 mcp/            # MCP客户端
│   │   │   ├── 📄 ollama.ts       # Ollama API
│   │   │   └── 📄 auth.ts         # 认证服务
│   │   ├── 📁 hooks/              # React Hooks
│   │   └── 📁 types/              # TypeScript 类型
│   ├── 📁 scripts/                # 工具脚本
│   ├── 📁 public/                 # 静态资源
│   └── 📄 package.json            # 应用依赖
├── 📁 docs/                       # 项目文档
│   ├── 📄 projectdoc.md           # 项目详细文档
│   ├── 📄 mcp-usage-guide.md      # MCP使用指南
│   └── 📄 ollamaapi.md            # Ollama API文档
└── 📄 局域网部署说明.md            # 部署指南
```

## 🌟 功能亮点

### 🧠 高级记忆系统
- **智能上下文管理** - 自动分析对话内容，提取关键信息形成结构化记忆
- **递归式记忆更新** - 基于新对话内容动态更新和优化已有记忆
- **后台异步处理** - 记忆生成在后台进行，不影响对话响应速度
- **记忆优化算法** - 智能压缩长对话，保留核心信息
- **用户级记忆配置** - 支持个性化记忆设置和管理策略

### 🎯 辅助模型系统
- **多模型协作架构** - 主对话模型与专用辅助模型分工协作
- **智能提示词优化** - 专用模型自动优化用户输入和系统提示
- **自动标题摘要** - 智能生成对话标题和内容摘要
- **模型能力检测** - 自动检测模型是否支持工具调用等高级功能
- **性能监控分析** - 实时监控各模型响应时间和质量指标

### 🔧 MCP 工具生态
- **三种连接协议** - 支持 stdio、SSE、Streamable HTTP 多种传输方式
- **一键工具发现** - 自动扫描和连接可用的MCP服务器
- **多服务器统一管理** - 集中管理多个工具服务器，统一调用接口
- **实时状态监控** - 监控工具连接状态、执行结果和性能指标
- **细粒度权限控制** - 支持工具级别的访问权限管理
- **流式通信支持** - SSE和HTTP流式传输，提供实时交互体验

### 👥 企业级用户管理
- **RBAC权限体系** - 完整的基于角色的访问控制系统
- **资源级数据管理** - 支持用户、角色、权限的细粒度管理
- **多租户数据隔离** - 确保不同用户和组织的数据完全隔离
- **用户状态控制** - 支持用户激活、暂停、禁用等多种状态管理
- **操作审计日志** - 完整记录用户操作和系统访问日志
- **企业级安全** - JWT认证、密码加密、防护攻击等安全措施

### 💬 智能对话体验
- **流式响应显示** - 实时显示AI回复，提供即时反馈
- **多轮上下文保持** - 智能维护长对话的连贯性和逻辑性
- **代码语法高亮** - 支持多种编程语言的代码高亮显示
- **Markdown渲染** - 完整支持Markdown格式的内容渲染
- **对话历史管理** - 持久化存储，支持搜索和导出功能

## 🚀 后续计划

我们正在积极开发更多激动人心的功能，以下是我们的发展路线图：

### 📋 近期计划

#### 🧠 记忆系统优化
- **智能上下文压缩** - 实现更高效的对话上下文压缩算法
- **记忆层级管理** - 支持短期、中期、长期记忆的分层存储
- **记忆检索优化** - 提升记忆检索的准确性和速度
- **记忆可视化** - 提供记忆内容的可视化管理界面

#### 🔄 模型管理增强
- **一键拉取模型** - 直接从 Ollama 官方仓库拉取和安装模型
- **模型版本管理** - 支持模型版本控制和回滚功能

#### 💻 桌面客户端支持
- **Windows 客户端** - 原生 Windows 桌面应用程序
- **macOS 客户端** - 原生 macOS 桌面应用程序  
- **Linux 客户端** - 支持主流 Linux 发行版
- **跨平台同步** - 桌面端与Web端数据实时同步
- **离线模式** - 支持完全离线的AI对话功能

#### 🌐 多语言支持
- **多语言模型支持** - 支持更多语言模型和翻译功能
- **多语言界面** - 提供多语言用户界面和交互

### 💡 贡献想法

我们欢迎社区贡献想法和建议！如果您有好的想法或功能需求，请：

- 📝 在 [Issues](https://github.com/KunLabAI/kun-avatar/issues) 中提交功能请求
- 💬 在 [Discussions](https://github.com/KunLabAI/kun-avatar/discussions) 中参与讨论
- 🔧 提交 Pull Request 贡献代码

---

## 🤝 贡献指南

我们欢迎所有形式的贡献！无论是bug报告、功能建议还是代码贡献。

### 如何贡献

1. **Fork 项目**
2. **创建功能分支** (`git checkout -b feature/AmazingFeature`)
3. **提交更改** (`git commit -m 'Add some AmazingFeature'`)
4. **推送到分支** (`git push origin feature/AmazingFeature`)
5. **创建 Pull Request**

### 开发指南

- 遵循现有的代码风格
- 添加适当的测试
- 更新相关文档
- 确保所有测试通过

## 📄 许可证

本项目采用 Apache 2.0 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Ollama](https://ollama.ai/) - 提供本地AI模型运行时
- [Next.js](https://nextjs.org/) - 强大的React框架
- [Model Context Protocol](https://modelcontextprotocol.io/) - 工具调用协议标准
- 所有贡献者和用户的支持

## 📞 联系我们

- **项目主页**: [GitHub Repository](https://github.com/KunLabAI/kun-avatar)
- **问题反馈**: [Issues](https://github.com/KunLabAI/kun-avatar/issues)
- **功能建议**: [Discussions](https://github.com/KunLabAI/kun-avatar/discussions)
- **联系邮箱**: [info@kunpuai.com](mailto:info@kunpuai.com)

---

<div align="center">

**如果这个项目对您有帮助，请给我们一个 ⭐️**

Made with ❤️ by KunAvatar Team

</div>