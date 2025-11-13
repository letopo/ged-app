// frontend/src/components/ThemeToggle.jsx
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle() {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex items-center justify-center w-10 h-10 rounded-full 
                 bg-blue-500 hover:bg-blue-600 dark:bg-blue-700 dark:hover:bg-blue-600
                 text-white transition-all duration-200 shadow-md hover:shadow-lg"
      aria-label={isDarkMode ? 'Activer le mode clair' : 'Activer le mode sombre'}
    >
      {isDarkMode ? (
        <Sun className="w-5 h-5 animate-in spin-in-180 duration-300" />
      ) : (
        <Moon className="w-5 h-5 animate-in spin-in-180 duration-300" />
      )}
    </button>
  );
}