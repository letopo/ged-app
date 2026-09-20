// frontend/src/components/Navbar.jsx - DESIGN PROFESSIONNEL REDESIGNÉ

import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Home,
  FileText,
  Upload,
  CheckSquare,
  BarChart3,
  LogOut,
  Menu,
  X,
  Bell,
  Users,
  LayoutGrid,
  UserPlus,
  DoorOpen,
  DollarSign,
  Settings,
  ChevronDown,
  Calendar,
  Kanban,
  Grid,
  Receipt,
  ShoppingCart,
  Activity,
  Archive,
  Wrench,
  Stethoscope,
  Shield,
  Calculator,
  MessageSquare,
  FileSpreadsheet,
} from 'lucide-react';
import { workflowAPI, usersAPI } from '../services/api';
import useChatUnread from '../hooks/useChatUnread';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';
import GlobalSearch from './GlobalSearch';
import SyncStatus from './SyncStatus';
import toast from 'react-hot-toast';
import { useNavbarTheme } from '../hooks/useNavbarTheme';

const getRoleLabel = (role) => {
  const roleLabels = {
    'user': 'Utilisateur',
    'validator': 'Validateur',
    'director': 'Directeur',
    'admin': 'Administrateur',
    'gardien': 'Gardien',
    'agent_accueil_php': 'Point Focal PHP',
    'agent_accueil_normal': 'Agent Accueil Normal',
    'caissier': 'Caissier',
    'chef_de_service': 'Chef de Service',
    'dds': 'Directrice des Soins',
    'medical_chief': 'Médecin Chef'
  };
  return roleLabels[role] || role;
};

// Avatar palette (identity colors — hardcoded intentionally)
const AVATAR_COLORS = ['#8b5cf6','#3b82f6','#10b981','#f43f5e','#f59e0b','#06b6d4','#ec4899'];

