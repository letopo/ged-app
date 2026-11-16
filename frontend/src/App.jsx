// frontend/src/App.jsx - VERSION AVEC TOUS LES RÔLES

import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
// Electron charge via file:// → HashRouter requis. Navigateur → BrowserRouter.
const Router = window.electronAPI?.isElectron ? HashRouter : BrowserRouter;
import { Toaster } from 'react-hot-toast';
import { useAuth } from './contexts/AuthContext';
import useNotifications from './hooks/useNotifications';
import ChatNotifier from './components/chat/ChatNotifier';

import AppShell from './components/AppShell';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import DocumentList from './pages/DocumentList';
import Upload from './components/Upload';
import MyTasks from './components/MyTasks';
import WorkflowDashboard from './pages/WorkflowDashboard';
import UserManagement from './pages/UserManagement';
import SageFacturesPHP from './pages/SageFacturesPHP';
import SageBlPhp from './pages/SageBlPhp';
import CaissePharmacie from './pages/CaissePharmacie';
import BonsCommande from './pages/BonsCommande';
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
import NouveautesPage from './pages/NouveautesPage';
import ApplicationAndroidPage from './pages/ApplicationAndroidPage';
import WorkflowTemplatesPage from './pages/WorkflowTemplatesPage';
import VerifyDocument from './pages/VerifyDocument';
import SignerPage from './pages/SignerPage';
import SignatureKiosk from './pages/SignatureKiosk';
import ParcVehicules from './pages/ParcVehicules';
import ProgrammeOperatoire from './pages/ProgrammeOperatoire';
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
import PHPPharmacie from './pages/PHPPharmacie';
import PhpFactures from './pages/PhpFactures';
import ComptaDocuments from './pages/ComptaDocuments';
import AccessControlPage from './pages/AccessControlPage';
import ChatPage from './pages/ChatPage';
import SuperAdminPage from './pages/SuperAdminPage';
import EtatServeur from './pages/EtatServeur';
import OfflineBanner from './components/OfflineBanner';
import SessionWarning from './components/SessionWarning';
import useSessionTimeout from './hooks/useSessionTimeout';
import { isRememberedSession } from './utils/authSession';
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

// Module désactivé pour l'établissement (Paramètres › Modules) : page d'information
const ModuleRoute = ({ module, children }) => {
  const { user } = useAuth();
  if (hasModule(user, module)) return children;
  return (
    <div style={{ maxWidth: 520, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)', margin: '0 0 8px' }}>Module non activé</h2>
      <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0, lineHeight: 1.6 }}>
        Ce module n'est pas activé pour votre établissement. Les documents déjà signés restent consultables dans les Archives.
        Pour l'activer, contactez votre administrateur (Paramètres › Modules).
      </p>
    </div>
  );
};

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

// Employés : RH/admin, ou poste « Saisie du personnel » (ajout et modification seulement)
const EmployeesRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <RouteLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (isAdminOrSuper(user?.role) || (user?.postes || []).some(p => ['rh', 'employes_saisie'].includes(p)))
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
  return phpAccess(user).read ? children : <Navigate to="/dashboard" replace />;
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

// Factures : mêmes rôles que le serveur (routes/invoices.js) et que le menu
const ManagementRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <RouteLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (isAdminOrSuper(user?.role) || ['director', 'dds', 'medical_chief'].includes(user?.role))
    ? children : <Navigate to="/dashboard" replace />;
};

