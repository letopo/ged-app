import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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