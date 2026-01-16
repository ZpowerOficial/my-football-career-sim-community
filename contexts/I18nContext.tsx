import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import id from '../locales/id.json';
import ja from '../locales/ja.json';
import ko from '../locales/ko.json';
import pt from '../locales/pt.json';
import ru from '../locales/ru.json';
import tr from '../locales/tr.json';

const translationsMap = {
  en,
  es,
  fr,
  id,
  ja,
  ko,
  pt,
  ru,
  tr,
} as const;

export type Language = keyof typeof translationsMap;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};

interface I18nProviderProps {
  children: ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem('fcs_lang');
      if (stored && stored in translationsMap) {
        return stored as Language;
      }
      // Detect browser language
      const browserLang = navigator.language.split('-')[0];
      if (browserLang in translationsMap) {
        return browserLang as Language;
      }
      return 'en';
    } catch {
      return 'en';
    }
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('fcs_lang', lang);
      document.documentElement.setAttribute('lang', lang);
    } catch {}
  };

  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = translationsMap[language];

    // Navigate to the key
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to English if not found in current language
        let fallbackValue: any = translationsMap['en'];
        for (const fallbackK of keys) {
             if (fallbackValue && typeof fallbackValue === 'object' && fallbackK in fallbackValue) {
                 fallbackValue = fallbackValue[fallbackK];
             } else {
                 return key; // Not found in English either
             }
        }
        value = fallbackValue;
        break; // Found in fallback, stop searching in primary
      }
    }

    let result = typeof value === 'string' ? value : key;

    // Interpolate parameters
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        result = result.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramValue));
      });
    }

    return result;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};