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
        // Pas de `both` : la fin sur translateY(0) (= matrice identité, ≠ none)
        // figée par `both` crée un bloc englobant qui casse le position:fixed des modals.
        fadeIn: 'fadeIn 0.2s ease-out',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        // GED Design System — variables CSS
        brand: {
          DEFAULT: 'var(--brand)',
          hover:   'var(--brand-hover)',
          soft:    'var(--brand-soft)',
          muted:   'var(--brand-muted)',
        },
        ged: {
          fg:              'var(--fg)',
          'fg-muted':      'var(--fg-muted)',
          'fg-subtle':     'var(--fg-subtle)',
          bg:              'var(--bg)',
          surface:         'var(--surface)',
          'surface-2':     'var(--surface-2)',
          'surface-3':     'var(--surface-3)',
          border:          'var(--border)',
          'border-strong': 'var(--border-strong)',
          success:         'var(--success)',
          'success-soft':  'var(--success-soft)',
          warning:         'var(--warning)',
          'warning-soft':  'var(--warning-soft)',
          danger:          'var(--danger)',
          'danger-soft':   'var(--danger-soft)',
          info:            'var(--info)',
          'info-soft':     'var(--info-soft)',
        },
        // Compatibilité dark mode existant
        dark: {
          bg:              '#1a1a1a',
          surface:         '#2d2d2d',
          border:          '#404040',
          text:            '#e5e5e5',
          'text-secondary':'#a3a3a3',
        },
      },
      borderRadius: {
        'ged-sm': 'var(--radius-2)',
        'ged':    'var(--radius-3)',
        'ged-md': 'var(--radius-4)',
        'ged-lg': 'var(--radius-5)',
      },
      boxShadow: {
        'ged-1': 'var(--shadow-1)',
        'ged-2': 'var(--shadow-2)',
        'ged-3': 'var(--shadow-3)',
      },
    },
  },
  plugins: [],
}
