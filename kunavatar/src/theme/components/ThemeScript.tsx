// 主题预加载脚本组件
// 这个组件会在页面加载前立即执行，防止主题闪烁

export function ThemeScript() {
  const initScript = `
    (function() {
      try {
        // 1. 主题处理 - 优先从 localStorage 获取主题
        const savedTheme = localStorage.getItem('theme');
        
        // 如果没有保存的主题，则根据系统偏好设置
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        
        // 决定最终主题
        const theme = savedTheme || systemTheme;
        
        // 立即在 <html> 元素上应用主题类
        document.documentElement.classList.add(theme);

        // 如果没有保存过主题，则将当前主题存入 localStorage
        if (!savedTheme) {
          localStorage.setItem('theme', theme);
        }

        // 2. 侧边栏状态处理 - 立即设置状态避免闪烁
        const sidebarExpanded = localStorage.getItem('sidebar-expanded');
        const isExpanded = sidebarExpanded !== null ? JSON.parse(sidebarExpanded) : true;
        
        // 立即设置侧边栏状态，避免任何延迟
        document.documentElement.setAttribute('data-sidebar-state', isExpanded ? 'expanded' : 'collapsed');
        
      } catch (e) {
        // 如果出现错误，默认使用浅色主题和展开的侧边栏
        document.documentElement.classList.add('light');
        document.documentElement.setAttribute('data-sidebar-state', 'expanded');
      }
    })();
  `;

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: initScript,
      }}
    />
  );
}
