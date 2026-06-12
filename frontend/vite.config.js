// frontend/vite.config.js

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// Injecte un identifiant de build unique dans dist/sw.js (remplace __SW_VERSION__).
// Sans ça, sw.js est identique à chaque build → le navigateur ne détecte jamais
// de mise à jour du Service Worker et continue de servir l'app-shell périmé.
function swVersionPlugin() {
  return {
    name: 'sw-version-inject',
    apply: 'build',
    closeBundle() {
      const swPath = resolve(__dirname, 'dist/sw.js')
      if (!existsSync(swPath)) return
      const version = `ged-${Date.now()}`
      const src = readFileSync(swPath, 'utf-8').replaceAll('__SW_VERSION__', version)
      writeFileSync(swPath, src)
      console.log(`[sw-version] CACHE_VERSION = ${version}`)
    },
  }
}

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
    swVersionPlugin(),
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