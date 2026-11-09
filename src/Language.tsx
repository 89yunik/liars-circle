import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { languageKey, translate, type Language } from './locale.ts';

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (message: string, values?: Record<string, string | number>) => string;
};
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    try { return localStorage.getItem(languageKey) === 'en' ? 'en' : 'ko'; }
    catch { return 'ko'; }
  });
  useEffect(() => {
    document.documentElement.lang = language;
    try { localStorage.setItem(languageKey, language); }
    catch { /* The current session can still switch languages when storage is unavailable. */ }
  }, [language]);
  return <LanguageContext.Provider value={{ language, setLanguage, t: (message, values) => translate(language, message, values) }}>
    {children}
  </LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('LanguageProvider is required');
  return context;
}

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();
  return <select className="language-switch" aria-label={t('언어')} value={language}
    onChange={event => setLanguage(event.target.value as Language)}>
    <option value="ko">한국어</option>
    <option value="en">English</option>
  </select>;
}
