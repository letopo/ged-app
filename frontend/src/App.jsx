// frontend/src/App.jsx - VERSION CORRIGÉE

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import useNotifications from './hooks/useNotifications';

import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import DocumentList from './pages/DocumentList';
import Upload from './components/Upload';
import MyTasks from './components/MyTasks';
import WorkflowDashboard from './pages/WorkflowDashboard';
import UserManagement from './pages/UserManagement';
import CreateFromTemplate from './pages/CreateFromTemplate';
import CreateWorkRequest from './pages/CreateWorkRequest';
import ServicesManagement from './pages/ServicesManagement';
import EmployeeManagement from './pages/EmployeeManagement.jsx';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div>Chargement...</div>;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <div>Chargement...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return user?.role === 'admin' ? children : <Navigate to="/dashboard" replace />;
};

// NOUVEAU : Route pour RH et Admin
const RHOrAdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <div>Chargement...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  // Permettre l'accès aux admin et au RH (hsjm.rh@gmail.com)
  const isRHOrAdmin = user?.role === 'admin' || user?.email === 'hsjm.rh@gmail.com';
  return isRHOrAdmin ? children : <Navigate to="/dashboard" replace />;
};

function App() {
  const { user, login, logout, isAuthenticated } = useAuth();
  useNotifications();

  return (
    <Router>
      {isAuthenticated && <Navbar user={user} onLogout={logout} />}
      <Routes>
        <Route path="/login" element={<Login onLogin={login} />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute><DocumentList /></ProtectedRoute>} />
        <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
        <Route path="/my-tasks" element={<ProtectedRoute><MyTasks /></ProtectedRoute>} />
        <Route path="/workflow-dashboard" element={<ProtectedRoute><WorkflowDashboard /></ProtectedRoute>} />
        <Route path="/user-management" element={<AdminRoute><UserManagement /></AdminRoute>} />
        
        {/* Routes pour la création de documents */}
        <Route path="/create-from-template" element={<ProtectedRoute><CreateFromTemplate /></ProtectedRoute>} />
        <Route path="/create-work-request" element={<ProtectedRoute><CreateWorkRequest /></ProtectedRoute>} />
        
        {/* CORRECTION : Route pour les employés - accessible par RH et Admin */}
        <Route path="/employees" element={<RHOrAdminRoute><EmployeeManagement /></RHOrAdminRoute>} />
        
        {/* CORRECTION : Route pour les services */}
        <Route path="/services" element={<AdminRoute><ServicesManagement /></AdminRoute>} />
        
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Router>
  );
}

export default App;