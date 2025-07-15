// 导出数据库连接
export { db } from './connection';

// 导出所有类型定义
export * from './types';

// 导出各模块的操作函数
export { conversationQueries, conversationOperations } from './conversations';
export { messageQueries, messageOperations } from './messages';
export { memoryQueries, memoryOperations } from './memories';
export { mcpServerQueries, mcpServerOperations } from './mcp-servers';
export { mcpToolQueries, mcpToolOperations } from './mcp-tools';
export * from './agents';
// system-settings 已迁移到 user-settings
export { userSettingQueries, userSettingOperations } from './user-settings';

// 导出用户管理相关操作
export { userOperations } from './users';
export { roleOperations, permissionOperations, userRoleOperations, rolePermissionOperations } from './roles';
export { authTokenOperations } from './auth-tokens';
// MCP工具调用功能已迁移到messages表

// 导出新的模块
// export * from './agents'; // This was wrong

import { conversationOperations } from './conversations';
import { messageOperations } from './messages';
import { memoryOperations } from './memories';
import { mcpServerOperations } from './mcp-servers';
import { mcpToolOperations } from './mcp-tools';
import { agentOperations } from './agents';
// system-settings 已迁移到 user-settings
import { userOperations } from './users';
import { roleOperations, permissionOperations, userRoleOperations, rolePermissionOperations } from './roles';
import { authTokenOperations } from './auth-tokens';



export const dbOperations = {
  // 对话相关操作
  createConversation: conversationOperations.create,
  getAllConversationsByUserId: conversationOperations.getAllByUserId,
  getConversationByIdAndUserId: conversationOperations.getByIdAndUserId,
  getConversationById: conversationOperations.getById, // 内部使用
  updateConversationTitleByUserAndId: conversationOperations.updateTitleByUserAndId,
  updateConversationTitleInternal: conversationOperations.updateTitleInternal, // 内部使用
  updateConversationModelByUserAndId: conversationOperations.updateConversationModelByUserAndId,
  updateConversationAgentByUserAndId: conversationOperations.updateConversationAgentByUserAndId,
  updateConversationTimestamp: conversationOperations.updateTimestamp,
  deleteConversationByUserAndId: conversationOperations.deleteByUserAndId,
  deleteConversation: conversationOperations.delete, // 内部使用
  getConversationStats: conversationOperations.getStats,

  // 消息相关操作
  createMessage: messageOperations.create,
  getMessagesByConversationIdAndUserId: messageOperations.getByConversationIdAndUserId,
  getMessagesByConversationId: messageOperations.getByConversationId, // 内部使用
  deleteMessagesByConversationId: messageOperations.deleteByConversationId,
  getLastModelByConversationId: messageOperations.getLastModelByConversationId,

  // MCP工具调用相关操作
  getToolCallsByConversationIdAndUserId: messageOperations.getToolCallsByConversationIdAndUserId,
  getToolCallsByConversationId: messageOperations.getToolCallsByConversationId, // 内部使用

  // 向后兼容的函数（已弃用，请使用带用户权限验证的版本）
  getAllConversations: conversationOperations.getAllByUserId, // 需要传入userId
  updateConversationTitle: conversationOperations.updateTitleByUserAndId, // 需要传入userId

  // Agent相关操作
  createAgent: agentOperations.create,
  getAllAgents: agentOperations.getAll,
  getAgentById: agentOperations.getById,
  updateAgent: agentOperations.update,
  deleteAgent: agentOperations.delete,

  // 记忆系统相关操作
  createMemory: memoryOperations.createMemory,
  getMemoriesByConversation: memoryOperations.getMemoriesByConversation,
  getMemoriesByAgent: memoryOperations.getMemoriesByAgent,
  getActiveMemories: memoryOperations.getActiveMemories,
  deleteMemory: memoryOperations.deleteMemory,
  deleteMemoriesByConversation: memoryOperations.deleteMemoriesByConversation,
  cleanupExpiredMemories: memoryOperations.cleanupExpiredMemories,
  createOrUpdateMemorySettings: memoryOperations.createOrUpdateMemorySettings,
  getMemorySettings: memoryOperations.getMemorySettings,
  getMemorySettingsWithDefaults: memoryOperations.getMemorySettingsWithDefaults,
  updateMemorySettings: memoryOperations.updateMemorySettings,
  deleteMemorySettings: memoryOperations.deleteMemorySettings,
  shouldTriggerMemory: memoryOperations.shouldTriggerMemory,

  // 系统设置相关操作已迁移到用户设置 (user-settings)
};

