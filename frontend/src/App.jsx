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
import FormFill           from './pages/FormBuilder/FormFill.jsx';
import FormResponses      from './pages/FormBuilder/FormResponses.jsx';
import FormApprovalsPage  from './pages/FormApprovalsPage.jsx';
// ── MODULE PHP ─────────────────────────────────────────────────────────────────
import PHPModule from './pages/PHPModule';
import PHPPatients from './pages/PHPPatients';
import PHPStatistiques from './pages/PHPStatistiques';
import PHPConsultations from './pages/PHPConsultations';
import PHPReposHospit from './pages/PHPReposHospit';
import PhpFactures from './pages/PhpFactures';
import ComptaDocuments from './pages/ComptaDocuments';
import AccessControlPage from './pages/AccessControlPage';
import ChatPage from './pages/ChatPage';
import SuperAdminPage from './pages/SuperAdminPage';
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

const isAdminOrSuper = (role) => role === 'admin' || role === 'superadmin';

const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <RouteLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return isAdminOrSuper(user?.role) ? children : <Navigate to="/dashboard" replace />;
};

const RHOrAdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <RouteLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (isAdminOrSuper(user?.role) || (user?.postes || []).includes('rh'))
    ? children : <Navigate to="/dashboard" replace />;
};

const GMAORoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <RouteLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (isAdminOrSuper(user?.role) || (user?.postes || []).includes('gmao'))
    ? children : <Navigate to="/dashboard" replace />;
};

const KanbanRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <RouteLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (isAdminOrSuper(user?.role) || (user?.postes || []).includes('kanban'))
    ? children : <Navigate to="/dashboard" replace />;
};

const PortailRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <RouteLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (isAdminOrSuper(user?.role) || user?.role === 'gardien')
    ? children : <Navigate to="/dashboard" replace />;
};

const PHPRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <RouteLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (isAdminOrSuper(user?.role) || user?.role === 'agent_accueil_php')
    ? children : <Navigate to="/dashboard" replace />;
};

const AccueilRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <RouteLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (isAdminOrSuper(user?.role) || ['agent_accueil_php', 'agent_accueil_normal'].includes(user?.role))
    ? children : <Navigate to="/dashboard" replace />;
};

const CaisseRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <RouteLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (isAdminOrSuper(user?.role) || user?.role === 'caissier')
    ? children : <Navigate to="/dashboard" replace />;
};

const SuperAdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <RouteLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return user?.role === 'superadmin' ? children : <Navigate to="/dashboard" replace />;
};

const ComptaRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <RouteLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (isAdminOrSuper(user?.role) || (user?.postes || []).includes('comptable'))
    ? children : <Navigate to="/dashboard" replace />;
};

import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import { useEffect, useState } from 'react';

// Bannière discrète affichée quand un admin modifie les droits de l'utilisateur connecté
function RightsBanner() {
  const [visible, setVisible] = useState(false);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      setDetail(e.detail);
      setVisible(true);
    };
    window.addEventListener('rightsChanged', handler);
    return () => window.removeEventListener('rightsChanged', handler);
  }, []);

  if (!visible) return null;

  const msg = detail?.type === 'role'
    ? `Votre rôle a été modifié → ${detail.newRole}.`
    : detail?.type === 'poste_assigned'
      ? `Poste «${detail.posteLabel}» ajouté à votre profil.`
      : detail?.type === 'poste_removed'
        ? `Poste «${detail.posteLabel}» retiré de votre profil.`
        : 'Vos droits d\'accès ont été mis à jour.';

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: '#1e40af', color: '#fff',
      padding: '10px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontSize: 13, fontWeight: 500,
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      animation: 'slideDown 0.3s ease',
    }}>
      <span>🔐 {msg} Rechargez la page pour appliquer les changements.</span>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '4px 12px', borderRadius: 6,
            background: '#fff', color: '#1e40af',
            border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 12,
          }}
        >
          Recharger
        </button>
        <button
          onClick={() => setVisible(false)}
          style={{
            padding: '4px 8px', borderRadius: 6,
            background: 'transparent', color: '#fff',
            border: '1px solid rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 12,
          }}
        >
          ✕
        </button>
      </div>
      <style>{`@keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
}

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
      <RightsBanner />
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
          <Route path="/kanban/:serviceType"  element={<KanbanRoute><PageWrapper><TrelloBoard /></PageWrapper></KanbanRoute>} />
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
          <Route path="/forms/approvals"      element={<PageWrapper><FormApprovalsPage /></PageWrapper>} />
          <Route path="/portail"         element={<PortailRoute><PageWrapper><PortailDashboard /></PageWrapper></PortailRoute>} />
          <Route path="/accueil"         element={<AccueilRoute><PageWrapper><AccueilDashboard /></PageWrapper></AccueilRoute>} />
          <Route path="/caisse"          element={<CaisseRoute><PageWrapper><CaisseDashboard /></PageWrapper></CaisseRoute>} />

          {/* Module PHP */}
          <Route path="/php"               element={<PHPRoute><PageWrapper><PHPModule /></PageWrapper></PHPRoute>} />
          <Route path="/php/patients"      element={<PHPRoute><PageWrapper><PHPPatients /></PageWrapper></PHPRoute>} />
          <Route path="/php/consultations" element={<PHPRoute><PageWrapper><PHPConsultations /></PageWrapper></PHPRoute>} />
          <Route path="/php/statistiques"  element={<PHPRoute><PageWrapper><PHPStatistiques /></PageWrapper></PHPRoute>} />
          <Route path="/php/repos"         element={<PHPRoute><PageWrapper><PHPReposHospit /></PageWrapper></PHPRoute>} />
          <Route path="/php/factures"      element={<PHPRoute><PageWrapper><PhpFactures /></PageWrapper></PHPRoute>} />
          <Route path="/compta"            element={<ComptaRoute><PageWrapper><ComptaDocuments /></PageWrapper></ComptaRoute>} />
          <Route path="/admin/droits-acces" element={<AdminRoute><PageWrapper><AccessControlPage /></PageWrapper></AdminRoute>} />
          {/* Module Discussion */}
          <Route path="/chat"       element={<ChatPage />} />
          <Route path="/chat/:convId" element={<ChatPage />} />
          {/* Super Admin */}
          <Route path="/super-admin" element={<SuperAdminRoute><PageWrapper><SuperAdminPage /></PageWrapper></SuperAdminRoute>} />
        </Route>

        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Router>
    </SyncProvider>
  );
}

export default App;
