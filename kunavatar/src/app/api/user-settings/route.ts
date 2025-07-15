import { NextRequest, NextResponse } from 'next/server';
import { userSettingOperations } from '@/lib/database';
import { AuthService } from '@/lib/auth';

// 获取用户设置
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未提供有效的认证令牌' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const verification = await AuthService.verifyAccessToken(token);
    
    if (!verification.valid || !verification.payload) {
      return NextResponse.json(
        { error: '认证令牌无效' },
        { status: 401 }
      );
    }

    const userId = verification.payload.sub;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let settings;
    if (category) {
      settings = userSettingOperations.getByUserAndCategory(userId, category);
    } else {
      settings = userSettingOperations.getByUser(userId);
    }

    // 如果请求的是appearance设置，返回格式化的数据
    if (category === 'appearance') {
      const appearanceSettings = userSettingOperations.getAppearanceSettings(userId);
      return NextResponse.json({
        success: true,
        settings: appearanceSettings
      });
    }

    // 为了兼容原有的 system-settings API 格式，直接返回设置数组
    if (category === 'prompt_optimize' || category === 'title_summary' || category === 'memory') {
      return NextResponse.json(settings);
    }

    return NextResponse.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('获取用户设置失败:', error);
    return NextResponse.json(
      { error: '获取用户设置失败' },
      { status: 500 }
    );
  }
}

// 更新用户设置
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未提供有效的认证令牌' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const verification = await AuthService.verifyAccessToken(token);
    
    if (!verification.valid || !verification.payload) {
      return NextResponse.json(
        { error: '认证令牌无效' },
        { status: 401 }
      );
    }

    const userId = verification.payload.sub;
    const body = await request.json();

    // 支持单个设置更新
    if (body.key && body.value !== undefined) {
      const success = userSettingOperations.setValue(
        userId,
        body.key,
        body.value,
        body.category || 'general'
      );

      if (success) {
        return NextResponse.json({
          success: true,
          message: '设置更新成功'
        });
      } else {
        return NextResponse.json(
          { error: '设置更新失败' },
          { status: 500 }
        );
      }
    }

    // 支持批量设置更新
    if (body.settings && Array.isArray(body.settings)) {
      const success = userSettingOperations.setMultipleValues(userId, body.settings);

      if (success) {
        return NextResponse.json({
          success: true,
          message: '设置批量更新成功'
        });
      } else {
        return NextResponse.json(
          { error: '设置批量更新失败' },
          { status: 500 }
        );
      }
    }

    // 支持界面设置更新
    if (body.appearance) {
      const success = userSettingOperations.setAppearanceSettings(userId, body.appearance);

      if (success) {
        return NextResponse.json({
          success: true,
          message: '界面设置更新成功'
        });
      } else {
        return NextResponse.json(
          { error: '界面设置更新失败' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: '无效的请求参数' },
      { status: 400 }
    );
  } catch (error) {
    console.error('更新用户设置失败:', error);
    return NextResponse.json(
      { error: '更新用户设置失败' },
      { status: 500 }
    );
  }
}

// 删除用户设置
export async function DELETE(request: NextRequest) {
  try {
    // 验证用户身份
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未提供有效的认证令牌' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const verification = await AuthService.verifyAccessToken(token);
    
    if (!verification.valid || !verification.payload) {
      return NextResponse.json(
        { error: '认证令牌无效' },
        { status: 401 }
      );
    }

    const userId = verification.payload.sub;
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { error: '缺少设置键名' },
        { status: 400 }
      );
    }

    const success = userSettingOperations.delete(userId, key);

    if (success) {
      return NextResponse.json({
        success: true,
        message: '设置删除成功'
      });
    } else {
      return NextResponse.json(
        { error: '设置删除失败' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('删除用户设置失败:', error);
    return NextResponse.json(
      { error: '删除用户设置失败' },
      { status: 500 }
    );
  }
}