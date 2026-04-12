import { useState, useEffect } from 'react';

const THEMES = {
  blue:   { bg: 'bg-blue-600/95 dark:bg-gray-900/95', pill: 'bg-white/10 dark:bg-white/5', label: 'Bleu', dot: 'bg-blue-500' },
  indigo: { bg: 'bg-indigo-600/95 dark:bg-gray-900/95', pill: 'bg-white/10 dark:bg-white/5', label: 'Indigo', dot: 'bg-indigo-500' },
  violet: { bg: 'bg-violet-600/95 dark:bg-gray-900/95', pill: 'bg-white/10 dark:bg-white/5', label: 'Violet', dot: 'bg-violet-500' },
  emerald:{ bg: 'bg-emerald-700/95 dark:bg-gray-900/95', pill: 'bg-white/10 dark:bg-white/5', label: 'Émeraude', dot: 'bg-emerald-500' },
  slate:  { bg: 'bg-slate-800/95 dark:bg-gray-900/95', pill: 'bg-white/10 dark:bg-white/5', label: 'Sombre', dot: 'bg-slate-700' },
  rose:   { bg: 'bg-rose-600/95 dark:bg-gray-900/95', pill: 'bg-white/10 dark:bg-white/5', label: 'Rose', dot: 'bg-rose-500' },
};

const STORAGE_KEY = 'ged-navbar-theme';

export function useNavbarTheme() {
  const [themeName, setThemeName] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'blue';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, themeName);
  }, [themeName]);

  const theme = THEMES[themeName] || THEMES.blue;

  return { themeName, setThemeName, theme, themes: THEMES };
}
