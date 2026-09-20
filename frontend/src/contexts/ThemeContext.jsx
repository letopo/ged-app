// frontend/src/contexts/ThemeContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Charger la préférence depuis localStorage — protégé : Safari en mode
    // privé lève une exception sur le moindre accès à localStorage, ce qui
    // sans try/catch faisait planter le rendu dès le premier useState.
    try {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) return savedTheme === 'dark';
    } catch { /* ignore */ }
    // Si aucune préférence n'est sauvegardée (ou lecture impossible), mode CLAIR par défaut.
    return false;
  });

  useEffect(() => {
    // Appliquer le thème au document
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try { localStorage.setItem('theme', isDarkMode ? 'dark' : 'light'); } catch { /* ignore */ }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const value = {
    isDarkMode,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;