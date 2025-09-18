/**
 * URL 安全验证工具函数
 * 用于防止开放重定向攻击和 XSS 攻击
 */

/**
 * 允许的重定向路径列表
 * 只允许应用内部的安全路径
 */
const ALLOWED_REDIRECT_PATHS = [
  '/chat',
  '/settings',
  '/profile',
  '/dashboard',
  '/admin',
  '/login',
  '/register'
];

/**
 * 验证重定向 URL 是否安全
 * @param redirectUrl - 要验证的重定向 URL
 * @param defaultPath - 默认的安全路径
 * @returns 安全的重定向路径
 */
export function validateRedirectUrl(redirectUrl: string | null, defaultPath: string = '/chat'): string {
  // 如果没有提供重定向 URL，返回默认路径
  if (!redirectUrl) {
    return defaultPath;
  }

  try {
    // 清理输入，移除潜在的危险字符
    const cleanUrl = redirectUrl.trim();
    
    // 检查是否为空字符串
    if (!cleanUrl) {
      return defaultPath;
    }

    // 防止 JavaScript 协议和其他危险协议
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'ftp:'];
    const lowerUrl = cleanUrl.toLowerCase();
    
    for (const protocol of dangerousProtocols) {
      if (lowerUrl.startsWith(protocol)) {
        console.warn(`检测到危险协议: ${protocol}，使用默认路径`);
        return defaultPath;
      }
    }

    // 如果是完整的 URL（包含协议），检查是否为同源
    if (cleanUrl.includes('://')) {
      try {
        const url = new URL(cleanUrl);
        
        // 只允许相对路径或同源 URL
        if (typeof window !== 'undefined') {
          const currentOrigin = window.location.origin;
          if (url.origin !== currentOrigin) {
            console.warn(`检测到跨域重定向尝试: ${url.origin}，使用默认路径`);
            return defaultPath;
          }
        }
        
        // 提取路径部分进行进一步验证
        return validatePath(url.pathname, defaultPath);
      } catch (error) {
        console.warn('无效的 URL 格式，使用默认路径:', error);
        return defaultPath;
      }
    }

    // 处理相对路径
    return validatePath(cleanUrl, defaultPath);
  } catch (error) {
    console.warn('URL 验证过程中发生错误，使用默认路径:', error);
    return defaultPath;
  }
}

/**
 * 验证路径是否在允许列表中
 * @param path - 要验证的路径
 * @param defaultPath - 默认路径
 * @returns 安全的路径
 */
function validatePath(path: string, defaultPath: string): string {
  // 确保路径以 / 开头
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // 移除查询参数和片段标识符进行路径验证
  const pathOnly = normalizedPath.split('?')[0].split('#')[0];
  
  // 检查路径是否在允许列表中
  const isAllowed = ALLOWED_REDIRECT_PATHS.some(allowedPath => {
    // 精确匹配或子路径匹配
    return pathOnly === allowedPath || pathOnly.startsWith(allowedPath + '/');
  });
  
  if (isAllowed) {
    return normalizedPath;
  }
  
  console.warn(`路径不在允许列表中: ${pathOnly}，使用默认路径`);
  return defaultPath;
}

/**
 * 清理和编码用户输入，防止 XSS 攻击
 * @param input - 用户输入
 * @returns 清理后的安全字符串
 */
export function sanitizeUserInput(input: string): string {
  if (!input) return '';
  
  return input
    .trim()
    // 移除潜在的 HTML 标签
    .replace(/<[^>]*>/g, '')
    // 编码特殊字符
    .replace(/[<>"'&]/g, (char) => {
      const entities: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return entities[char] || char;
    });
}

/**
 * 验证 URL 参数是否安全
 * @param params - URLSearchParams 对象
 * @param allowedParams - 允许的参数名列表
 * @returns 清理后的安全参数对象
 */
export function validateUrlParams(
  params: URLSearchParams, 
  allowedParams: string[] = ['redirect', 'tab', 'page']
): Record<string, string> {
  const safeParams: Record<string, string> = {};
  
  for (const [key, value] of params.entries()) {
    if (allowedParams.includes(key)) {
      safeParams[key] = sanitizeUserInput(value);
    }
  }
  
  return safeParams;
}

/**
 * 安全的页面导航函数
 * 用于替换直接的 window.location.href 调用，防止 XSS 攻击
 * @param targetPath - 目标路径
 * @param delay - 延迟时间（毫秒）
 * @param electronAPI - Electron API 对象（可选）
 */
export function safeNavigate(
  targetPath: string, 
  delay: number = 0,
  electronAPI?: any
): void {
  // 验证目标路径的安全性
  const safePath = validateRedirectUrl(targetPath, '/login');
  
  const performNavigation = async () => {
    // 检查是否在 Electron 环境中
    const isElectron = typeof window !== 'undefined' && electronAPI;
    
    if (isElectron && electronAPI) {
      try {
        // 根据目标路径选择合适的 Electron 方法
        let result;
        if (safePath === '/login') {
          result = await electronAPI.reloadToLogin();
        } else {
          // 对于其他路径，可以扩展更多的 Electron 方法
          result = { success: false, error: '不支持的 Electron 导航路径' };
        }
        
        if (!result.success) {
          console.warn('Electron 导航失败:', result.error);
          // 回退到普通导航
          window.location.href = safePath;
        }
      } catch (error) {
        console.error('Electron 导航出错:', error);
        // 回退到普通导航
        window.location.href = safePath;
      }
    } else {
      // 浏览器环境：使用验证过的安全路径
      window.location.href = safePath;
    }
  };
  
  if (delay > 0) {
    setTimeout(performNavigation, delay);
  } else {
    performNavigation();
  }
}

/**
 * 安全的登录页面导航函数
 * 专门用于导航到登录页面的便捷函数
 * @param delay - 延迟时间（毫秒）
 * @param electronAPI - Electron API 对象（可选）
 */
export function safeNavigateToLogin(
  delay: number = 500,
  electronAPI?: any
): void {
  safeNavigate('/login', delay, electronAPI);
}