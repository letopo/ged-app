import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { registerServiceWorker } from './utils/pushNotificationHelper'

// ✅ Enregistrer le Service Worker au démarrage
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    registerServiceWorker()
      .then(() => console.log('✅ Service Worker prêt'))
      .catch(err => console.error('❌ Erreur Service Worker:', err));
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
)