export default function Navbar({ onLogout }) {
  const { user, updateUser } = useAuth();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const [pendingCount, setPendingCount] = useState(0);
  const [hasNewTask, setHasNewTask] = useState(false);
  const [togglingAbsence, setTogglingAbsence] = useState(false);

  const handleToggleMyAbsence = async () => {
    if (!user?.id) return;
    if (!user.isAbsent && !user.substituteId) {
      toast.error('Aucun remplaçant configuré sur votre compte — demandez à un administrateur d\'en désigner un avant de vous mettre absent.');
      return;
    }
    setTogglingAbsence(true);
    try {
      const res = await usersAPI.setAbsence(user.id, !user.isAbsent);
      updateUser({ ...user, isAbsent: !user.isAbsent });
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors du changement de statut.');
    } finally {
      setTogglingAbsence(false);
    }
  };
  const { unreadCount: chatUnread } = useChatUnread();
  const { themeName, setThemeName, theme, themes } = useNavbarTheme();

  const loadPendingTasks = async () => {
    try {
      const response = await workflowAPI.getMyTasks('pending');
      setPendingCount(response.data.tasks?.length || 0);
    } catch (err) {
      console.error('Erreur chargement tâches:', err);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadPendingTasks();

    const handleNewTask = () => {
      setPendingCount(prev => prev + 1);
      setHasNewTask(true);
      setTimeout(() => setHasNewTask(false), 3000);
      setTimeout(() => loadPendingTasks(), 1000);
    };

    const handleTaskUpdate = () => {
      setTimeout(() => loadPendingTasks(), 1000);
    };

    window.addEventListener('newTask', handleNewTask);
    window.addEventListener('taskUpdate', handleTaskUpdate);
    const interval = setInterval(loadPendingTasks, 120000);

    return () => {
      window.removeEventListener('newTask', handleNewTask);
      window.removeEventListener('taskUpdate', handleTaskUpdate);
      clearInterval(interval);
    };
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest('.user-menu-container')) setShowUserMenu(false);
      if (showMoreMenu && !event.target.closest('.more-menu-container')) setShowMoreMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu, showMoreMenu]);

  const isActivePath = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  // ==========================================
  // CONFIGURATION DES MENUS
  // ==========================================
  const visibleItems = [
    { path: '/dashboard', icon: Home, label: 'Tableau de bord' },
    { path: '/documents', icon: FileText, label: 'Documents' },
    { path: '/upload', icon: Upload, label: 'Upload' },
  ];

  const moreItems = {
    navigation: [
      { path: '/archives', icon: Archive, label: 'Archives', desc: 'Documents archivés' },
      { path: '/workflow-dashboard', icon: BarChart3, label: 'Workflow', desc: 'Tableau de bord workflow' },
      { path: '/chat', icon: MessageSquare, label: 'Discussion', desc: 'Canaux, messages directs, discussions' },
    ],
    gestion: [
      { path: '/schedules', icon: Calendar, label: 'Plannings', desc: 'Gérer les plannings', managementOnly: true },
      { path: '/employees', icon: Users, label: 'Employés', desc: 'Fiches des employés', rhOrAdminOnly: true },
      { path: '/user-management', icon: Users, label: 'Utilisateurs', desc: 'Comptes & rôles', adminOnly: true },
      { path: '/services', icon: LayoutGrid, label: 'Services', desc: 'Structure de l\'hôpital', adminOnly: true },
      { path: '/admin/droits-acces', icon: Shield, label: 'Droits d\'accès', desc: 'Matrice & gestion des droits', adminOnly: true },
      { path: '/audit-log', icon: Shield, label: 'Journal d\'audit', desc: 'Historique des actions', adminOnly: true },
      { path: '/statistiques', icon: BarChart3, label: 'Statistiques', desc: 'Graphiques & tendances', adminOnly: true },
      { path: '/workflow-templates', icon: LayoutGrid, label: 'Modeles workflow', desc: 'Circuits de validation', adminOnly: true },
      { path: '/forms', icon: Grid, label: 'Formulaires', desc: 'Créateur de formulaires', adminOnly: true },
    ],
    apps: [
      { path: '/portail', icon: UserPlus, label: 'Portail', desc: 'Gestion des entrées', gardienOnly: true },
      { path: '/accueil', icon: DoorOpen, label: 'Accueil', desc: 'Enregistrement patients', accueilOnly: true },
      { path: '/caisse', icon: DollarSign, label: 'Caisse', desc: 'Paiements & reçus', caisseOnly: true },
      { path: '/demandes-achat', icon: ShoppingCart, label: 'Demandes d\'Achat', desc: 'Commandes & achats', demandeAchatOnly: true },
      { path: '/php', icon: Stethoscope, label: 'Module PHP', desc: 'Gestion clinique', phpOnly: true },
      { path: '/php/factures', icon: Receipt, label: 'Factures PHP', desc: 'Factures prestataires (OCR)', phpOnly: true },
      { path: '/sage-factures-php', icon: FileSpreadsheet, label: 'Factures PHP (Sage)', desc: 'Import automatique depuis Sage', adminOnly: true },
      { path: '/compta', icon: Calculator, label: 'Comptabilité', desc: 'Pièces de caisse (OCR)', comptaOnly: true },
    ],
    outils: [
      { path: '/kanban/MG', icon: Kanban, label: 'Suivi Technique', desc: 'Tickets techniques', kanbanOnly: true },
      { path: '/invoices', icon: Receipt, label: 'Factures', desc: 'Facturation', managementOnly: true },
      { path: '/gmao', icon: Wrench, label: 'GMAO', desc: 'Maintenance équipements', gmaoOnly: true },
    ],
  };

  const gestionItems = moreItems.gestion;
  const appsItems = moreItems.apps;
  const toolsItems = moreItems.outils;

  // ==========================================
  // LOGIQUE DE PERMISSIONS
  // ==========================================
  const canAccessItem = (item) => {
    if (item.adminOnly && user?.role !== 'admin') return false;

    if (item.kanbanOnly)      return user?.role === 'admin' || (user?.postes || []).includes('kanban');
    if (item.rhOrAdminOnly)   return user?.role === 'admin' || (user?.postes || []).includes('rh');
    if (item.gardienOnly)     return user?.role === 'admin' || user?.role === 'gardien';
    if (item.accueilOnly)     return user?.role === 'admin' || ['agent_accueil_php', 'agent_accueil_normal'].includes((user?.role || '').toLowerCase());
    if (item.caisseOnly)      return user?.role === 'admin' || user?.role === 'caissier';
    if (item.managementOnly)  return ['admin', 'director', 'dds', 'medical_chief'].includes(user?.role);
    if (item.demandeAchatOnly) return user?.role === 'admin' || user?.role === 'achat' || user?.role === 'user';
    if (item.gmaoOnly)        return user?.role === 'admin' || (user?.postes || []).includes('gmao');
    if (item.phpOnly)         return user?.role === 'admin' || (user?.role || '').toLowerCase() === 'agent_accueil_php';
    if (item.comptaOnly)      return user?.role === 'admin' || (user?.postes || []).includes('comptable');

    return true;
  };

  const moreNavItems    = moreItems.navigation.filter(i => canAccessItem(i));
  const moreGestionItems = moreItems.gestion.filter(i => canAccessItem(i));
  const moreAppsItems   = moreItems.apps.filter(i => canAccessItem(i));
  const moreToolsItems  = moreItems.outils.filter(i => canAccessItem(i));
  const hasMoreItems = moreNavItems.length + moreGestionItems.length + moreAppsItems.length + moreToolsItems.length > 0;

  const userInitials = user
    ? ((user.firstName?.[0] || user.username?.[0] || '?') + (user.lastName?.[0] || '')).toUpperCase()
    : '?';
  const avatarBg = AVATAR_COLORS[(user?.username?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

  // ==========================================
  // STYLES RÉUTILISABLES
  // ==========================================
  const navBg = theme.bg;
  const pillBg = 'rgba(255,255,255,0.10)';
  const dropdownStyle = {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-4)',
    boxShadow: 'var(--shadow-3)',
    border: '1px solid var(--border)',
    backdropFilter: 'blur(16px)',
  };

  // Helper : render une section du menu « Plus »
  const renderMoreSection = (label, items, closeMenu) => {
    if (items.length === 0) return null;
    return (
      <div>
        <div style={{ padding: '6px 16px', fontSize: 10, fontWeight: 600, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(item.path);
          return (
            <Link key={item.path} to={item.path} onClick={closeMenu}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '8px 16px', margin: '0 4px', borderRadius: 'var(--radius-3)',
                textDecoration: 'none',
                background: active ? 'var(--brand-soft)' : 'transparent',
                transition: 'background .15s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--surface-2)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{
                padding: 6, borderRadius: 'var(--radius-2)',
                background: active ? 'var(--brand-soft)' : 'var(--surface-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon style={{ width: 14, height: 14, color: active ? 'var(--brand)' : 'var(--fg-muted)' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: active ? 'var(--brand)' : 'var(--fg)' }}>{item.label}</div>
                {item.desc && <div style={{ fontSize: 11, color: 'var(--fg-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.desc}</div>}
              </div>
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 40,
      background: navBg,
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255,255,255,0.10)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      transition: 'background .3s',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>

          {/* ========== LOGO ========== */}
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <div style={{
                background: 'rgba(255,255,255,0.15)', padding: 6, borderRadius: 'var(--radius-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background .2s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              >
                <Activity style={{ width: 20, height: 20, color: '#fff' }} />
              </div>
              <div style={{ display: 'none' }} className="sm-show" >
                <span style={{ color: '#fff', fontSize: 15, fontWeight: 600, letterSpacing: '-0.3px', lineHeight: 1 }}>GED</span>
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, display: 'block', marginTop: 2 }}>HSJM Workflow</span>
              </div>
            </Link>
          </div>

          {/* ========== CENTRE : items + « Plus » — desktop uniquement ========== */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '0 16px' }} className="desktop-nav">
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: pillBg, borderRadius: 999, padding: 4 }}>
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = isActivePath(item.path);
                return (
                  <Link key={item.path} to={item.path}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 16px', borderRadius: 999,
                      fontSize: 13, fontWeight: 500,
                      textDecoration: 'none',
                      background: active ? '#fff' : 'transparent',
                      color: active ? navBg : 'rgba(255,255,255,0.80)',
                      boxShadow: active ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                      transition: 'background .2s, color .2s',
                    }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = '#fff'; } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.80)'; } }}
                  >
                    <Icon style={{ width: 14, height: 14, flexShrink: 0 }} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {/* Menu « Plus » */}
              {hasMoreItems && (
                <div className="more-menu-container"
                  style={{ position: 'relative', paddingBottom: 12, marginBottom: -12 }}
                  onMouseEnter={() => setShowMoreMenu(true)}
                  onMouseLeave={() => setShowMoreMenu(false)}
                >
                  <button style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 16px', borderRadius: 999,
                    fontSize: 13, fontWeight: 500,
                    background: 'transparent', color: 'rgba(255,255,255,0.80)',
                    border: 'none', cursor: 'pointer',
                    transition: 'background .2s, color .2s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.80)'; }}
                  >
                    <Grid style={{ width: 14, height: 14 }} />
                    <span>Plus</span>
                    <ChevronDown style={{ width: 12, height: 12, transition: 'transform .2s', transform: showMoreMenu ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                  </button>

                  {showMoreMenu && (
                    <div style={{
                      position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                      marginTop: 0, paddingTop: 8, width: 320, zIndex: 50,
                    }}>
                      <div className="animate-fadeIn" style={{ ...dropdownStyle, padding: '8px 0', maxHeight: '75vh', overflowY: 'auto' }}>
                        {renderMoreSection('Navigation', moreNavItems, () => setShowMoreMenu(false))}
                        {moreGestionItems.length > 0 && moreNavItems.length > 0 && <div style={{ height: 1, background: 'var(--border)', margin: '4px 16px' }} />}
                        {renderMoreSection('Gestion', moreGestionItems, () => setShowMoreMenu(false))}
                        {moreAppsItems.length > 0 && <div style={{ height: 1, background: 'var(--border)', margin: '4px 16px' }} />}
                        {renderMoreSection('Applications', moreAppsItems, () => setShowMoreMenu(false))}
                        {moreToolsItems.length > 0 && <div style={{ height: 1, background: 'var(--border)', margin: '4px 16px' }} />}
                        {renderMoreSection('Outils', moreToolsItems, () => setShowMoreMenu(false))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ========== DROITE : icônes — desktop ========== */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="desktop-nav">
            <GlobalSearch />

            {/* Mes Tâches */}
            <Link to="/my-tasks" title="Mes tâches"
              style={{
                position: 'relative', padding: 8, borderRadius: 'var(--radius-3)',
                color: 'rgba(255,255,255,0.70)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background .2s, color .2s', textDecoration: 'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.70)'; }}
            >
              <CheckSquare style={{ width: 18, height: 18 }} className={hasNewTask ? 'animate-bounce' : ''} />
              {pendingCount > 0 && (
                <span style={{
                  position: 'absolute', top: -2, right: -2,
                  background: '#ef4444', color: '#fff',
                  fontSize: 10, fontWeight: 700,
                  borderRadius: 999, minWidth: 18, height: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px',
                }} className={hasNewTask ? 'animate-pulse' : ''}>
                  {pendingCount}
                </span>
              )}
            </Link>

            {/* Notifications */}
            <button title="Notifications" style={{
              padding: 8, borderRadius: 'var(--radius-3)',
              color: 'rgba(255,255,255,0.70)',
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background .2s, color .2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.70)'; }}
            >
              <Bell style={{ width: 18, height: 18 }} />
            </button>

            {/* Indicateur de synchronisation offline */}
            <div style={{ display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.80)' }}>
              <SyncStatus />
            </div>

            <ThemeToggle />

            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.20)', margin: '0 4px' }} />

            {/* Avatar utilisateur */}
            <div className="user-menu-container" style={{ position: 'relative' }}>
              <button onClick={() => setShowUserMenu(!showUserMenu)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  paddingLeft: 4, paddingRight: 8, paddingTop: 4, paddingBottom: 4,
                  borderRadius: 'var(--radius-3)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  transition: 'background .2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.10)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 'var(--radius-2)',
                  background: avatarBg, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}>
                  {userInitials}
                </div>
                <ChevronDown style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.50)', transition: 'transform .2s', transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              </button>

              {showUserMenu && (
                <div className="animate-fadeIn" style={{ position: 'absolute', right: 0, marginTop: 8, width: 288, zIndex: 50, overflow: 'hidden', ...dropdownStyle }}>
                  {/* En-tête profil */}
                  <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-3)', background: avatarBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                      {userInitials}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 600, color: 'var(--fg)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{user?.username}</p>
                      <p style={{ fontSize: 11, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{user?.email}</p>
                      <span style={{
                        display: 'inline-block', marginTop: 2,
                        fontSize: 10, fontWeight: 500,
                        background: 'var(--brand-soft)', color: 'var(--brand)',
                        padding: '2px 8px', borderRadius: 999,
                      }}>{getRoleLabel(user?.role)}</span>
                    </div>
                  </div>

                  {/* Statut présence */}
                  <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                    <button
                      onClick={handleToggleMyAbsence}
                      disabled={togglingAbsence}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 12px', borderRadius: 'var(--radius-3)', border: 'none', cursor: togglingAbsence ? 'not-allowed' : 'pointer',
                        background: user?.isAbsent ? 'var(--warning-soft)' : '#dcfce7',
                        opacity: togglingAbsence ? 0.6 : 1,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 600, color: user?.isAbsent ? 'var(--warning)' : '#166534' }}>
                        {user?.isAbsent ? '🔴 Absent — cliquer pour repasser en ligne' : '🟢 En ligne — cliquer pour se mettre absent'}
                      </span>
                    </button>
                  </div>

                  {/* Liens menu */}
                  <div style={{ padding: 8 }}>
                    {[
                      { to: '/parametres/notifications', icon: Bell, label: 'Notifications', sub: 'Gérer vos alertes' },
                      { to: '/settings', icon: Settings, label: 'Paramètres', sub: 'Configuration' },
                    ].map(({ to, icon: Icon, label, sub }) => (
                      <Link key={to} to={to} onClick={() => setShowUserMenu(false)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 12px', borderRadius: 'var(--radius-3)',
                          textDecoration: 'none', transition: 'background .15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ padding: 6, background: 'var(--surface-2)', borderRadius: 'var(--radius-2)', display: 'flex' }}>
                          <Icon style={{ width: 14, height: 14, color: 'var(--fg-muted)' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{label}</div>
                          <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{sub}</div>
                        </div>
                      </Link>
                    ))}

                    <div style={{ height: 1, background: 'var(--border)', margin: '6px 12px' }} />

                    {/* Couleur de la barre */}
                    <div style={{ padding: '8px 12px' }}>
                      <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, margin: '0 0 8px' }}>Couleur de la barre</p>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {Object.entries(themes).map(([key, t]) => (
                          <button key={key} onClick={() => setThemeName(key)} title={t.label}
                            style={{
                              width: 24, height: 24, borderRadius: '50%',
                              background: t.dot, border: 'none', cursor: 'pointer',
                              outline: themeName === key ? `2px solid ${t.dot}` : 'none',
                              outlineOffset: 2,
                              transform: themeName === key ? 'scale(1.15)' : 'scale(1)',
                              transition: 'transform .15s',
                            }}
                            onMouseEnter={e => { if (themeName !== key) e.currentTarget.style.transform = 'scale(1.10)'; }}
                            onMouseLeave={e => { if (themeName !== key) e.currentTarget.style.transform = 'scale(1)'; }}
                          />
                        ))}
                      </div>
                    </div>

                    <div style={{ height: 1, background: 'var(--border)', margin: '6px 12px' }} />

                    {/* Déconnexion */}
                    <button onClick={() => { setShowUserMenu(false); onLogout(); }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 12px', borderRadius: 'var(--radius-3)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--danger)', transition: 'background .15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-soft)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <div style={{ padding: 6, background: 'var(--danger-soft)', borderRadius: 'var(--radius-2)', display: 'flex' }}>
                        <LogOut style={{ width: 14, height: 14, color: 'var(--danger)' }} />
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>Déconnexion</div>
                        <div style={{ fontSize: 11, opacity: 0.6 }}>Se déconnecter</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========== MOBILE BUTTON ========== */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} className="mobile-nav">
            {pendingCount > 0 && (
              <Link to="/my-tasks" style={{ position: 'relative', padding: 8, display: 'flex', textDecoration: 'none' }} onClick={() => setIsOpen(false)}>
                <Bell style={{ width: 20, height: 20, color: '#fff' }} />
                <span style={{ position: 'absolute', top: -2, right: -2, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 999, height: 16, width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{pendingCount}</span>
              </Link>
            )}
            <ThemeToggle />
            <button onClick={() => setIsOpen(!isOpen)}
              style={{ padding: 8, borderRadius: 'var(--radius-3)', color: '#fff', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'background .15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.10)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {isOpen ? <X style={{ width: 20, height: 20 }} /> : <Menu style={{ width: 20, height: 20 }} />}
            </button>
          </div>
        </div>

        {/* ========== MOBILE MENU ========== */}
        {isOpen && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.10)', paddingBottom: 16 }} className="mobile-nav">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 12 }}>
              {[...visibleItems, ...moreNavItems].map((item) => {
                const Icon = item.icon;
                const active = isActivePath(item.path);
                return (
                  <Link key={item.path} to={item.path} onClick={() => setIsOpen(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 12px', borderRadius: 'var(--radius-3)',
                      fontSize: 13, fontWeight: 500, textDecoration: 'none',
                      background: active ? 'rgba(255,255,255,0.20)' : 'transparent',
                      color: active ? '#fff' : 'rgba(255,255,255,0.80)',
                      transition: 'background .15s, color .15s',
                    }}
                  >
                    <Icon style={{ width: 16, height: 16 }} /><span>{item.label}</span>
                  </Link>
                );
              })}

              {[
                { label: 'Gestion', items: moreGestionItems },
                { label: 'Applications', items: moreAppsItems },
                { label: 'Outils', items: moreToolsItems },
              ].map(({ label, items }) => items.length === 0 ? null : (
                <div key={label} style={{ paddingTop: 8, marginTop: 4 }}>
                  <div style={{ padding: '6px 12px', color: 'rgba(255,255,255,0.40)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2 }}>{label}</div>
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = isActivePath(item.path);
                    return (
                      <Link key={item.path} to={item.path} onClick={() => setIsOpen(false)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 12px', borderRadius: 'var(--radius-3)',
                          fontSize: 13, fontWeight: 500, textDecoration: 'none',
                          background: active ? 'rgba(255,255,255,0.20)' : 'transparent',
                          color: active ? '#fff' : 'rgba(255,255,255,0.80)',
                          transition: 'background .15s, color .15s',
                        }}
                      >
                        <Icon style={{ width: 16, height: 16 }} /><span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}

              <div style={{ paddingTop: 8, marginTop: 4, borderTop: '1px solid rgba(255,255,255,0.10)' }}>
                <button onClick={() => { setIsOpen(false); onLogout(); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 'var(--radius-3)',
                    fontSize: 13, fontWeight: 500,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#fca5a5', transition: 'background .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.20)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <LogOut style={{ width: 16, height: 16 }} /><span>Déconnexion</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
