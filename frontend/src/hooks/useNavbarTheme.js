import { useState, useEffect } from 'react';

const THEMES = {
  blue:    { bg: '#2563eb', label: 'Bleu',     dot: '#3b82f6' },
  indigo:  { bg: '#4338ca', label: 'Indigo',   dot: '#6366f1' },
  violet:  { bg: '#7c3aed', label: 'Violet',   dot: '#8b5cf6' },
  emerald: { bg: '#047857', label: 'Émeraude', dot: '#10b981' },
  slate:   { bg: '#1e293b', label: 'Sombre',   dot: '#475569' },
  rose:    { bg: '#be123c', label: 'Rose',      dot: '#f43f5e' },
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
