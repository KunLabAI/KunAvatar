import { db } from './connection';

export interface UserSetting {
  id: number;
  user_id: string;
  key: string;
  value: string | null;
  category: string;
  created_at: string;
  updated_at: string;
}

export type CreateUserSettingData = Omit<UserSetting, 'id' | 'created_at' | 'updated_at'>;
export type UpdateUserSettingData = Partial<Omit<UserSetting, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

// 用户设置相关查询语句
export const userSettingQueries = {
  // 根据用户ID和key获取设置
  getByUserAndKey: db.prepare(`
    SELECT * FROM user_settings
    WHERE user_id = ? AND key = ?
  `),

  // 根据用户ID和分类获取设置
  getByUserAndCategory: db.prepare(`
    SELECT * FROM user_settings
    WHERE user_id = ? AND category = ?
    ORDER BY key
  `),

  // 获取用户的所有设置
  getByUser: db.prepare(`
    SELECT * FROM user_settings
    WHERE user_id = ?
    ORDER BY category, key
  `),

  // 创建新设置
  create: db.prepare(`
    INSERT INTO user_settings (user_id, key, value, category)
    VALUES (?, ?, ?, ?)
  `),

  // 更新设置值
  updateValue: db.prepare(`
    UPDATE user_settings
    SET value = ?, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND key = ?
  `),

  // 更新设置（完整更新）
  update: db.prepare(`
    UPDATE user_settings
    SET value = ?, category = ?, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND key = ?
  `),

  // 删除设置
  delete: db.prepare(`
    DELETE FROM user_settings
    WHERE user_id = ? AND key = ?
  `),

  // 检查设置是否存在
  exists: db.prepare(`
    SELECT COUNT(*) as count FROM user_settings
    WHERE user_id = ? AND key = ?
  `)
};

// 用户设置操作类
export class UserSettingOperations {
  /**
   * 根据用户ID和key获取设置
   */
  static getByUserAndKey(userId: string, key: string): UserSetting | null {
    try {
      const result = userSettingQueries.getByUserAndKey.get(userId, key) as UserSetting | undefined;
      return result || null;
    } catch (error) {
      console.error('获取用户设置失败:', error);
      return null;
    }
  }

  /**
   * 根据用户ID和分类获取设置
   */
  static getByUserAndCategory(userId: string, category: string): UserSetting[] {
    try {
      return userSettingQueries.getByUserAndCategory.all(userId, category) as UserSetting[];
    } catch (error) {
      console.error('获取用户分类设置失败:', error);
      return [];
    }
  }

  /**
   * 获取用户的所有设置
   */
  static getByUser(userId: string): UserSetting[] {
    try {
      return userSettingQueries.getByUser.all(userId) as UserSetting[];
    } catch (error) {
      console.error('获取用户所有设置失败:', error);
      return [];
    }
  }

  /**
   * 创建新设置
   */
  static create(data: CreateUserSettingData): UserSetting | null {
    try {
      const result = userSettingQueries.create.run(
        data.user_id,
        data.key,
        data.value,
        data.category
      );
      
      if (result.changes > 0) {
        return this.getByUserAndKey(data.user_id, data.key);
      }
      return null;
    } catch (error) {
      console.error('创建用户设置失败:', error);
      return null;
    }
  }

  /**
   * 更新设置值（仅更新value字段）
   */
  static updateValue(userId: string, key: string, value: string): boolean {
    try {
      const result = userSettingQueries.updateValue.run(value, userId, key);
      return result.changes > 0;
    } catch (error) {
      console.error('更新用户设置值失败:', error);
      return false;
    }
  }

  /**
   * 更新设置（完整更新）
   */
  static update(userId: string, key: string, data: UpdateUserSettingData): boolean {
    try {
      const current = this.getByUserAndKey(userId, key);
      if (!current) {
        return false;
      }

      const result = userSettingQueries.update.run(
        data.value ?? current.value,
        data.category ?? current.category,
        userId,
        key
      );
      return result.changes > 0;
    } catch (error) {
      console.error('更新用户设置失败:', error);
      return false;
    }
  }

