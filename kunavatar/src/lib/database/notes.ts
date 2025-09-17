import { z } from 'zod';
import db from './connection';
import type { Database } from 'better-sqlite3';

// 笔记数据验证模式
export const NoteSchema = z.object({
  id: z.number(),
  title: z.string(),
  content: z.string(),
  user_id: z.string(),
  is_public: z.boolean(),
  tags: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  author_name: z.string().optional()
});

export const CreateNoteSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  content: z.string(),
  is_public: z.boolean().default(false),
  tags: z.array(z.string()).optional()
});

export const UpdateNoteSchema = z.object({
  title: z.string().min(1, '标题不能为空').optional(),
  content: z.string().optional(),
  is_public: z.boolean().optional(),
  tags: z.array(z.string()).optional()
});

// 笔记分享验证模式
export const NoteShareSchema = z.object({
  id: z.number(),
  note_id: z.number(),
  shared_with_user_id: z.string().nullable(),
  shared_with_role_id: z.string().nullable(),
  permission: z.enum(['read', 'write']),
  created_at: z.string()
});

export const CreateNoteShareSchema = z.object({
  note_id: z.number(),
  shared_with_user_id: z.string().optional(),
  shared_with_role_id: z.string().optional(),
  permission: z.enum(['read', 'write']).default('read')
}).refine(data => data.shared_with_user_id || data.shared_with_role_id, {
  message: '必须指定分享给用户或角色'
});

export type Note = z.infer<typeof NoteSchema>;
export type CreateNote = z.infer<typeof CreateNoteSchema>;
export type UpdateNote = z.infer<typeof UpdateNoteSchema>;
export type NoteShare = z.infer<typeof NoteShareSchema>;
export type CreateNoteShare = z.infer<typeof CreateNoteShareSchema>;

