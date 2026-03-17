/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // ✅ Activer le dark mode avec la classe 'dark'
  theme: {
    extend: {
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