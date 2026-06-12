// frontend/vite.config.js

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

// base: '/' pour le web (nginx) — indispensable pour que les liens profonds
//   (/documents/:id, /kanban/MG, rechargement, favoris) chargent les assets
//   depuis la racine et non depuis le chemin courant.
// base: './' uniquement pour Electron (chargement via file://), en passant
//   BUILD_TARGET=electron à la commande de build.
const isElectron = process.env.BUILD_TARGET === 'electron'

export default defineConfig({
  plugins: [
    react(),
    // Génère un bundle compatible iOS Safari 13+, Chrome Android, navigateurs anciens
    // Ajoute automatiquement les polyfills manquants (Promise, fetch, etc.)
    legacy({
      targets: ['ios >= 13', 'chrome >= 80', 'firefox >= 78'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
    }),
  ],
  base: isElectron ? './' : '/',
  resolve: {
    alias: {
      // ✅ NOUVEAUX POLYFILLS
      'buffer': 'buffer/',
      'stream': 'stream-browserify',
      'util': 'util',
    },
  },
  server: {
    port: 3001,
    proxy: {
      // Proxy pour les requêtes API HTTP
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      // ✅ AJOUT : Proxy pour Socket.IO
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true, // Important pour WebSocket
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: './index.html'
      }
    },
    copyPublicDir: true
  },
  publicDir: 'public'
})