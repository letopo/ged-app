// frontend/src/App.jsx - VERSION AVEC TOUS LES RÔLES

import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
// Electron charge via file:// → HashRouter requis. Navigateur → BrowserRouter.
const Router = window.electronAPI?.isElectron ? HashRouter : BrowserRouter;
import { Toaster } from 'react-hot-toast';
import { useAuth } from './contexts/AuthContext';
import useNotifications from './hooks/useNotifications';

import AppShell from './components/AppShell';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import DocumentList from './pages/DocumentList';
import Upload from './components/Upload';
import MyTasks from './components/MyTasks';
import WorkflowDashboard from './pages/WorkflowDashboard';
import UserManagement from './pages/UserManagement';
import PostesManagement from './pages/PostesManagement';
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
import AuditLogPage from './pages/AuditLogPage';
import StatistiquesPage from './pages/StatistiquesPage';
import WorkflowTemplatesPage from './pages/WorkflowTemplatesPage';
import VerifyDocument from './pages/VerifyDocument';
import GMAOPage from './pages/GMAOPage';
// ── MODULE FORM BUILDER ────────────────────────────────────────────────────────
import FormsListPage  from './pages/FormBuilder/index.jsx';
import FormDesigner   from './pages/FormBuilder/FormDesigner.jsx';
import FormFill       from './pages/FormBuilder/FormFill.jsx';
import FormResponses  from './pages/FormBuilder/FormResponses.jsx';
// ── MODULE PHP ─────────────────────────────────────────────────────────────────
import PHPModule from './pages/PHPModule';
import PHPPatients from './pages/PHPPatients';
import PHPStatistiques from './pages/PHPStatistiques';
import PHPConsultations from './pages/PHPConsultations';
import PHPReposHospit from './pages/PHPReposHospit';
import OfflineBanner from './components/OfflineBanner';
import SessionWarning from './components/SessionWarning';
import useSessionTimeout from './hooks/useSessionTimeout';
import { SyncProvider } from './contexts/SyncContext';

// ✅ NOUVEAUX DASHBOARDS
import PortailDashboard from './pages/PortailDashboard';

const RouteLoader = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)', gap: 16 }}>
    <div style={{ position: 'relative', width: 40, height: 40 }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid var(--brand-soft)' }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid transparent', borderTopColor: 'var(--brand)', animation: 'spin 0.7s linear infinite' }} />
    </div>
    <p style={{ fontSize: 13, color: 'var(--fg-muted)', fontWeight: 500 }}>Chargement…</p>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

/* ── Route guards ─────────────────────────────────────────────── */

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
  return (user?.role === 'admin' || user?.email === 'hsjm.rh@gmail.com')
    ? children : <Navigate to="/dashboard" replace />;
};

const GMAO_EMAILS = [
  'hsjm.cellulebiomedicale@gmail.com',
  'hsjm.pharma@gmail.com',
  'hopitalcameroun@ordredemaltefrance.org',
];
const GMAORoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <RouteLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (user?.role === 'admin' || GMAO_EMAILS.includes(user?.email))
    ? children : <Navigate to="/dashboard" replace />;
};

const PortailRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <RouteLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (user?.role === 'admin' || user?.role === 'gardien')
    ? children : <Navigate to="/dashboard" replace />;
};

const PHPRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <RouteLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (user?.role === 'admin' || user?.role === 'agent_accueil_php')
    ? children : <Navigate to="/dashboard" replace />;
};

const AccueilRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <RouteLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (user?.role === 'admin' || ['agent_accueil_php', 'agent_accueil_normal'].includes(user?.role))
    ? children : <Navigate to="/dashboard" replace />;
};

const CaisseRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <RouteLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (user?.role === 'admin' || user?.role === 'caissier')
    ? children : <Navigate to="/dashboard" replace />;
};

import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';

