 1. 标题生成服务 (titleGenerationService.ts)
处理对话标题自动生成逻辑
包含条件检查、API调用、事件发送功能
2. 工具执行服务 (toolExecutionService.ts)
处理所有工具调用相关逻辑
支持流式和非流式两种模式
包含完整的状态管理和错误处理
3. 消息存储服务 (messageStorageService.ts)
处理聊天消息的数据库存储
支持用户消息、助手消息、工具消息保存
包含统计信息和中断处理
4. 验证服务 (validationService.ts)
处理各种请求验证逻辑
包含参数验证、服务可用性检查、工具支持测试
5. 流式聊天处理器 (streamingChatHandler.ts)
专门处理复杂的流式聊天逻辑
包含工具调用流程、错误重试、消息块处理
6. 服务索引 (index.ts)
统一导出所有服务模块