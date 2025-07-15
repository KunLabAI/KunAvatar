import { NextRequest, NextResponse } from 'next/server';
import { agentOperations } from '../../../../../lib/database/agents';
import { MemoryService } from '../../../chat/services/memoryService';

/**
 * 获取Agent记忆分析报告（简化版）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agentId = parseInt(id);

    if (isNaN(agentId)) {
      return NextResponse.json(
        { error: '无效的Agent ID' },
        { status: 400 }
      );
    }

    // 检查Agent是否存在
    const agent = agentOperations.getById(agentId);
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent不存在' },
        { status: 404 }
      );
    }

    // 简化的记忆分析报告
    const analysis = {
      totalMemories: 0,
      byImportance: { high: 0, medium: 0, low: 0 },
      byAge: { recent: 0, old: 0, expired: 0 },
      recommendedAction: '简化版本不支持详细分析',
      potentialSavings: 0
    };

    return NextResponse.json({
      success: true,
      data: {
        agentId,
        agentName: agent.name,
        analysis,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('获取Agent记忆分析失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 简化的记忆优化（基本功能）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agentId = parseInt(id);

    if (isNaN(agentId)) {
      return NextResponse.json(
        { error: '无效的Agent ID' },
        { status: 400 }
      );
    }

    // 检查Agent是否存在
    const agent = agentOperations.getById(agentId);
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent不存在' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { strategy = 'balanced', preview = false } = body;

    if (preview) {
      // 预览模式：返回简化的分析
      return NextResponse.json({
        success: true,
        preview: true,
        data: {
          agentId,
          agentName: agent.name,
          strategy,
          currentAnalysis: {
            totalMemories: 0,
            byImportance: { high: 0, medium: 0, low: 0 },
            byAge: { recent: 0, old: 0, expired: 0 },
            recommendedAction: '简化版本不支持详细分析',
            potentialSavings: 0
          },
          estimatedOptimization: {
            potentialDeletions: 0,
            potentialSavings: 0,
            recommendation: '简化版本暂不支持记忆优化'
          }
        }
      });
    }

    // 简化的优化结果
    console.log(`🧠 简化记忆优化：Agent ${agentId} (${agent.name})`);
    
    const optimizationResult = {
      deleted: 0,
      merged: 0,
      optimized: 0,
      totalSaved: 0
    };

    return NextResponse.json({
      success: true,
      data: {
        agentId,
        agentName: agent.name,
        strategy,
        optimization: optimizationResult,
        postAnalysis: {
          totalMemories: 0,
          byImportance: { high: 0, medium: 0, low: 0 },
          byAge: { recent: 0, old: 0, expired: 0 },
          recommendedAction: '简化版本不支持详细分析',
          potentialSavings: 0
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Agent记忆优化失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 批量优化（简化版）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (id === 'all') {
      // 批量优化暂不支持
      return NextResponse.json({
        success: true,
        message: '简化版本暂不支持批量优化',
        data: {
          strategy: 'simplified',
          agentsProcessed: 0,
          totalOptimized: 0,
          totalSaved: 0,
          results: [],
          timestamp: new Date().toISOString()
        }
      });
    }
    
    return NextResponse.json(
      { error: '无效的批量操作ID' },
      { status: 400 }
    );

  } catch (error) {
    console.error('批量记忆优化失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
} 