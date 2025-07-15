# 贡献指南 / Contributing Guide

感谢您对 KunAvatar 项目的关注！我们欢迎所有形式的贡献。

Thank you for your interest in the KunAvatar project! We welcome all forms of contributions.

## 🤝 如何贡献 / How to Contribute

### 报告问题 / Reporting Issues

如果您发现了bug或有功能建议，请：
If you find a bug or have a feature suggestion, please:

1. 检查 [Issues](https://github.com/your-username/kun-avatar/issues) 确保问题未被报告
   Check [Issues](https://github.com/your-username/kun-avatar/issues) to ensure the issue hasn't been reported
2. 创建新的 Issue，提供详细信息
   Create a new Issue with detailed information
3. 使用适当的标签标记问题类型
   Use appropriate labels to mark the issue type

### 提交代码 / Submitting Code

1. **Fork 项目 / Fork the project**
   ```bash
   git clone https://github.com/your-username/kun-avatar.git
   cd kun-avatar
   ```

2. **创建功能分支 / Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **进行开发 / Make your changes**
   - 遵循现有的代码风格 / Follow existing code style
   - 添加必要的测试 / Add necessary tests
   - 更新相关文档 / Update relevant documentation

4. **提交更改 / Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **推送到分支 / Push to your branch**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **创建 Pull Request / Create a Pull Request**

## 📝 代码规范 / Code Standards

### 提交信息格式 / Commit Message Format

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：
Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**类型 / Types:**
- `feat`: 新功能 / New feature
- `fix`: 修复bug / Bug fix
- `docs`: 文档更新 / Documentation update
- `style`: 代码格式 / Code formatting
- `refactor`: 重构 / Refactoring
- `test`: 测试 / Testing
- `chore`: 构建过程或辅助工具的变动 / Build process or auxiliary tool changes

**示例 / Examples:**
```
feat: add MCP tool integration
fix: resolve chat streaming issue
docs: update installation guide
```

### 代码风格 / Code Style

- 使用 TypeScript 进行类型安全开发 / Use TypeScript for type-safe development
- 遵循 ESLint 配置 / Follow ESLint configuration
- 使用 Prettier 格式化代码 / Use Prettier for code formatting
- 组件使用 PascalCase 命名 / Use PascalCase for component names
- 函数和变量使用 camelCase 命名 / Use camelCase for functions and variables

### 文件组织 / File Organization

```
src/
├── app/                    # Next.js App Router 页面
├── components/             # 可复用组件
│   ├── ui/                # 基础UI组件
│   └── features/          # 功能组件
├── lib/                   # 核心库和工具
├── hooks/                 # 自定义 React Hooks
├── types/                 # TypeScript 类型定义
└── styles/                # 样式文件
```

## 🧪 测试 / Testing

在提交代码前，请确保：
Before submitting code, please ensure:

1. **运行测试 / Run tests**
   ```bash
   npm run test
   ```

2. **代码检查 / Lint check**
   ```bash
   npm run lint
   ```

3. **构建检查 / Build check**
   ```bash
   npm run build
   ```

## 📚 开发环境设置 / Development Environment Setup

1. **安装依赖 / Install dependencies**
   ```bash
   npm run install-deps
   ```

2. **启动开发服务器 / Start development server**
   ```bash
   npm start
   ```

3. **配置环境变量 / Configure environment variables**
   ```bash
   cp kunavatar/.env.example kunavatar/.env.local
   # 编辑 .env.local 文件
   ```

## 🔍 代码审查 / Code Review

所有的 Pull Request 都需要经过代码审查：
All Pull Requests require code review:

- 确保代码符合项目标准 / Ensure code meets project standards
- 检查功能是否正常工作 / Check if functionality works correctly
- 验证测试覆盖率 / Verify test coverage
- 确认文档是否更新 / Confirm documentation is updated

## 📖 文档贡献 / Documentation Contributions

文档改进同样重要：
Documentation improvements are equally important:

- 修复错别字和语法错误 / Fix typos and grammar errors
- 改进现有文档的清晰度 / Improve clarity of existing documentation
- 添加缺失的文档 / Add missing documentation
- 翻译文档到其他语言 / Translate documentation to other languages

## 🎯 优先级 / Priorities

我们特别欢迎以下类型的贡献：
We especially welcome the following types of contributions:

1. **Bug 修复 / Bug fixes** - 高优先级 / High priority
2. **性能优化 / Performance improvements** - 高优先级 / High priority
3. **新功能 / New features** - 中优先级 / Medium priority
4. **文档改进 / Documentation improvements** - 中优先级 / Medium priority
5. **测试覆盖 / Test coverage** - 中优先级 / Medium priority

## 💬 交流讨论 / Communication

- **GitHub Issues** - 报告问题和功能请求 / Report issues and feature requests
- **GitHub Discussions** - 一般讨论和问题 / General discussions and questions
- **Pull Request 评论** - 代码相关讨论 / Code-related discussions

## 📄 许可证 / License

通过贡献代码，您同意您的贡献将在 MIT 许可证下发布。
By contributing code, you agree that your contributions will be licensed under the MIT License.

---

再次感谢您的贡献！🎉
Thank you again for your contribution! 🎉