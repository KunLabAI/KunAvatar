// 支持的语言列表
export const locales = ['zh', 'en'] as const;
export type Locale = typeof locales[number];

// 默认语言
export const defaultLocale: Locale = 'zh';

// 语言显示名称
export const localeNames: Record<Locale, string> = {
  zh: '中文',
  en: 'English'
};

// 语言代码到浏览器语言的映射
export const localeToHTMLLang: Record<Locale, string> = {
  zh: 'zh-CN',
  en: 'en'
};