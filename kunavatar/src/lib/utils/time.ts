/**
 * 时间格式化工具函数
 */

/**
 * 格式化数据库时间（SQLite DATETIME 格式）为本地时间
 * SQLite DATETIME 格式: "2025-07-31 04:35:38" (UTC时间)
 */
export function formatDatabaseTime(dateString: string): string {
  if (!dateString) return '未知';
  
  // SQLite DATETIME 是 UTC 时间，需要添加 Z 表示 UTC
  const date = new Date(dateString + 'Z');
  
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * 格式化 ISO 时间字符串为本地时间
 * ISO 格式: "2025-07-31T04:35:38.703Z"
 */
export function formatISOTime(dateString: string): string {
  if (!dateString) return '未知';
  
  const date = new Date(dateString);
  
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * 格式化任意时间字符串为本地时间
 * 自动检测时间格式并进行相应处理
 */
export function formatTime(dateString: string): string {
  if (!dateString) return '未知';
  
  // 检测是否为 ISO 格式（包含 T 或 Z）
  if (dateString.includes('T') || dateString.includes('Z')) {
    return formatISOTime(dateString);
  }
  
  // 否则按数据库时间格式处理
  return formatDatabaseTime(dateString);
}

/**
 * 格式化相对时间（如：2小时前、3天前）
 */
export function formatRelativeTime(dateString: string): string {
  if (!dateString) return '未知';
  
  const date = dateString.includes('T') || dateString.includes('Z') 
    ? new Date(dateString)
    : new Date(dateString + 'Z');
    
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 60) {
    return '刚刚';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`;
  } else if (diffHours < 24) {
    return `${diffHours}小时前`;
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else {
    // 超过一周显示具体日期
    return formatTime(dateString);
  }
}

/**
 * 格式化日期（不包含时间）
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '未知';
  
  const date = dateString.includes('T') || dateString.includes('Z') 
    ? new Date(dateString)
    : new Date(dateString + 'Z');
  
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * 格式化时间（不包含日期）
 */
export function formatTimeOnly(dateString: string): string {
  if (!dateString) return '未知';
  
  const date = dateString.includes('T') || dateString.includes('Z') 
    ? new Date(dateString)
    : new Date(dateString + 'Z');
  
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}