// 兼容原有的 mcpDbOperations 对象
export const mcpDbOperations = {
  // MCP服务器相关操作
  createMcpServer: mcpServerOperations.create,
  getAllMcpServers: mcpServerOperations.getAll,
  getMcpServerById: mcpServerOperations.getById,
  getMcpServerByName: mcpServerOperations.getByName,
  getEnabledMcpServers: mcpServerOperations.getEnabled,
  updateMcpServerStatus: mcpServerOperations.updateStatus,
  deleteMcpServer: mcpServerOperations.delete,

  // MCP工具相关操作
  createMcpTool: mcpToolOperations.create,
  getMcpToolsByServerId: mcpToolOperations.getByServerId,
  getMcpToolById: mcpToolOperations.getById,
  getMcpToolByServerIdAndName: mcpToolOperations.getByServerIdAndName,
  getAvailableMcpTools: mcpToolOperations.getAvailable,
  updateMcpToolUsage: mcpToolOperations.updateUsage,
  updateMcpToolAvailability: mcpToolOperations.updateAvailability,
  updateMcpToolEnabled: mcpToolOperations.updateEnabled,
  deleteMcpToolsByServerId: mcpToolOperations.deleteByServerId,
  deleteMcpTool: mcpToolOperations.delete,

  // 用户管理相关操作
  createUser: userOperations.create,
  getAllUsers: userOperations.getAll,
  getUserById: userOperations.getById,
  getUserByUsername: userOperations.getByUsername,
  getUserByEmail: userOperations.getByEmail,
  authenticateUser: userOperations.authenticate,
  updateUser: userOperations.update,
  updateUserPassword: userOperations.updatePassword,
  deleteUser: userOperations.delete,
  getUserStats: userOperations.getStats,

  // 角色管理相关操作
  createRole: roleOperations.create,
  getAllRoles: roleOperations.getAll,
  getRoleById: roleOperations.getById,
  getRoleByName: roleOperations.getByName,
  updateRole: roleOperations.update,
  deleteRole: roleOperations.delete,

  // 权限管理相关操作
  createPermission: permissionOperations.create,
  getAllPermissions: permissionOperations.getAll,
  getPermissionById: permissionOperations.getById,
  getPermissionsByResource: permissionOperations.getByResource,
  updatePermission: permissionOperations.update,
  deletePermission: permissionOperations.delete,

  // 用户角色关联操作
  assignUserRole: userRoleOperations.assignRole,
  removeUserRole: userRoleOperations.removeRole,
  getUserRoles: userRoleOperations.getUserRoles,
  getRoleUsers: userRoleOperations.getRoleUsers,
  checkUserHasRole: userRoleOperations.hasRole,

  // 角色权限关联操作
  grantRolePermission: rolePermissionOperations.grantPermission,
  revokeRolePermission: rolePermissionOperations.revokePermission,
  getRolePermissions: rolePermissionOperations.getRolePermissions,
  getPermissionRoles: rolePermissionOperations.getPermissionRoles,
  checkRoleHasPermission: rolePermissionOperations.hasPermission,
  getUserPermissions: rolePermissionOperations.getUserPermissions,

  // 认证令牌相关操作
  createAuthToken: authTokenOperations.create,
  verifyAuthToken: authTokenOperations.verify,
  getAuthTokensByUserIdAndType: authTokenOperations.getByUserIdAndType,
  getValidAuthTokensByUserId: authTokenOperations.getValidTokensByUserId,
  markAuthTokenAsUsed: authTokenOperations.markAsUsed,
  revokeAuthToken: authTokenOperations.revoke,
  revokeAuthTokenByToken: authTokenOperations.revokeByToken,
  revokeAllUserAuthTokens: authTokenOperations.revokeAllUserTokens,
  revokeUserAuthTokensByType: authTokenOperations.revokeUserTokensByType,
  cleanupExpiredAuthTokens: authTokenOperations.cleanupExpired,
  getAuthTokenStats: authTokenOperations.getStats,

  // MCP工具调用相关操作已迁移到messages表
};

// 默认导出数据库连接（保持兼容性）
export { db as default } from './connection';