// frontend/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';  // ← AJOUTEZ CETTE LIGNE
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>  {/* ← WRAPPEZ L'APP ICI */}
      <App />
    </AuthProvider>
  </React.StrictMode>
);