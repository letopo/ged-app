// frontend/src/components/DashboardWrapper.jsx

import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import Dashboard from './Dashboard';

export default function DashboardWrapper() {
  const { user } = useAuth();

  // Redirection automatique selon le rôle
  if (user?.role === 'gardien') {
    return <Navigate to="/portail" replace />;
  }
  
  if (user?.role === 'agent_accueil_php' || user?.role === 'agent_accueil_normal') {
    return <Navigate to="/accueil" replace />;
  }
  
  if (user?.role === 'caissier') {
    return <Navigate to="/caisse" replace />;
  }

  // Pour les autres rôles, afficher le Dashboard normal
  return <Dashboard />;
}