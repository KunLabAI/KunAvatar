// 主题类型定义
export type Theme = 'light' | 'dark';

// 主题配置接口
export interface ThemeConfig {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

// 获取系统主题偏好
export const getSystemTheme = (): Theme => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

// 从localStorage获取保存的主题
export const getSavedTheme = (): Theme | null => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  }
  return null;
};

// 保存主题到localStorage
export const saveTheme = (theme: Theme): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('theme', theme);
  }
};

// 应用主题到DOM（带过渡效果）
export const applyTheme = (theme: Theme): void => {
  if (typeof window !== 'undefined') {
    const root = document.documentElement;

    // 添加过渡类以实现平滑切换
    root.classList.add('theme-changing');

    // 移除旧的主题类，添加新的主题类
    root.classList.remove('light', 'dark');
    root.classList.add(theme);

    // 在过渡动画结束后移除过渡类
    setTimeout(() => {
      root.classList.remove('theme-changing');
    }, 300); // 这里的时长应与CSS中的过渡时长一致
  }
};

// 初始化主题
export const initializeTheme = (): Theme => {
  const savedTheme = getSavedTheme();
  const theme = savedTheme || getSystemTheme();
  
  // 首次加载时直接应用主题，不带过渡
  if (typeof window !== 'undefined') {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }
  
  return theme;
};
