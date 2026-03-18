// frontend/src/App.jsx - VERSION AVEC TOUS LES RÔLES

import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
// Electron charge via file:// → HashRouter requis. Navigateur → BrowserRouter.
const Router = window.electronAPI?.isElectron ? HashRouter : BrowserRouter;
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
import AccueilDashboard from './pages/AccueilDashboard';
import CaisseDashboard from './pages/CaisseDashboard';
import PublicDisplay from './pages/PublicDisplay';
import SchedulesList from './pages/SchedulesList';
import ScheduleCreate from './pages/ScheduleCreate';
import ScheduleEdit from './pages/ScheduleEdit';
import ScheduleValidate from './pages/ScheduleValidate';
import ScheduleDetail from './pages/ScheduleDetail';
import './styles/print.css';
import TrelloBoard from './pages/TrelloBoard';
import Settings from './pages/Settings';
import InvoiceDashboard from './pages/InvoiceDashboard';
import DemandeAchatDashboard from './pages/DemandeAchatDashboard';
import ArchivesPage from './pages/ArchivesPage';





// ✅ NOUVEAUX DASHBOARDS
import PortailDashboard from './pages/PortailDashboard';
// import AccueilDashboard from './pages/AccueilDashboard'; // À créer
// import CaisseDashboard from './pages/CaisseDashboard'; // À créer

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

// ✅ NOUVEAU : Route pour le Portail (Gardien)
const PortailRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <div>Chargement...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  const canAccess = user?.role === 'admin' || user?.role === 'gardien';
  return canAccess ? children : <Navigate to="/dashboard" replace />;
};

// ✅ NOUVEAU : Route pour l'Accueil (Agents d'accueil)
const AccueilRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <div>Chargement...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  const canAccess = 
    user?.role === 'admin' || 
    user?.role === 'agent_accueil_php' || 
    user?.role === 'agent_accueil_normal';
  return canAccess ? children : <Navigate to="/dashboard" replace />;
};

// ✅ NOUVEAU : Route pour la Caisse (Caissier)
const CaisseRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <div>Chargement...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  const canAccess = user?.role === 'admin' || user?.role === 'caissier';
  return canAccess ? children : <Navigate to="/dashboard" replace />;
};

function App() {
  const { user, login, logout, isAuthenticated } = useAuth();
  useNotifications();

  return (
    <Router>
      {isAuthenticated && <Navbar user={user} onLogout={logout} />}
      
      {/* Afficher debug seulement en développement */}
      {isAuthenticated && import.meta.env.DEV && <NotificationDebug />}
      
      <Routes>
        <Route path="/login" element={<Login onLogin={login} />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

        <Route path="/documents" element={<ProtectedRoute><DocumentList /></ProtectedRoute>} />
        <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
        
        <Route path="/parametres/notifications" element={<ProtectedRoute><NotificationSettings /></ProtectedRoute>} />
        
        <Route path="/my-tasks" element={<ProtectedRoute><MyTasks /></ProtectedRoute>} />
        <Route path="/workflow-dashboard" element={<ProtectedRoute><WorkflowDashboard /></ProtectedRoute>} />
        <Route path="/user-management" element={<AdminRoute><UserManagement /></AdminRoute>} />
        
        <Route path="/create-from-template" element={<ProtectedRoute><CreateFromTemplate /></ProtectedRoute>} />
        <Route path="/create-work-request" element={<ProtectedRoute><CreateWorkRequest /></ProtectedRoute>} />
        <Route path="/demandes-achat" element={<ProtectedRoute><DemandeAchatDashboard /></ProtectedRoute>} />
        
        <Route path="/employees" element={<RHOrAdminRoute><EmployeeManagement /></RHOrAdminRoute>} />
        <Route path="/services" element={<AdminRoute><ServicesManagement /></AdminRoute>} />
        <Route path="/accueil" element={<AccueilRoute><AccueilDashboard /></AccueilRoute>} />

        
        {/* ✅ NOUVELLES ROUTES SYSTÈME DE FILES D'ATTENTE */}
        <Route path="/portail" element={<PortailRoute><PortailDashboard /></PortailRoute>} />
        {/* <Route path="/accueil" element={<AccueilRoute><AccueilDashboard /></AccueilRoute>} /> */}
        {/* <Route path="/caisse" element={<CaisseRoute><CaisseDashboard /></CaisseRoute>} /> */}
        
        <Route path="/caisse" element={<CaisseRoute><CaisseDashboard /></CaisseRoute>} />
        <Route path="/display" element={<PublicDisplay />} />
        <Route path="/schedules" element={<SchedulesList />} />
        <Route path="/schedules/create" element={<ScheduleCreate />} />
        <Route path="/schedules/:id/edit" element={<ScheduleEdit />} />
        <Route path="/schedules/:id/validate" element={<ScheduleValidate />} />
        <Route path="/schedules/:id" element={<ScheduleValidate />} /> {/* Vue détaillée = validation */}
        <Route path="/schedules/:id/view" element={<ScheduleDetail />} />
        <Route path="/kanban/:serviceType" element={<ProtectedRoute><TrelloBoard /></ProtectedRoute>} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/invoices" element={<ProtectedRoute><InvoiceDashboard /></ProtectedRoute>} />
        <Route path="/archives" element={<ProtectedRoute><ArchivesPage /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Router>
  );
}

export default App;