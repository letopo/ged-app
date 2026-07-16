// frontend/src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

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
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
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
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch { /* ignore */ }
    setToken(null);
    setUser(null);
  };

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