// 笔记数据库操作
class NoteOperations {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
  }

  // 创建笔记
  createNote(userId: string, noteData: CreateNote): Note {
    const tagsJson = noteData.tags && noteData.tags.length > 0 ? JSON.stringify(noteData.tags) : null;
    
    const stmt = this.db.prepare(`
      INSERT INTO notes (title, content, user_id, is_public, tags)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      noteData.title,
      noteData.content,
      userId,
      noteData.is_public ? 1 : 0,
      tagsJson
    );
    
    return this.getNoteById(result.lastInsertRowid as number)!;
  }

  // 根据ID获取笔记
  getNoteById(noteId: number): Note | null {
    const stmt = this.db.prepare(`
      SELECT n.*, u.username as author_name FROM notes n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE n.id = ?
    `);
    const note = stmt.get(noteId) as any;
    
    if (!note) return null;
    
    return {
      ...note,
      is_public: Boolean(note.is_public)
    };
  }

  // 获取用户的笔记列表
  getUserNotes(userId: string, options: {
    page?: number;
    limit?: number;
    search?: string;
    tags?: string[];
  } = {}): { notes: Note[]; total: number } {
    const { page = 1, limit = 20, search, tags } = options;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE user_id = ?';
    const params: any[] = [userId];
    
    if (search) {
      whereClause += ' AND (title LIKE ? OR content LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (tags && tags.length > 0) {
      const tagConditions = tags.map(() => 'tags LIKE ?').join(' AND ');
      whereClause += ` AND (${tagConditions})`;
      tags.forEach(tag => params.push(`%"${tag}"%`));
    }
    
    // 获取总数
    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM notes ${whereClause}`);
    const { count } = countStmt.get(...params) as { count: number };
    
    // 获取笔记列表
    const stmt = this.db.prepare(`
      SELECT n.*, u.username as author_name FROM notes n
      LEFT JOIN users u ON n.user_id = u.id
      ${whereClause}
      ORDER BY n.updated_at DESC
      LIMIT ? OFFSET ?
    `);
    
    const notes = stmt.all(...params, limit, offset) as any[];
    
    return {
      notes: notes.map(note => ({
        ...note,
        is_public: Boolean(note.is_public)
      })),
      total: count
    };
  }

  // 获取公开笔记列表
  getPublicNotes(options: {
    page?: number;
    limit?: number;
    search?: string;
    tags?: string[];
  } = {}): { notes: Note[]; total: number } {
    const { page = 1, limit = 20, search, tags } = options;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE is_public = 1';
    const params: any[] = [];
    
    if (search) {
      whereClause += ' AND (title LIKE ? OR content LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (tags && tags.length > 0) {
      const tagConditions = tags.map(() => 'tags LIKE ?').join(' AND ');
      whereClause += ` AND (${tagConditions})`;
      tags.forEach(tag => params.push(`%"${tag}"%`));
    }
    
    // 获取总数
    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM notes ${whereClause}`);
    const { count } = countStmt.get(...params) as { count: number };
    
    // 获取笔记列表
    const stmt = this.db.prepare(`
      SELECT n.*, u.username as author_name FROM notes n
      LEFT JOIN users u ON n.user_id = u.id
      ${whereClause}
      ORDER BY n.updated_at DESC
      LIMIT ? OFFSET ?
    `);
    
    const notes = stmt.all(...params, limit, offset) as any[];
    
    return {
      notes: notes.map(note => ({
        ...note,
        is_public: Boolean(note.is_public)
      })),
      total: count
    };
  }

  // 更新笔记
  updateNote(noteId: number, userId: string, updateData: UpdateNote): Note | null {
    const note = this.getNoteById(noteId);
    if (!note || note.user_id !== userId) {
      return null;
    }
    
    const updates: string[] = [];
    const params: any[] = [];
    
    if (updateData.title !== undefined) {
      updates.push('title = ?');
      params.push(updateData.title);
    }
    
    if (updateData.content !== undefined) {
      updates.push('content = ?');
      params.push(updateData.content);
    }
    
    if (updateData.is_public !== undefined) {
      updates.push('is_public = ?');
      params.push(updateData.is_public ? 1 : 0);
    }
    
    if (updateData.tags !== undefined) {
      updates.push('tags = ?');
      params.push(updateData.tags && updateData.tags.length > 0 ? JSON.stringify(updateData.tags) : null);
    }
    
    if (updates.length === 0) {
      return note;
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(noteId);
    
    const stmt = this.db.prepare(`
      UPDATE notes SET ${updates.join(', ')}
      WHERE id = ?
    `);
    
    stmt.run(...params);
    
    return this.getNoteById(noteId);
  }

  // 删除笔记
  deleteNote(noteId: number, userId: string): boolean {
    const note = this.getNoteById(noteId);
    if (!note || note.user_id !== userId) {
      return false;
    }
    
    const stmt = this.db.prepare('DELETE FROM notes WHERE id = ?');
    const result = stmt.run(noteId);
    
    return result.changes > 0;
  }

  // 检查用户是否有笔记访问权限
  checkNoteAccess(noteId: number, userId: string, permission: 'read' | 'write' = 'read'): boolean {
    const note = this.getNoteById(noteId);
    if (!note) return false;
    
    // 笔记所有者拥有所有权限
    if (note.user_id === userId) return true;
    
    // 公开笔记允许读取
    if (note.is_public && permission === 'read') return true;
    
    // 检查分享权限
    const shareStmt = this.db.prepare(`
      SELECT ns.permission FROM note_shares ns
      LEFT JOIN user_roles ur ON ns.shared_with_role_id = ur.role_id
      WHERE ns.note_id = ? AND (
        ns.shared_with_user_id = ? OR
        ur.user_id = ?
      )
    `);
    
    const shares = shareStmt.all(noteId, userId, userId) as { permission: string }[];
    
    return shares.some(share => {
      if (permission === 'read') return true;
      return share.permission === 'write';
    });
  }

  // 分享笔记
  shareNote(noteId: number, ownerId: string, shareData: CreateNoteShare): NoteShare | null {
    const note = this.getNoteById(noteId);
    if (!note || note.user_id !== ownerId) {
      return null;
    }
    
    const stmt = this.db.prepare(`
      INSERT INTO note_shares (note_id, shared_with_user_id, shared_with_role_id, permission)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      shareData.note_id,
      shareData.shared_with_user_id || null,
      shareData.shared_with_role_id || null,
      shareData.permission
    );
    
    const shareStmt = this.db.prepare('SELECT * FROM note_shares WHERE id = ?');
    return shareStmt.get(result.lastInsertRowid as number) as NoteShare;
  }

  // 取消分享
  unshareNote(shareId: number, ownerId: string): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM note_shares 
      WHERE id = ? AND note_id IN (
        SELECT id FROM notes WHERE user_id = ?
      )
    `);
    
    const result = stmt.run(shareId, ownerId);
    return result.changes > 0;
  }
}

// 导出笔记操作实例
// 使用延迟初始化来确保数据库连接正常
let noteOperationsInstance: NoteOperations | null = null;

const getNoteOperations = (): NoteOperations => {
  if (!noteOperationsInstance) {
    noteOperationsInstance = new NoteOperations(db);
  }
  return noteOperationsInstance;
};

export { getNoteOperations };
export const noteOperations = getNoteOperations();
export default noteOperations;