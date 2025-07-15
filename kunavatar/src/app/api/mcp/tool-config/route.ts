import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';

// 🔧 修复：使用统一的数据库连接，避免重复初始化
// mcp_tool_configs表已经在主数据库初始化中创建，这里不需要重复创建

/**
 * POST /api/mcp/tool-config - 保存工具配置
 */
export async function POST(request: NextRequest) {
  try {
    const { toolId, serverName, toolName, config } = await request.json();
    
    if (!serverName || !toolName) {
      return NextResponse.json(
        { error: '服务器名称和工具名称不能为空' },
        { status: 400 }
      );
    }
    
    // 🔧 修复：使用统一的数据库连接，不需要每次创建新连接
    try {
      // 检查是否已存在配置
      const existingConfig = db.prepare(
        'SELECT id FROM mcp_tool_configs WHERE server_name = ? AND tool_name = ?'
      ).get(serverName, toolName);
      
      if (existingConfig) {
        // 更新现有配置
        db.prepare(`
          UPDATE mcp_tool_configs 
          SET config = ?, updated_at = CURRENT_TIMESTAMP
          WHERE server_name = ? AND tool_name = ?
        `).run(JSON.stringify(config), serverName, toolName);
      } else {
        // 插入新配置
        db.prepare(`
          INSERT INTO mcp_tool_configs (tool_id, server_name, tool_name, config)
          VALUES (?, ?, ?, ?)
        `).run(toolId || null, serverName, toolName, JSON.stringify(config));
      }
      
      return NextResponse.json({ success: true, message: '配置保存成功' });
    } catch (dbError) {
      console.error('数据库操作失败:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('保存工具配置失败:', error);
    return NextResponse.json(
      { error: '保存配置失败' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mcp/tool-config?serverName=xxx&toolName=xxx - 获取工具配置
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serverName = searchParams.get('serverName');
    const toolName = searchParams.get('toolName');
    
    if (!serverName || !toolName) {
      return NextResponse.json(
        { error: '服务器名称和工具名称不能为空' },
        { status: 400 }
      );
    }
    
    // 🔧 修复：使用统一的数据库连接
    try {
      const configRow = db.prepare(
        'SELECT config FROM mcp_tool_configs WHERE server_name = ? AND tool_name = ?'
      ).get(serverName, toolName) as { config: string } | undefined;
      
      if (configRow) {
        return NextResponse.json({
          success: true,
          config: JSON.parse(configRow.config)
        });
      } else {
        return NextResponse.json({
          success: true,
          config: {}
        });
      }
    } catch (dbError) {
      console.error('数据库查询失败:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('获取工具配置失败:', error);
    return NextResponse.json(
      { error: '获取配置失败' },
      { status: 500 }
    );
  }
}