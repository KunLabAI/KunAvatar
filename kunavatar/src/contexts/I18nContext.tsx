'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Locale, defaultLocale } from '@/i18n/config';

interface Messages {
  [key: string]: any;
}

interface I18nContextType {
  locale: Locale;
  messages: Messages;
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale || defaultLocale);
  const [messages, setMessages] = useState<Messages>({});

  // 加载翻译消息
  const loadMessages = async (newLocale: Locale) => {
    try {
      const response = await fetch(`/messages/${newLocale}.json`);
      if (response.ok) {
        const newMessages = await response.json();
        setMessages(newMessages);
      } else {
        console.warn(`Failed to load messages for locale: ${newLocale}`);
        // 如果加载失败，尝试加载默认语言
        if (newLocale !== defaultLocale) {
          const fallbackResponse = await fetch(`/messages/${defaultLocale}.json`);
          if (fallbackResponse.ok) {
            const fallbackMessages = await fallbackResponse.json();
            setMessages(fallbackMessages);
          }
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // 设置语言
  const setLocale = async (newLocale: Locale) => {
    setLocaleState(newLocale);
    await loadMessages(newLocale);
    
    // 保存到localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('locale', newLocale);
      // 更新HTML lang属性
      document.documentElement.lang = newLocale === 'zh' ? 'zh-CN' : 'en';
    }
  };

  // 翻译函数
  const t = (key: string, fallback?: string): string => {
    const keys = key.split('.');
    let value: any = messages;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return fallback || key;
      }
    }
    
    return typeof value === 'string' ? value : fallback || key;
  };

  // 初始化加载
  useEffect(() => {
    // 从localStorage读取保存的语言设置
    if (typeof window !== 'undefined') {
      const savedLocale = localStorage.getItem('locale') as Locale;
      if (savedLocale && savedLocale !== locale) {
        setLocale(savedLocale);
      } else {
        loadMessages(locale);
      }
    }
  }, []);

  const value: I18nContextType = {
    locale,
    messages,
    setLocale,
    t
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}