// Wrapper animation par route
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
  const { showWarning, remainingSeconds, extendSession, handleLogout } = useSessionTimeout(isAuthenticated, logout);

  return (
    <SyncProvider isAuthenticated={isAuthenticated}>
    <Router>
      <Toaster
        position="top-right"
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '10px',
            fontFamily: 'var(--font-sans)',
            fontSize: '13px',
            padding: '12px 16px',
            boxShadow: 'var(--shadow-3)',
            background: 'var(--surface)',
            color: 'var(--fg)',
            maxWidth: '380px',
          },
          success: {
            iconTheme: { primary: 'var(--success)', secondary: '#fff' },
            style: { borderLeft: '3px solid var(--success)' },
          },
          error: {
            iconTheme: { primary: 'var(--danger)', secondary: '#fff' },
            style: { borderLeft: '3px solid var(--danger)' },
            duration: 5000,
          },
        }}
      />

      {/* Afficher debug seulement en développement */}
      {isAuthenticated && import.meta.env.DEV && <NotificationDebug />}
      <OfflineBanner />
      {showWarning && (
        <SessionWarning
          remainingSeconds={remainingSeconds}
          onExtend={extendSession}
          onLogout={handleLogout}
        />
      )}

      <Routes>
        {/* ── Routes publiques ──────────────────────────────── */}
        <Route path="/login"         element={<Login onLogin={login} />} />
        <Route path="/register"      element={<Register />} />
        <Route path="/verify/:hash"  element={<VerifyDocument />} />
        <Route path="/display"       element={<PublicDisplay />} />

        {/* ── Form Designer (plein écran, hors AppShell) ───── */}
        <Route path="/forms/:id/designer" element={
          <ProtectedRoute>
            <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <FormDesigner />
            </div>
          </ProtectedRoute>
        } />

        {/* ── Form Fill (remplissage) ───────────────────────── */}
        <Route path="/forms/:id/fill" element={<ProtectedRoute><FormFill /></ProtectedRoute>} />

        {/* ── Routes protégées (dans AppShell) ─────────────── */}
        <Route element={<ProtectedRoute><AppShell onLogout={logout} /></ProtectedRoute>}>
          <Route path="/dashboard"            element={<PageWrapper><Dashboard /></PageWrapper>} />
          <Route path="/documents"            element={<PageWrapper><DocumentList /></PageWrapper>} />
          <Route path="/documents/:id"        element={<PageWrapper><DocumentList /></PageWrapper>} />
          <Route path="/upload"               element={<PageWrapper><Upload /></PageWrapper>} />
          <Route path="/archives"             element={<PageWrapper><ArchivesPage /></PageWrapper>} />
          <Route path="/my-tasks"             element={<PageWrapper><MyTasks /></PageWrapper>} />
          <Route path="/workflow-dashboard"   element={<PageWrapper><WorkflowDashboard /></PageWrapper>} />
          <Route path="/create-from-template" element={<PageWrapper><CreateFromTemplate /></PageWrapper>} />
          <Route path="/create-work-request"  element={<PageWrapper><CreateWorkRequest /></PageWrapper>} />
          <Route path="/demandes-achat"       element={<PageWrapper><DemandeAchatDashboard /></PageWrapper>} />
          <Route path="/invoices"             element={<PageWrapper><InvoiceDashboard /></PageWrapper>} />
          <Route path="/kanban/:serviceType"  element={<PageWrapper><TrelloBoard /></PageWrapper>} />
          <Route path="/settings"             element={<PageWrapper><Settings /></PageWrapper>} />
          <Route path="/parametres/notifications" element={<PageWrapper><NotificationSettings /></PageWrapper>} />

          <Route path="/schedules"              element={<PageWrapper><SchedulesList /></PageWrapper>} />
          <Route path="/schedules/create"       element={<PageWrapper><ScheduleCreate /></PageWrapper>} />
          <Route path="/schedules/:id/edit"     element={<PageWrapper><ScheduleEdit /></PageWrapper>} />
          <Route path="/schedules/:id/validate" element={<PageWrapper><ScheduleValidate /></PageWrapper>} />
          <Route path="/schedules/:id"          element={<PageWrapper><ScheduleValidate /></PageWrapper>} />
          <Route path="/schedules/:id/view"     element={<PageWrapper><ScheduleDetail /></PageWrapper>} />

          {/* Routes avec permission spéciale */}
          <Route path="/user-management" element={<AdminRoute><PageWrapper><UserManagement /></PageWrapper></AdminRoute>} />
          <Route path="/postes"          element={<AdminRoute><PageWrapper><PostesManagement /></PageWrapper></AdminRoute>} />
          <Route path="/services"        element={<AdminRoute><PageWrapper><ServicesManagement /></PageWrapper></AdminRoute>} />
          <Route path="/audit-log"       element={<AdminRoute><PageWrapper><AuditLogPage /></PageWrapper></AdminRoute>} />
          <Route path="/statistiques"    element={<AdminRoute><PageWrapper><StatistiquesPage /></PageWrapper></AdminRoute>} />
          <Route path="/workflow-templates" element={<AdminRoute><PageWrapper><WorkflowTemplatesPage /></PageWrapper></AdminRoute>} />
          <Route path="/employees"       element={<RHOrAdminRoute><PageWrapper><EmployeeManagement /></PageWrapper></RHOrAdminRoute>} />
          <Route path="/gmao"            element={<GMAORoute><PageWrapper><GMAOPage /></PageWrapper></GMAORoute>} />
          {/* ── Form Builder ── */}
          <Route path="/forms"                element={<PageWrapper><FormsListPage /></PageWrapper>} />
          <Route path="/forms/:id/responses"  element={<PageWrapper><FormResponses /></PageWrapper>} />
          <Route path="/portail"         element={<PortailRoute><PageWrapper><PortailDashboard /></PageWrapper></PortailRoute>} />
          <Route path="/accueil"         element={<AccueilRoute><PageWrapper><AccueilDashboard /></PageWrapper></AccueilRoute>} />
          <Route path="/caisse"          element={<CaisseRoute><PageWrapper><CaisseDashboard /></PageWrapper></CaisseRoute>} />

          {/* Module PHP */}
          <Route path="/php"               element={<PHPRoute><PageWrapper><PHPModule /></PageWrapper></PHPRoute>} />
          <Route path="/php/patients"      element={<PHPRoute><PageWrapper><PHPPatients /></PageWrapper></PHPRoute>} />
          <Route path="/php/consultations" element={<PHPRoute><PageWrapper><PHPConsultations /></PageWrapper></PHPRoute>} />
          <Route path="/php/statistiques"  element={<PHPRoute><PageWrapper><PHPStatistiques /></PageWrapper></PHPRoute>} />
          <Route path="/php/repos"         element={<PHPRoute><PageWrapper><PHPReposHospit /></PageWrapper></PHPRoute>} />
        </Route>

        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Router>
    </SyncProvider>
  );
}

export default App;
