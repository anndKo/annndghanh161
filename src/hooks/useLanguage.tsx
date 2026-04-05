import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

type Language = 'vi' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  showLanguagePicker: boolean;
  setShowLanguagePicker: (show: boolean) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { t: i18nT } = useTranslation();
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('app_language') as Language) || 'vi';
  });
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  useEffect(() => {
    const hasChosen = localStorage.getItem('app_language');
    if (!hasChosen) {
      setShowLanguagePicker(true);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
    i18n.changeLanguage(lang);
  };

  const t = (key: string): string => {
    return i18nT(key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, showLanguagePicker, setShowLanguagePicker }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
