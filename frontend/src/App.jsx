// frontend/src/App.jsx - VERSION AVEC TOUS LES RÔLES

import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
// Electron charge via file:// → HashRouter requis. Navigateur → BrowserRouter.
const Router = window.electronAPI?.isElectron ? HashRouter : BrowserRouter;
import { Toaster } from 'react-hot-toast';
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
import GMAOPage from './pages/GMAOPage';
// ── MODULE PHP ─────────────────────────────────────────────────────────────────
import PHPModule from './pages/PHPModule';
import PHPPatients from './pages/PHPPatients';
import PHPStatistiques from './pages/PHPStatistiques';
import PHPConsultations from './pages/PHPConsultations';
import PHPReposHospit from './pages/PHPReposHospit';



// ✅ NOUVEAUX DASHBOARDS
import PortailDashboard from './pages/PortailDashboard';
// import AccueilDashboard from './pages/AccueilDashboard'; // À créer
// import CaisseDashboard from './pages/CaisseDashboard'; // À créer

const RouteLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 gap-4">
    <div className="relative">
      <div className="w-12 h-12 rounded-full border-4 border-blue-100 dark:border-blue-900" />
      <div className="w-12 h-12 rounded-full border-4 border-t-blue-600 dark:border-t-blue-400 animate-spin absolute inset-0" />
    </div>
    <p className="text-sm text-gray-400 dark:text-gray-500 font-medium tracking-wide">Chargement…</p>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <RouteLoader />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <RouteLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return user?.role === 'admin' ? children : <Navigate to="/dashboard" replace />;
};

const RHOrAdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <RouteLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  const isRHOrAdmin = user?.role === 'admin' || user?.email === 'hsjm.rh@gmail.com';
  return isRHOrAdmin ? children : <Navigate to="/dashboard" replace />;
};

// ✅ Route GMAO (Cellule Biomedicale + Pharma + Admin)
const GMAO_EMAILS = [
  'hsjm.cellulebiomedicale@gmail.com',
  'hsjm.pharma@gmail.com',
  'hopitalcameroun@ordredemaltefrance.org',
];
const GMAORoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <RouteLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const canAccess = user?.role === 'admin' || GMAO_EMAILS.includes(user?.email);
  return canAccess ? children : <Navigate to="/dashboard" replace />;
};

// ✅ NOUVEAU : Route pour le Portail (Gardien)
const PortailRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <RouteLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  const canAccess = user?.role === 'admin' || user?.role === 'gardien';
  return canAccess ? children : <Navigate to="/dashboard" replace />;
};

// ✅ Route pour le Module PHP (Agent accueil PHP + Admin)
const PHPRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <RouteLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const canAccess = user?.role === 'admin' || user?.role === 'agent_accueil_php';
  return canAccess ? children : <Navigate to="/dashboard" replace />;
};

// ✅ NOUVEAU : Route pour l'Accueil (Agents d'accueil)
const AccueilRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <RouteLoader />;
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
  if (loading) return <RouteLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  const canAccess = user?.role === 'admin' || user?.role === 'caissier';
  return canAccess ? children : <Navigate to="/dashboard" replace />;
};

import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';

// Wrapper qui déclenche animate-fadeIn à chaque changement de route
const PageWrapper = ({ children }) => {
  const location = useLocation();
  useKeyboardShortcuts();
  return (
    <div key={location.pathname} className="animate-fadeIn">
      {children}
    </div>
  );
};

function App() {
  const { user, login, logout, isAuthenticated } = useAuth();
  useNotifications();

  return (
    <Router>
      <Toaster
        position="top-right"
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '16px',
            fontFamily: 'inherit',
            fontSize: '13px',
            padding: '12px 16px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            background: '#fff',
            color: '#1f2937',
            maxWidth: '380px',
          },
          success: {
            iconTheme: { primary: '#16a34a', secondary: '#fff' },
            style: { borderLeft: '4px solid #16a34a' },
          },
          error: {
            iconTheme: { primary: '#dc2626', secondary: '#fff' },
            style: { borderLeft: '4px solid #dc2626' },
            duration: 5000,
          },
        }}
      />
      {isAuthenticated && <Navbar user={user} onLogout={logout} />}

      {/* Afficher debug seulement en développement */}
      {isAuthenticated && import.meta.env.DEV && <NotificationDebug />}

      <PageWrapper>
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
        <Route path="/gmao" element={<GMAORoute><GMAOPage /></GMAORoute>} />

        {/* ── MODULE PHP ───────────────────────────────────────────────────── */}
        <Route path="/php" element={<PHPRoute><PHPModule /></PHPRoute>} />
        <Route path="/php/patients" element={<PHPRoute><PHPPatients /></PHPRoute>} />
        <Route path="/php/consultations" element={<PHPRoute><PHPConsultations /></PHPRoute>} />
        <Route path="/php/statistiques" element={<PHPRoute><PHPStatistiques /></PHPRoute>} />
        <Route path="/php/repos" element={<PHPRoute><PHPReposHospit /></PHPRoute>} />

        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      </Routes>
      </PageWrapper>
    </Router>
  );
}

export default App;