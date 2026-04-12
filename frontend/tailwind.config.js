/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  safelist: [
    'bg-blue-600/95','bg-indigo-600/95','bg-violet-600/95','bg-emerald-700/95','bg-slate-800/95','bg-rose-600/95',
    'bg-blue-500','bg-indigo-500','bg-violet-500','bg-emerald-500','bg-slate-700','bg-rose-500',
  ],
  theme: {
    extend: {
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out both',
      },
      colors: {
        // Couleurs personnalisées pour le dark mode
        dark: {
          bg: '#1a1a1a',
          surface: '#2d2d2d',
          border: '#404040',
          text: '#e5e5e5',
          'text-secondary': '#a3a3a3',
        },
      },
    },
  },
  plugins: [],
}