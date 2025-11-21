// frontend/src/App.jsx - VERSION CORRIGÉE SANS DEBUG EN PRODUCTION

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
import NotificationSettings from './pages/NotificationSettings';
import NotificationDebug from './components/NotificationDebug';

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

const RHOrAdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <div>Chargement...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  const isRHOrAdmin = user?.role === 'admin' || user?.email === 'hsjm.rh@gmail.com';
  return isRHOrAdmin ? children : <Navigate to="/dashboard" replace />;
};

function App() {
  const { user, login, logout, isAuthenticated } = useAuth();
  useNotifications();

  return (
    <Router>
      {isAuthenticated && <Navbar user={user} onLogout={logout} />}
      
      {/* ✅ MODIFIÉ : Afficher debug seulement en développement */}
      {isAuthenticated && import.meta.env.DEV && <NotificationDebug />}
      
      <Routes>
        <Route path="/login" element={<Login onLogin={login} />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute><DocumentList /></ProtectedRoute>} />
        <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
        
        {/* ✅ Route paramètres notifications */}
        <Route path="/parametres/notifications" element={<ProtectedRoute><NotificationSettings /></ProtectedRoute>} />
        
        <Route path="/my-tasks" element={<ProtectedRoute><MyTasks /></ProtectedRoute>} />
        <Route path="/workflow-dashboard" element={<ProtectedRoute><WorkflowDashboard /></ProtectedRoute>} />
        <Route path="/user-management" element={<AdminRoute><UserManagement /></AdminRoute>} />
        
        <Route path="/create-from-template" element={<ProtectedRoute><CreateFromTemplate /></ProtectedRoute>} />
        <Route path="/create-work-request" element={<ProtectedRoute><CreateWorkRequest /></ProtectedRoute>} />
        
        <Route path="/employees" element={<RHOrAdminRoute><EmployeeManagement /></RHOrAdminRoute>} />
        <Route path="/services" element={<AdminRoute><ServicesManagement /></AdminRoute>} />
        
        <Route path="/parametres/notifications" element={<ProtectedRoute><NotificationSettings /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Router>
  );
}

export default App;