import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import { useEffect, useState } from 'react';
import { phpAccess } from './utils/phpAccess';
import { hasModule } from './utils/modules';

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
  const { user, token, login, logout, isAuthenticated } = useAuth();
  useNotifications();
  // « Rester connecté sur cet appareil » : pas de déconnexion pour inactivité
  const { showWarning, remainingSeconds, extendSession, handleLogout } = useSessionTimeout(isAuthenticated && !isRememberedSession(token), logout);

  return (
    <SyncProvider isAuthenticated={isAuthenticated}>
    <Router>
      <ChatNotifier />
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
        <Route path="/verify"        element={<VerifyDocument />} />
        <Route path="/verify/:hash"  element={<VerifyDocument />} />
        <Route path="/display"       element={<PublicDisplay />} />
        {/* Signature du patient sur une tablette (jeton du QR code, sans connexion) */}
        <Route path="/signer/:token" element={<SignerPage />} />
        {/* Tablette du guichet connectée, qui reçoit les demandes de signature */}
        <Route path="/borne-signature" element={<ProtectedRoute><SignatureKiosk /></ProtectedRoute>} />

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
          <Route path="/demandes-achat"       element={<ModuleRoute module="achats"><PageWrapper><DemandeAchatDashboard /></PageWrapper></ModuleRoute>} />
          <Route path="/invoices"             element={<ManagementRoute><PageWrapper><InvoiceDashboard /></PageWrapper></ManagementRoute>} />
          <Route path="/kanban/:serviceType"  element={<KanbanRoute><ModuleRoute module="trello"><PageWrapper><TrelloBoard /></PageWrapper></ModuleRoute></KanbanRoute>} />
          <Route path="/settings"             element={<PageWrapper><Settings /></PageWrapper>} />
          <Route path="/parametres/notifications" element={<PageWrapper><NotificationSettings /></PageWrapper>} />
          <Route path="/nouveautes"           element={<PageWrapper><NouveautesPage /></PageWrapper>} />
          <Route path="/application-android"  element={<PageWrapper><ApplicationAndroidPage /></PageWrapper>} />

          <Route path="/schedules"              element={<PageWrapper><SchedulesList /></PageWrapper>} />
          <Route path="/schedules/create"       element={<PageWrapper><ScheduleCreate /></PageWrapper>} />
          <Route path="/schedules/:id/edit"     element={<PageWrapper><ScheduleEdit /></PageWrapper>} />
          <Route path="/schedules/:id/validate" element={<PageWrapper><ScheduleValidate /></PageWrapper>} />
          <Route path="/schedules/:id"          element={<PageWrapper><ScheduleValidate /></PageWrapper>} />
          <Route path="/schedules/:id/view"     element={<PageWrapper><ScheduleDetail /></PageWrapper>} />

          {/* Routes avec permission spéciale */}
          <Route path="/user-management" element={<AdminRoute><PageWrapper><UserManagement /></PageWrapper></AdminRoute>} />
          <Route path="/sage-factures-php" element={<ModuleRoute module="sage"><PageWrapper><SageFacturesPHP /></PageWrapper></ModuleRoute>} />
          <Route path="/sage-bl-php"       element={<ModuleRoute module="sage"><PageWrapper><SageBlPhp /></PageWrapper></ModuleRoute>} />
          <Route path="/caisse-pharmacie"  element={<ModuleRoute module="caisse_pharmacie"><PageWrapper><CaissePharmacie /></PageWrapper></ModuleRoute>} />
          <Route path="/bons-commande"     element={<ModuleRoute module="sage"><PageWrapper><BonsCommande /></PageWrapper></ModuleRoute>} />
          <Route path="/postes"          element={<AdminRoute><PageWrapper><PostesManagement /></PageWrapper></AdminRoute>} />
          <Route path="/services"        element={<AdminRoute><PageWrapper><ServicesManagement /></PageWrapper></AdminRoute>} />
          <Route path="/audit-log"       element={<AdminRoute><PageWrapper><AuditLogPage /></PageWrapper></AdminRoute>} />
          <Route path="/statistiques"    element={<AdminRoute><PageWrapper><StatistiquesPage /></PageWrapper></AdminRoute>} />
          <Route path="/workflow-templates" element={<AdminRoute><PageWrapper><WorkflowTemplatesPage /></PageWrapper></AdminRoute>} />
          <Route path="/employees"       element={<EmployeesRoute><PageWrapper><EmployeeManagement /></PageWrapper></EmployeesRoute>} />
          <Route path="/vehicules"       element={<ModuleRoute module="vehicules"><PageWrapper><ParcVehicules /></PageWrapper></ModuleRoute>} />
          <Route path="/bloc-operatoire" element={<ModuleRoute module="bloc"><PageWrapper><ProgrammeOperatoire /></PageWrapper></ModuleRoute>} />
          <Route path="/gmao"            element={<ModuleRoute module="gmao"><GMAORoute><PageWrapper><GMAOPage /></PageWrapper></GMAORoute></ModuleRoute>} />
          {/* ── Form Builder ── */}
          <Route path="/forms"                element={<PageWrapper><FormsListPage /></PageWrapper>} />
          <Route path="/forms/:id/responses"  element={<PageWrapper><FormResponses /></PageWrapper>} />
          <Route path="/forms/approvals"      element={<PageWrapper><FormApprovalsPage /></PageWrapper>} />
          <Route path="/portail"         element={<PortailRoute><PageWrapper><PortailDashboard /></PageWrapper></PortailRoute>} />
          <Route path="/accueil"         element={<AccueilRoute><PageWrapper><AccueilDashboard /></PageWrapper></AccueilRoute>} />
          <Route path="/caisse"          element={<CaisseRoute><PageWrapper><CaisseDashboard /></PageWrapper></CaisseRoute>} />

          {/* Module PHP */}
          <Route path="/php"               element={<ModuleRoute module="php"><PHPRoute><PageWrapper><PHPModule /></PageWrapper></PHPRoute></ModuleRoute>} />
          <Route path="/php/patients"      element={<ModuleRoute module="php"><PHPRoute><PageWrapper><PHPPatients /></PageWrapper></PHPRoute></ModuleRoute>} />
          <Route path="/php/consultations" element={<ModuleRoute module="php"><PHPRoute><PageWrapper><PHPConsultations /></PageWrapper></PHPRoute></ModuleRoute>} />
          <Route path="/php/statistiques"  element={<ModuleRoute module="php"><PHPRoute><PageWrapper><PHPStatistiques /></PageWrapper></PHPRoute></ModuleRoute>} />
          <Route path="/php/repos"         element={<ModuleRoute module="php"><PHPRoute><PageWrapper><PHPReposHospit /></PageWrapper></PHPRoute></ModuleRoute>} />
          <Route path="/php/pharmacie"     element={<ModuleRoute module="php"><PHPRoute><PageWrapper><PHPPharmacie /></PageWrapper></PHPRoute></ModuleRoute>} />
          <Route path="/php/factures"      element={<ModuleRoute module="php"><PHPRoute><PageWrapper><PhpFactures /></PageWrapper></PHPRoute></ModuleRoute>} />
          <Route path="/compta"            element={<ComptaRoute><PageWrapper><ComptaDocuments /></PageWrapper></ComptaRoute>} />
          <Route path="/admin/droits-acces" element={<AdminRoute><PageWrapper><AccessControlPage /></PageWrapper></AdminRoute>} />
          {/* Module Discussion */}
          <Route path="/chat"       element={<ChatPage />} />
          <Route path="/chat/:convId" element={<ChatPage />} />
          {/* Super Admin */}
          <Route path="/super-admin" element={<SuperAdminRoute><PageWrapper><SuperAdminPage /></PageWrapper></SuperAdminRoute>} />
          <Route path="/etat-serveur" element={<SuperAdminRoute><PageWrapper><EtatServeur /></PageWrapper></SuperAdminRoute>} />
        </Route>

        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Router>
    </SyncProvider>
  );
}

export default App;
