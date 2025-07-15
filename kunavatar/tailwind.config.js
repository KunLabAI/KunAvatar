/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // 启用类名模式的深色主题
  theme: {
    extend: {
      colors: {
        // 传统变量（兼容现有代码）
        background: 'var(--background)',
        foreground: 'var(--foreground)',

        // 新的主题变量系统
        'theme-background': 'var(--color-background)',
        'theme-background-secondary': 'var(--color-background-secondary)',
        'theme-background-tertiary': 'var(--color-background-tertiary)',

        'theme-foreground': 'var(--color-foreground)',
        'theme-foreground-secondary': 'var(--color-foreground-secondary)',
        'theme-foreground-muted': 'var(--color-foreground-muted)',

        'theme-border': 'var(--color-border)',
        'theme-border-secondary': 'var(--color-border-secondary)',

        'theme-card': 'var(--color-card)',
        'theme-card-hover': 'var(--color-card-hover)',

        'theme-input': 'var(--color-input)',
        'theme-input-border': 'var(--color-input-border)',
        'theme-input-focus': 'var(--color-input-focus)',

        'theme-primary': 'var(--color-primary)',
        'theme-primary-hover': 'var(--color-primary-hover)',
        'theme-primary-foreground': '#ffffff',
        'theme-secondary': 'var(--color-secondary)',
        'theme-secondary-hover': 'var(--color-secondary-hover)',

        'theme-success': 'var(--color-success)',
        'theme-warning': 'var(--color-warning)',
        'theme-error': 'var(--color-error)',
        'theme-info': 'var(--color-info)',

        'theme-accent': 'var(--color-accent)',
        'theme-accent-hover': 'var(--color-accent-hover)',
      },
      fontSize: {
        // 自定义字体大小系统
        'xs': 'var(--font-size-xs)',
        'sm': 'var(--font-size-sm)',
        'base': 'var(--font-size-base)',
        'lg': 'var(--font-size-lg)',
        'xl': 'var(--font-size-xl)',
        '2xl': 'var(--font-size-2xl)',
        '3xl': 'var(--font-size-3xl)',
        '4xl': 'var(--font-size-4xl)',
        '5xl': 'var(--font-size-5xl)',
        '6xl': 'var(--font-size-6xl)',
        
        // 语义化字体大小
        'page-title': 'var(--page-title-size)',
        'page-subtitle': 'var(--page-subtitle-size)',
        'section-title': 'var(--section-title-size)',
        'card-title': 'var(--card-title-size)',
      },
      lineHeight: {
        'tight': 'var(--line-height-tight)',
        'snug': 'var(--line-height-snug)',
        'normal': 'var(--line-height-normal)',
        'relaxed': 'var(--line-height-relaxed)',
        'loose': 'var(--line-height-loose)',
      },
      spacing: {
        'xs': 'var(--spacing-xs)',
        'sm': 'var(--spacing-sm)',
        'md': 'var(--spacing-md)',
        'lg': 'var(--spacing-lg)',
        'xl': 'var(--spacing-xl)',
        '2xl': 'var(--spacing-2xl)',
        '3xl': 'var(--spacing-3xl)',
      },
      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
      },
      animation: {
        'theme-transition': 'theme-transition 0.3s ease-in-out',
      },
      keyframes: {
        'theme-transition': {
          '0%': { opacity: '0.8' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}