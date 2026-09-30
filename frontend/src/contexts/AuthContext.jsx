// frontend/src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import i18n from '../i18n/config';
import { isTokenExpired, getTokenExpiry, SESSION_EXPIRED_EVENT, resetSessionExpiredNotice } from '../utils/authSession';

// Plafond de setTimeout (~24,8 jours) : au-delà, le minuteur se déclencherait aussitôt.
const MAX_TIMER_MS = 2 ** 31 - 1;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Charger les données d'auth depuis localStorage au démarrage.
    // Sur Safari iOS (mode privé, quota de stockage, données partiellement
    // purgées par l'ITP), la lecture ou le JSON.parse peuvent lever une
    // exception — sans ce try/catch, ça faisait planter tout le rendu
    // (page blanche, sans aucune trace exploitable).
    try {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        if (isTokenExpired(storedToken)) {
          // Session d'une visite précédente, périmée : on repart de la page de
          // connexion au lieu d'appeler l'API avec un jeton refusé (401 en série).
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        } else {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      }
    } catch (err) {
      console.error('Session locale corrompue, réinitialisation:', err);
      try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch { /* ignore */ }
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (newToken, userData) => {
    try {
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (err) { console.error('Erreur écriture localStorage:', err); }
    resetSessionExpiredNotice();
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch { /* ignore */ }
    setToken(null);
    setUser(null);
  };

  // Session expirée : signalée par l'API (401), ou atteinte de l'échéance du
  // jeton pendant que l'appli reste ouverte.
  useEffect(() => {
    if (!token) return undefined;
    const expire = () => {
      logout();
      toast.error(i18n.t('Votre session a expiré, veuillez vous reconnecter.'), { id: 'session-expired', duration: 6000 });
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, expire);
    const remaining = (getTokenExpiry(token) ?? Infinity) - Date.now();
    const timer = remaining <= MAX_TIMER_MS ? setTimeout(expire, Math.max(remaining, 0)) : null;
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, expire);
      if (timer) clearTimeout(timer);
    };
  }, [token]);

  const updateUser = (userData) => {
    try { localStorage.setItem('user', JSON.stringify(userData)); } catch (err) { console.error('Erreur écriture localStorage:', err); }
    setUser(userData);
  };

  const value = {
    user,
    token,
    login,
    logout,
    updateUser,
    isAuthenticated: !!token,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;