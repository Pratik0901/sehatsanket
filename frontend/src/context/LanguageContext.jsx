import React, { createContext, useContext, useState, useEffect } from 'react';
import { TRANSLATIONS, SUPPORTED_LANGUAGES } from '../utils/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    try {
      const saved = localStorage.getItem('sehat_lang');
      if (saved && SUPPORTED_LANGUAGES.some(l => l.code === saved)) {
        return saved;
      }
    } catch (e) {}
    return 'en';
  });

  useEffect(() => {
    try {
      localStorage.setItem('sehat_lang', currentLanguage);
    } catch (e) {}
  }, [currentLanguage]);

  const t = (key, fallback = '') => {
    const langDict = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    // Fallback to English
    if (TRANSLATIONS.en && TRANSLATIONS.en[key]) {
      return TRANSLATIONS.en[key];
    }
    return fallback || key;
  };

  const getLanguageDetails = (code) => {
    return SUPPORTED_LANGUAGES.find(l => l.code === code) || SUPPORTED_LANGUAGES[0];
  };

  return (
    <LanguageContext.Provider value={{
      currentLanguage,
      setLanguage: setCurrentLanguage,
      t,
      supportedLanguages: SUPPORTED_LANGUAGES,
      currentLangDetails: getLanguageDetails(currentLanguage)
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