  /**
   * 删除设置
   */
  static delete(userId: string, key: string): boolean {
    try {
      const result = userSettingQueries.delete.run(userId, key);
      return result.changes > 0;
    } catch (error) {
      console.error('删除用户设置失败:', error);
      return false;
    }
  }

  /**
   * 检查设置是否存在
   */
  static exists(userId: string, key: string): boolean {
    try {
      const result = userSettingQueries.exists.get(userId, key) as { count: number };
      return result.count > 0;
    } catch (error) {
      console.error('检查用户设置存在性失败:', error);
      return false;
    }
  }

  /**
   * 获取设置值（便捷方法）
   */
  static getValue(userId: string, key: string, defaultValue: string = ''): string {
    const setting = this.getByUserAndKey(userId, key);
    return setting?.value || defaultValue;
  }

  /**
   * 设置值（便捷方法）
   */
  static setValue(userId: string, key: string, value: string, category: string = 'appearance'): boolean {
    if (this.exists(userId, key)) {
      return this.updateValue(userId, key, value);
    } else {
      const created = this.create({
        user_id: userId,
        key,
        value,
        category
      });
      return created !== null;
    }
  }

  /**
   * 创建或更新设置（如果存在则更新，不存在则创建）
   */
  static createOrUpdate(data: CreateUserSettingData): UserSetting | null {
    try {
      if (this.exists(data.user_id, data.key)) {
        const updated = this.updateValue(data.user_id, data.key, data.value || '');
        if (updated) {
          return this.getByUserAndKey(data.user_id, data.key);
        }
        return null;
      } else {
        return this.create(data);
      }
    } catch (error) {
      console.error('创建或更新用户设置失败:', error);
      return null;
    }
  }

  /**
   * 批量设置多个值
   */
  static setMultipleValues(userId: string, settings: Array<{key: string, value: string, category?: string}>): boolean {
    try {
      const transaction = db.transaction(() => {
        for (const setting of settings) {
          this.setValue(userId, setting.key, setting.value, setting.category || 'appearance');
        }
      });
      transaction();
      return true;
    } catch (error) {
      console.error('批量设置用户设置失败:', error);
      return false;
    }
  }

  /**
   * 获取界面设置（便捷方法）
   */
  static getAppearanceSettings(userId: string) {
    const settings = this.getByUserAndCategory(userId, 'appearance');
    const result: Record<string, string> = {};
    
    settings.forEach(setting => {
      if (setting.value) {
        result[setting.key] = setting.value;
      }
    });
    
    return {
      themePreference: result['theme-preference'] || 'system',
      colorTheme: result['color-theme'] || 'kun',
      chatStyle: result['chat-style'] || 'assistant',
      displaySize: result['display-size'] || 'fullscreen'
    };
  }

  /**
   * 设置界面设置（便捷方法）
   */
  static setAppearanceSettings(userId: string, settings: {
    themePreference?: string;
    colorTheme?: string;
    chatStyle?: string;
    displaySize?: string;
  }): boolean {
    const settingsArray = [];
    
    if (settings.themePreference) {
      settingsArray.push({ key: 'theme-preference', value: settings.themePreference });
    }
    if (settings.colorTheme) {
      settingsArray.push({ key: 'color-theme', value: settings.colorTheme });
    }
    if (settings.chatStyle) {
      settingsArray.push({ key: 'chat-style', value: settings.chatStyle });
    }
    if (settings.displaySize) {
      settingsArray.push({ key: 'display-size', value: settings.displaySize });
    }
    
    return this.setMultipleValues(userId, settingsArray);
  }
}

// 导出便捷的操作函数
export const userSettingOperations = UserSettingOperations;