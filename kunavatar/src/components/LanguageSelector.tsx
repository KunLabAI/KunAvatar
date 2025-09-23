'use client';

import React from 'react';
import { Languages, Check } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { locales, localeNames, type Locale } from '@/i18n/config';

export function LanguageSelector() {
  const { locale, setLocale, t } = useI18n();
  const { updateSetting } = useUserSettings();

  const handleLanguageChange = async (newLocale: Locale) => {
    // 更新I18n上下文
    await setLocale(newLocale);
    
    // 同时更新用户设置
    await updateSetting('language', newLocale);
  };

  return (
    <div className="bg-theme-card rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-theme-foreground mb-1 flex items-center gap-2">
            <Languages className="w-5 h-5" />
            {t('settings.appearance.language.title')}
          </h3>
          <p className="text-sm text-theme-foreground-muted">{t('settings.appearance.language.description')}</p>
        </div>
        <div className="flex gap-2">
          {locales.map((lang) => (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                locale === lang
                  ? 'bg-theme-primary text-white'
                  : 'bg-theme-background border border-theme-border text-theme-foreground hover:bg-theme-background/80'
              }`}
            >
              {locale === lang && <Check className="w-4 h-4" />}
              {localeNames[lang]}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-theme-border">
        <p className="text-xs text-theme-foreground-muted">
          {t('settings.appearance.language.current')}: {localeNames[locale]}
        </p>
      </div>
    </div>
  );
}