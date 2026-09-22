// frontend/src/components/ThemeToggle.jsx
import { Sun, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle() {
  const { t } = useTranslation();
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDarkMode ? t('Activer le mode clair') : t('Activer le mode sombre')}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 40, height: 40, borderRadius: '50%',
        background: 'var(--brand)', color: '#fff', border: 'none',
        cursor: 'pointer', boxShadow: 'var(--shadow-2)',
        transition: 'background .15s, box-shadow .15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-active)'; e.currentTarget.style.boxShadow = 'var(--shadow-3)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--brand)'; e.currentTarget.style.boxShadow = 'var(--shadow-2)'; }}
    >
      {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
