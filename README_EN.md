<div align="center">

<img src="./banner/logoiconbg.png" alt="KunAvatar Logo" width="200" height="200" />

# 🤖 KunAvatar - AI as Your Avatar

[![Next.js](https://img.shields.io/badge/Next.js-15.3.3-black)](https://nextjs.org/) [![React](https://img.shields.io/badge/React-19.1.0-blue)](https://reactjs.org/) [![Ollama](https://img.shields.io/badge/Ollama-Compatible-green)](https://ollama.ai/)

English | [简体中文](./README.md)

</div>

## 📋 Table of Contents

- [✨ Project Overview](#-project-overview)
- [🎯 Core Features](#-core-features)
  - [🤖 Intelligent Conversation System](#-intelligent-conversation-system)
  - [🧠 Advanced Memory System](#-advanced-memory-system)
  - [🎯 Auxiliary Model System](#-auxiliary-model-system)
  - [🧠 Agent System](#-agent-system)
  - [🔧 MCP Tool Integration](#-mcp-tool-integration)
  - [👥 Enterprise User Management](#-enterprise-user-management)
- [🛠️ Tech Stack](#️-tech-stack)
- [🚀 Quick Start](#-quick-start)
- [📖 User Guide](#-user-guide)
- [🔧 Available Commands](#-available-commands)
- [📁 Project Structure](#-project-structure)
- [🌟 Feature Highlights](#-feature-highlights)
- [🚀 Roadmap](#-roadmap)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [🙏 Acknowledgments](#-acknowledgments)
- [📞 Contact Us](#-contact-us)

## ✨ Project Overview

KunAvatar is a lightweight, locally-deployed AI application that provides not only a complete AI conversation solution, but also excels in **memory systems**, **auxiliary models**, **MCP tool integration**, and **enterprise-grade user management**.

### 🎯 Core Advantages

- **🧠 Intelligent Memory** - Recursive memory system that enables AI to truly "remember" conversation content
- **🎯 Model Collaboration** - Multi-model synergy where main models focus on conversation while auxiliary models optimize experience
- **🔧 Tool Ecosystem** - MCP tool integration supporting multiple protocols including SSE and Streamable HTTP
- **👥 Enterprise Management** - Complete RBAC permission system with multi-tenant and resource-level data management
- **🚀 Local Deployment** - Fully localized data for privacy protection with LAN access support

Whether for personal use, team collaboration, or enterprise deployment, KunAvatar provides professional, secure, and intelligent AI interaction experiences.

## 🎯 Core Features

### 🤖 Intelligent Conversation System
- **Streaming Responses** - Real-time AI reply display for smooth conversation experience
- **Multi-Model Support** - Compatible with all Ollama models with hot-swapping capability
- **Context Memory** - Intelligent memory management maintaining long conversation coherence
- **Conversation History** - Complete conversation records with search functionality

### 🧠 Advanced Memory System
- **Intelligent Context Management** - Automatic conversation analysis and key information extraction
- **Recursive Memory Updates** - Dynamic updating and optimization of memory content
- **Memory Optimization Algorithms** - Intelligent compression and organization of conversation history
- **Background Memory Service** - Asynchronous memory processing without affecting conversation flow
- **Global Memory Settings** - User-level memory configuration and management support

### 🔧 MCP Tool Integration
- **Multi-Transport Protocol Support** - Supports stdio, SSE, and Streamable HTTP connections
- **One-Click Tool Discovery** - Automatic MCP server discovery and connection for quick tool access
- **Multi-Server Management** - Simultaneous management of multiple MCP servers with unified tool interfaces
- **Real-Time Tool Execution** - Enables AI to execute external tools
- **Tool Status Monitoring** - Real-time monitoring of tool connection status and execution results
- **Tool Permission Management** - Fine-grained control over tool access permissions
- **SSE Streaming Connection** - Server-Sent Events real-time communication support
- **HTTP Streaming Transport** - Official recommended Streamable HTTP transport method
- **STDIO Standard I/O** - Integrated multiple local STDIO tools

### 🎯 Auxiliary Model System
- **Multi-Model Collaboration** - Main and auxiliary models working in synergy
- **Prompt Optimization** - Dedicated models for optimizing user input and system prompts
- **Title & Summary Generation** - Automatic conversation title and content summary generation
- **Memory Models** - Support for custom memory models to optimize conversation effectiveness

### 🧠 Agent System
- **Configurable Agents** - Create professional domain AI assistants
- **Custom MCP Tools** - Tailor a unique toolset for each agent
- **System Prompt Management** - Flexible prompt configuration and optimization
- **Agent Memory Association** - Each agent maintains independent memory systems

### 👥 Enterprise User Management
- **Resource-Level Data Management** - Fine-grained management of users, roles, and permissions
- **RBAC Access Control** - Role-based access control system
- **Enterprise Modules** - Multi-tenant support, data isolation, and permission auditing
- **User Status Management** - Support for user activation, suspension, and disabling
- **Role Permission Assignment** - Flexible role creation and permission allocation mechanisms
- **Data Security Isolation** - Ensures complete data isolation between different users

## 🛠️ Tech Stack

### Frontend Technologies
- **Next.js 15** - React full-stack framework with App Router support
- **React 19** - Latest React version with improved performance
- **TypeScript** - Type-safe JavaScript superset
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Powerful animation library
- **three.js** - 3D graphics library

### Backend Technologies
- **Next.js API Routes** - Server-side API implementation
- **SQLite3** - Lightweight database with Better-SQLite3 support
- **JWT** - JSON Web Token authentication
- **bcryptjs** - Password encryption

### AI Integration
- **Ollama** - Local large language model runtime
- **MCP (Model Context Protocol)** - Tool invocation protocol
- **Streaming Responses** - Real-time AI reply display

## 🚀 Quick Start

### Requirements

- **Node.js** >= 22.15.0+
- **npm** >= 11.3.0+
- **Ollama** >= 0.9.6+ (Recommended)

### Installation Steps

1. **Clone the Repository**
```bash
git clone https://github.com/KunLabAI/kun-avatar.git
cd kun-avatar
```

2. **Install Dependencies**
```bash
npm run install
```

3. **Start the Application**
```bash
npx start
```

The application will automatically:
- 🔍 Detect local IP address
- 🌐 Configure LAN access
- 🚀 Start development server
- 📱 Open application in browser

### Alternative Start Methods

For manual startup:

```bash
cd kunavatar
npx run dev
```

For script-based startup:
```bash
node start.js
```

## 📖 User Guide

### Initial Setup

1. **Install Ollama**
   - Visit [Ollama Official Website](https://ollama.ai/) to download and install
   - Pull required models: `ollama pull llama2`

2. **Create Administrator Account**
```bash
cd kunavatar/scripts
node init-admin.js
```

3. **Configure MCP Servers** (Optional)
   - Add external tool servers in MCP configuration page
   - Configure tool permissions and parameters

### Basic Usage

1. **Start Conversations**
   - Select AI model
   - Choose agent (optional)
   - Begin conversing with AI

2. **Manage Conversations**
   - View conversation history
   - Search historical messages
   - Export conversation records

3. **Configure Agents**
   - Create professional domain AI assistants
   - Set system prompts
   - Configure model parameters

## 🔧 Available Commands

| Command | Description |
|---------|-------------|
| `npm start` | Smart startup (recommended) |
| `npm run install` | Install project dependencies |
| `npm run build` | Build production version |
| `npm run init-admin` | Initialize administrator account |

## 📁 Project Structure

```
Kun-Avatar/
├── 📄 start.js                    # Smart startup script
├── 📄 package.json                # Launcher configuration
├── 📁 kunavatar/                  # Main application directory
│   ├── 📁 src/                    # Source code
│   │   ├── 📁 app/                # Next.js pages and APIs
│   │   │   ├── 📁 api/            # API routes
│   │   │   │   ├── 📁 chat/       # Chat-related APIs
│   │   │   │   ├── 📁 models/     # Model management APIs
│   │   │   │   ├── 📁 mcp/        # MCP tool APIs
│   │   │   │   └── 📁 auth/       # Authentication APIs
│   │   │   ├── 📁 simple-chat/    # Chat interface
│   │   │   ├── 📁 model-manager/  # Model management
│   │   │   ├── 📁 mcp-config/     # MCP configuration
│   │   │   └── 📁 agents/         # Agent management
│   │   ├── 📁 components/         # Shared components
│   │   ├── 📁 lib/                # Core libraries
│   │   │   ├── 📁 database/       # Database operations
│   │   │   ├── 📁 mcp/            # MCP client
│   │   │   ├── 📄 ollama.ts       # Ollama API
│   │   │   └── 📄 auth.ts         # Authentication service
│   │   ├── 📁 hooks/              # React Hooks
│   │   └── 📁 types/              # TypeScript types
│   ├── 📁 scripts/                # Utility scripts
│   ├── 📁 public/                 # Static assets
│   └── 📄 package.json            # Application dependencies
├── 📁 docs/                       # Project documentation
│   ├── 📄 projectdoc.md           # Detailed project documentation
│   ├── 📄 mcp-usage-guide.md      # MCP usage guide
│   └── 📄 ollamaapi.md            # Ollama API documentation
└── 📄 局域网部署说明.md            # Deployment guide
```

## 🌟 Feature Highlights

### 🧠 Advanced Memory System
- **Intelligent Context Management** - Automatic conversation analysis and structured memory formation from key information
- **Recursive Memory Updates** - Dynamic updating and optimization of existing memories based on new conversation content
- **Background Asynchronous Processing** - Memory generation occurs in background without affecting conversation response speed
- **Memory Optimization Algorithms** - Intelligent compression of long conversations while preserving core information
- **User-Level Memory Configuration** - Personalized memory settings and management strategies

### 🎯 Auxiliary Model System
- **Multi-Model Collaborative Architecture** - Main conversation models work with specialized auxiliary models
- **Intelligent Prompt Optimization** - Dedicated models automatically optimize user input and system prompts
- **Automatic Title & Summary** - Intelligent generation of conversation titles and content summaries
- **Model Capability Detection** - Automatic detection of model support for advanced features like tool calling
- **Performance Monitoring & Analysis** - Real-time monitoring of model response times and quality metrics

### 🔧 MCP Tool Ecosystem
- **Three Connection Protocols** - Support for stdio, SSE, and Streamable HTTP transport methods
- **One-Click Tool Discovery** - Automatic scanning and connection of available MCP servers
- **Unified Multi-Server Management** - Centralized management of multiple tool servers with unified interfaces
- **Real-Time Status Monitoring** - Monitor tool connection status, execution results, and performance metrics
- **Fine-Grained Permission Control** - Tool-level access permission management
- **Streaming Communication Support** - SSE and HTTP streaming for real-time interactive experiences

### 👥 Enterprise User Management
- **RBAC Permission System** - Complete role-based access control system
- **Resource-Level Data Management** - Fine-grained management of users, roles, and permissions
- **Multi-Tenant Data Isolation** - Complete data isolation between different users and organizations
- **User Status Control** - Support for user activation, suspension, disabling, and other status management
- **Operation Audit Logs** - Complete recording of user operations and system access logs
- **Enterprise Security** - JWT authentication, password encryption, attack protection, and other security measures

### 💬 Intelligent Conversation Experience
- **Streaming Response Display** - Real-time AI reply display with instant feedback
- **Multi-Turn Context Preservation** - Intelligent maintenance of long conversation coherence and logic
- **Code Syntax Highlighting** - Support for multiple programming language code highlighting
- **Markdown Rendering** - Complete support for Markdown format content rendering
- **Conversation History Management** - Persistent storage with search and export functionality

## 🚀 Roadmap

We are actively developing more exciting features. Here's our development roadmap:

### 📋 Near-Term Plans

#### 🧠 Memory System Optimization
- **Intelligent Context Compression** - More efficient conversation context compression algorithms
- **Hierarchical Memory Management** - Support for short-term, medium-term, and long-term memory layered storage
- **Memory Retrieval Optimization** - Improved accuracy and speed of memory retrieval
- **Memory Visualization** - Visual management interface for memory content

#### 🔄 Enhanced Model Management
- **One-Click Model Pulling** - Direct model pulling and installation from Ollama official repository
- **Model Version Management** - Support for model version control and rollback functionality

#### 💻 Desktop Client Support
- **Windows Client** - Native Windows desktop application
- **macOS Client** - Native macOS desktop application
- **Linux Client** - Support for mainstream Linux distributions
- **Cross-Platform Sync** - Real-time data synchronization between desktop and web clients
- **Offline Mode** - Support for completely offline AI conversation functionality

#### 🌐 Multi-Language Support
- **Multi-Language Model Support** - Support for more language models and translation features
- **Multi-Language Interface** - Multi-language user interface and interaction

### 💡 Contributing Ideas

We welcome community ideas and suggestions! If you have great ideas or feature requests, please:

- 📝 Submit feature requests in [Issues](https://github.com/KunLabAI/kun-avatar/issues)
- 💬 Participate in discussions in [Discussions](https://github.com/KunLabAI/kun-avatar/discussions)
- 🔧 Submit Pull Requests to contribute code

---

## 🤝 Contributing

We welcome all forms of contributions! Whether bug reports, feature suggestions, or code contributions.

### How to Contribute

1. **Fork the Project**
2. **Create Feature Branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit Changes** (`git commit -m 'Add some AmazingFeature'`)
4. **Push to Branch** (`git push origin feature/AmazingFeature`)
5. **Create Pull Request**

### Development Guidelines

- Follow existing code style
- Add appropriate tests
- Update relevant documentation
- Ensure all tests pass

## 📄 License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Ollama](https://ollama.ai/) - Local AI model runtime
- [Next.js](https://nextjs.org/) - Powerful React framework
- [Model Context Protocol](https://modelcontextprotocol.io/) - Tool invocation protocol standard
- All contributors and users for their support

## 📞 Contact Us

- **Project Homepage**: [GitHub Repository](https://github.com/KunLabAI/kun-avatar)
- **Issue Reports**: [Issues](https://github.com/KunLabAI/kun-avatar/issues)
- **Feature Suggestions**: [Discussions](https://github.com/KunLabAI/kun-avatar/discussions)
- **Contact Email**: [info@kunpuai.com](mailto:info@kunpuai.com)

---

<div align="center">

**If this project helps you, please give us a ⭐️**

Made with ❤️ by KunAvatar Team

</div>