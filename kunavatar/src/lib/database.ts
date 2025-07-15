// 重新导出模块化的数据库操作
// 这个文件现在作为向后兼容的入口点，所有实际的实现都在 ./database/ 目录下
export * from './database/index';

// 重新导出数据库连接作为默认导出（保持向后兼容性）
export { db as default } from './database/connection';