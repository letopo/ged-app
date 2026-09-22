// frontend/src/contexts/LanguageContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import i18n from '../i18n/config';

const LanguageContext = createContext(null);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
};

const RTL_LANGS = ['ar'];

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(i18n.language || 'fr');

  useEffect(() => {
    const dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    try { localStorage.setItem('lang', lang); } catch { /* ignore */ }
  }, [lang]);

  const setLang = (newLang) => {
    i18n.changeLanguage(newLang);
    setLangState(newLang);
  };

  const value = { lang, setLang, dir: RTL_LANGS.includes(lang) ? 'rtl' : 'ltr' };
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export default LanguageContext;
