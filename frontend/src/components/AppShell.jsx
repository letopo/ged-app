// frontend/src/components/AppShell.jsx
// Shell applicatif — Design System GED (premium SaaS, bleu marine)

import { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, FileText, Upload, CheckSquare, BarChart3, LogOut,
  Bell, Users, LayoutGrid, UserPlus, DoorOpen, DollarSign,
  Settings, ChevronDown, Calendar, Kanban, Receipt,
  ShoppingCart, Wrench, Stethoscope, Shield, Archive,
  Search, Sun, Moon, GitBranch, Menu, MoreHorizontal,
  Activity, X, ChevronRight, ClipboardList,
} from 'lucide-react';
import { workflowAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import GlobalSearch from './GlobalSearch';

/* ─── Helpers ──────────────────────────────────────────────────────── */

const getRoleLabel = (role) => ({
  user:                 'Utilisateur',
  validator:            'Validateur',
  director:             'Directeur',
  admin:                'Administrateur',
  gardien:              'Gardien',
  agent_accueil_php:    'Point Focal PHP',
  agent_accueil_normal: 'Agent Accueil',
  caissier:             'Caissier',
  chef_de_service:      'Chef de Service',
  dds:                  'Directrice des Soins',
  medical_chief:        'Médecin Chef',
}[role] || role);

/* ─── Wordmark mark SVG ────────────────────────────────────────────── */

const GedMark = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="6" y="10" width="42" height="48" rx="4" fill="#1B3A6B" opacity="0.18" />
    <rect x="11" y="4" width="42" height="48" rx="4" fill="var(--brand)" />
    <path d="M43 4 L53 14 L43 14 Z" fill="var(--brand-active,#0F2340)" />
    <path d="M19 32 C 25 24, 31 38, 37 32 C 40 28, 43 30, 46 28"
      stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ─── NavItem ──────────────────────────────────────────────────────── */

const NavItem = ({ icon: Icon, label, to, active, badge, urgent, onClick }) => (
  <Link
    to={to || '#'}
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      width: '100%',
      padding: '6px 10px',
      borderRadius: 'var(--radius-2)',
      background: active ? 'var(--surface-2)' : 'transparent',
      color: active ? 'var(--fg)' : 'var(--fg-muted)',
      fontSize: 13,
      fontWeight: active ? 600 : 500,
      cursor: 'pointer',
      textDecoration: 'none',
      transition: 'background 120ms var(--ease), color 120ms var(--ease)',
      position: 'relative',
    }}
    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--fg)'; } }}
    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fg-muted)'; } }}
  >
    {/* Barre active gauche */}
    {active && (
      <span style={{
        position: 'absolute', left: -10, top: '50%', transform: 'translateY(-50%)',
        width: 3, height: 16, background: 'var(--brand)', borderRadius: '0 2px 2px 0',
      }} />
    )}
    {Icon && <Icon size={16} strokeWidth={1.5} style={{ flexShrink: 0, color: active ? 'var(--brand)' : 'currentColor' }} />}
    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
    {badge != null && badge > 0 && (
      <span style={{
        fontSize: 10, fontWeight: 700,
        background: urgent ? 'var(--warning)' : (active ? 'var(--surface-3)' : 'var(--surface-3)'),
        color: urgent ? '#fff' : 'var(--fg-muted)',
        borderRadius: 'var(--radius-full)',
        minWidth: 18, height: 18,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 5px',
        fontFamily: 'var(--font-mono)',
      }}>{badge}</span>
    )}
  </Link>
);

/* ─── NavSection ───────────────────────────────────────────────────── */

const NavSection = ({ title, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 16 }}>
    {title && (
      <div style={{
        fontSize: 10.5, fontWeight: 600, color: 'var(--fg-subtle)',
        letterSpacing: '0.06em', textTransform: 'uppercase',
        padding: '0 10px', marginBottom: 4,
        fontFamily: 'var(--font-mono)',
      }}>{title}</div>
    )}
    {children}
  </div>
);

/* ─── Sidebar ──────────────────────────────────────────────────────── */

const Sidebar = ({ user, onLogout, pendingCount }) => {
  const location = useLocation();
  const isActive = (path) =>
    location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path + '/'));

  const canAccess = (item) => {
    if (!user) return false;
    if (item.adminOnly && user.role !== 'admin') return false;
    if (item.kanbanOnly) {
      const allowed = ['hsjm.directeurdusoutien@gmail.com','hsjm.pharma@gmail.com','hopitalcameroun@ordredemaltefrance.org','aureleyankeu@gmail.com','hsjm.moyengeneraux@gmail.com','hsjm.celluleinformatique2@gmail.com','hsjm.cellulebiomedicale@gmail.com'];
      if (allowed.includes(user.email)) return true;
      const svc = user.Service?.name || user.service || '';
      return ['MG','Moyens Généraux','Informatique','Biomédical','Biomedical'].some(s => svc.includes(s));
    }
    if (item.rhOrAdminOnly) return user.role === 'admin' || user.email === 'hsjm.rh@gmail.com';
    if (item.gardienOnly) return user.role === 'admin' || user.role === 'gardien';
    if (item.accueilOnly) return user.role === 'admin' || ['agent_accueil_php','agent_accueil_normal'].includes(user.role);
    if (item.caisseOnly) return user.role === 'admin' || user.role === 'caissier';
    if (item.managementOnly) return ['admin','director','dds','medical_chief'].includes(user.role);
    if (item.demandeAchatOnly) return ['admin','achat','user'].includes(user.role);
    if (item.gmaoOnly) return user.role === 'admin' || ['hsjm.cellulebiomedicale@gmail.com','hsjm.pharma@gmail.com','hopitalcameroun@ordredemaltefrance.org'].includes(user.email);
    if (item.phpOnly) return user.role === 'admin' || user.role === 'agent_accueil_php';
    return true;
  };

  const orgName = user?.Service?.name
    ? user.Service.name.substring(0, 4).toUpperCase()
    : 'HSJM';

  const gestionItems = [
    { path: '/schedules',          icon: Calendar,    label: 'Plannings',        managementOnly: true },
    { path: '/employees',          icon: Users,       label: 'Employés',         rhOrAdminOnly: true },
    { path: '/user-management',    icon: Users,       label: 'Utilisateurs',     adminOnly: true },
    { path: '/services',           icon: LayoutGrid,  label: 'Services',         adminOnly: true },
    { path: '/audit-log',          icon: Shield,      label: "Journal d'audit",  adminOnly: true },
    { path: '/statistiques',       icon: BarChart3,   label: 'Statistiques',     adminOnly: true },
    { path: '/workflow-templates', icon: LayoutGrid,    label: 'Modèles workflow', adminOnly: true },
    { path: '/forms',              icon: ClipboardList, label: 'Formulaires',      adminOnly: true },
  ].filter(canAccess);

  const appsItems = [
    { path: '/portail',         icon: UserPlus,    label: 'Portail',            gardienOnly: true },
    { path: '/accueil',         icon: DoorOpen,    label: 'Accueil',            accueilOnly: true },
    { path: '/caisse',          icon: DollarSign,  label: 'Caisse',             caisseOnly: true },
    { path: '/demandes-achat',  icon: ShoppingCart,label: "Demandes d'achat",   demandeAchatOnly: true },
    { path: '/php',             icon: Stethoscope, label: 'Module PHP',         phpOnly: true },
  ].filter(canAccess);

  const toolsItems = [
    { path: '/kanban/MG', icon: Kanban,   label: 'Suivi technique', kanbanOnly: true },
    { path: '/invoices',  icon: Receipt,  label: 'Factures',        managementOnly: true },
    { path: '/gmao',      icon: Wrench,   label: 'GMAO',            gmaoOnly: true },
  ].filter(canAccess);

  const initials = ((user?.firstName?.[0] || user?.username?.[0] || '?') + (user?.lastName?.[0] || '')).toUpperCase();

  return (
    <aside style={{
      width: 240,
      flexShrink: 0,
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* ── Brand ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 16px 14px',
        borderBottom: '1px solid var(--border)',
        marginBottom: 6, flexShrink: 0,
      }}>
        <GedMark size={26} />
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px', color: 'var(--fg)', lineHeight: 1 }}>GED</div>
        <div style={{ marginLeft: 'auto' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 3,
            padding: '3px 8px', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-2)', fontSize: 11,
            color: 'var(--fg-muted)', cursor: 'pointer',
          }}>
            {orgName} <ChevronDown size={10} />
          </div>
        </div>
      </div>

      {/* ── Recherche ⌘K ── */}
      <div style={{ padding: '0 10px', marginBottom: 8, flexShrink: 0 }}>
        <div
          onClick={() => window.dispatchEvent(new Event('global-search:open'))}
          style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 10px', background: 'var(--surface-2)',
          border: '1px solid transparent', borderRadius: 'var(--radius-2)',
          fontSize: 13, color: 'var(--fg-subtle)', cursor: 'pointer',
        }}>
          <Search size={14} strokeWidth={1.5} />
          <span style={{ flex: 1 }}>Rechercher…</span>
          <kbd style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            padding: '1px 5px', border: '1px solid var(--border)',
            borderRadius: 4, background: 'var(--surface)', color: 'var(--fg-muted)',
          }}>⌘K</kbd>
        </div>
      </div>

      {/* ── Navigation ── */}
      <div style={{ padding: '0 10px', overflowY: 'auto', flex: 1 }}>
        <NavSection title="Travail">
          <NavItem icon={Home}        label="Tableau de bord"  to="/dashboard"           active={isActive('/dashboard')} />
          <NavItem icon={FileText}    label="Documents"        to="/documents"            active={isActive('/documents')} />
          <NavItem icon={Upload}      label="Upload"           to="/upload"               active={isActive('/upload')} />
          <NavItem icon={Archive}     label="Archives"         to="/archives"             active={isActive('/archives')} />
          <NavItem icon={CheckSquare} label="Mes tâches"       to="/my-tasks"             active={isActive('/my-tasks')} badge={pendingCount} urgent={pendingCount > 0} />
          <NavItem icon={GitBranch}   label="Workflow"         to="/workflow-dashboard"   active={isActive('/workflow-dashboard')} />
        </NavSection>

        {(gestionItems.length > 0 || appsItems.length > 0 || toolsItems.length > 0) && (
          <NavSection title="Organisation">
            {gestionItems.map(item => (
              <NavItem key={item.path} icon={item.icon} label={item.label} to={item.path} active={isActive(item.path)} />
            ))}
            {appsItems.map(item => (
              <NavItem key={item.path} icon={item.icon} label={item.label} to={item.path} active={isActive(item.path)} />
            ))}
            {toolsItems.map(item => (
              <NavItem key={item.path} icon={item.icon} label={item.label} to={item.path} active={isActive(item.path)} />
            ))}
          </NavSection>
        )}

        <NavSection title="Système">
          <NavItem icon={Settings} label="Paramètres" to="/settings" active={isActive('/settings')} />
        </NavSection>
      </div>

      {/* ── Utilisateur ── */}
      <div style={{ padding: '10px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px', borderRadius: 'var(--radius-2)',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 'var(--radius-full)',
            background: 'var(--brand)', color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 600, flexShrink: 0,
          }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.firstName || user?.username}
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{getRoleLabel(user?.role)}</div>
          </div>
          <button
            onClick={onLogout}
            title="Déconnexion"
            style={{ padding: 4, border: 'none', background: 'transparent', color: 'var(--fg-muted)', cursor: 'pointer', borderRadius: 4 }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'var(--danger-soft)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-muted)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
};

/* ─── Topbar ───────────────────────────────────────────────────────── */

const ROUTE_CRUMBS = {
  '/dashboard':           ['Tableau de bord'],
  '/documents':           ['Documents'],
  '/upload':              ['Documents', 'Nouvel upload'],
  '/archives':            ['Archives'],
  '/my-tasks':            ['Mes tâches'],
  '/workflow-dashboard':  ['Workflow'],
  '/settings':            ['Paramètres'],
  '/invoices':            ['Outils', 'Factures'],
  '/statistiques':        ['Statistiques'],
  '/user-management':     ['Organisation', 'Utilisateurs'],
  '/schedules':           ['Organisation', 'Plannings'],
  '/employees':           ['Organisation', 'Employés'],
  '/services':            ['Organisation', 'Services'],
  '/audit-log':           ['Organisation', "Journal d'audit"],
  '/workflow-templates':  ['Organisation', 'Modèles workflow'],
  '/forms':               ['Organisation', 'Formulaires'],
  '/portail':             ['Applications', 'Portail'],
  '/accueil':             ['Applications', 'Accueil'],
  '/caisse':              ['Applications', 'Caisse'],
  '/demandes-achat':      ['Applications', "Demandes d'achat"],
  '/kanban':              ['Outils', 'Suivi technique'],
  '/gmao':                ['Outils', 'GMAO'],
  '/php':                 ['Module PHP'],
};

const Topbar = ({ onToggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const [search, setSearch] = useState('');

  const crumbs = Object.entries(ROUTE_CRUMBS).find(([path]) =>
    location.pathname === path || location.pathname.startsWith(path + '/')
  )?.[1] || ['GED'];

  const handleSearch = (e) => {
    if (e.key === 'Enter' && search.trim()) {
      navigate(`/documents?q=${encodeURIComponent(search.trim())}`);
      setSearch('');
    }
  };

  const iconBtnStyle = {
    width: 32, height: 32, borderRadius: 'var(--radius-2)',
    border: '1px solid transparent', background: 'transparent',
    color: 'var(--fg-muted)', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 120ms',
  };

  return (
    <header style={{
      height: 53, flexShrink: 0,
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface)',
      display: 'flex', alignItems: 'center',
      padding: '0 24px', gap: 12,
      position: 'sticky', top: 0, zIndex: 20,
    }}>
      {/* Menu toggle (mobile) */}
      <button
        className="lg:hidden"
        onClick={onToggleSidebar}
        style={{ ...iconBtnStyle, border: '1px solid var(--border)' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <Menu size={15} />
      </button>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--fg-muted)' }}>
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <ChevronRight size={12} style={{ opacity: 0.4 }} />}
            {i === crumbs.length - 1
              ? <strong style={{ color: 'var(--fg)', fontWeight: 600 }}>{c}</strong>
              : <span>{c}</span>}
          </span>
        ))}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Recherche */}
      <div style={{ position: 'relative', width: 220 }} className="hidden md:block">
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)', pointerEvents: 'none' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={handleSearch}
          placeholder="Rechercher…"
          style={{
            width: '100%', boxSizing: 'border-box',
            font: '400 12.5px/1 var(--font-sans)',
            padding: '7px 12px 7px 30px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-2)',
            background: 'var(--surface-2)',
            color: 'var(--fg)', outline: 'none',
            transition: 'border-color 120ms',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.background = 'var(--surface)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface-2)'; }}
        />
      </div>

      {/* Thème */}
      <button
        onClick={toggleTheme}
        title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
        style={iconBtnStyle}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
      </button>

      {/* Notifications */}
      <button
        title="Notifications"
        style={{ ...iconBtnStyle, position: 'relative' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <Bell size={15} />
        <span style={{
          position: 'absolute', top: 7, right: 7,
          width: 6, height: 6, borderRadius: '9999px',
          background: 'var(--warning)', border: '1.5px solid var(--surface)',
        }} />
      </button>
    </header>
  );
};

/* ─── Mobile bottom tab bar ────────────────────────────────────────── */

const MobileTabBar = ({ pendingCount, onMore }) => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const tabs = [
    { to: '/dashboard',  icon: Home,        label: 'Accueil' },
    { to: '/documents',  icon: FileText,    label: 'Documents' },
    { to: '/my-tasks',   icon: CheckSquare, label: 'Tâches', badge: pendingCount },
    { to: '/statistiques', icon: BarChart3, label: 'Stats' },
  ];

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      zIndex: 120,
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      padding: '6px 4px calc(6px + env(safe-area-inset-bottom, 0px))',
      display: 'flex', justifyContent: 'space-around',
      boxShadow: '0 -1px 3px rgba(15,27,45,0.04)',
    }}>
      {tabs.map(t => {
        const active = isActive(t.to);
        return (
          <Link key={t.to} to={t.to} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 3, padding: '6px 2px',
            color: active ? 'var(--brand)' : 'var(--fg-muted)',
            textDecoration: 'none', position: 'relative',
            fontSize: 10.5, fontWeight: 500,
          }}>
            <t.icon size={20} strokeWidth={active ? 2 : 1.5} />
            {t.badge > 0 && (
              <span style={{
                position: 'absolute', top: 2, left: 'calc(50% + 6px)',
                minWidth: 15, height: 15, padding: '0 4px',
                background: 'var(--warning)', color: '#fff',
                borderRadius: 9, fontSize: 9, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1.5px solid var(--surface)',
              }}>{t.badge}</span>
            )}
            <span>{t.label}</span>
          </Link>
        );
      })}
      {/* Plus */}
      <button onClick={onMore} style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 3, padding: '6px 2px',
        background: 'none', border: 'none',
        color: 'var(--fg-muted)', fontSize: 10.5, fontWeight: 500, cursor: 'pointer',
      }}>
        <MoreHorizontal size={20} strokeWidth={1.5} />
        <span>Plus</span>
      </button>
    </nav>
  );
};

/* ─── Mobile "Plus" sheet ──────────────────────────────────────────── */

const MoreSheet = ({ onClose }) => {
  const MORE_ITEMS = [
    { to: '/upload',           icon: Upload,      label: 'Upload' },
    { to: '/workflow-dashboard', icon: GitBranch, label: 'Workflow' },
    { to: '/archives',         icon: Archive,     label: 'Archives' },
    { to: '/services',         icon: LayoutGrid,  label: 'Services' },
    { to: '/user-management',  icon: Users,       label: 'Utilisateurs' },
    { to: '/settings',         icon: Settings,    label: 'Paramètres' },
  ];
  const location = useLocation();

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 130,
        background: 'var(--overlay, rgba(15,27,45,0.4))',
        display: 'flex', alignItems: 'flex-end',
        animation: 'fadeIn 200ms ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', background: 'var(--surface)',
          borderRadius: '16px 16px 0 0',
          padding: '8px 12px calc(20px + env(safe-area-inset-bottom, 0px))',
          boxShadow: 'var(--shadow-3)',
          animation: 'sheetUp 260ms cubic-bezier(0.4,0,0.2,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ width: 36, height: 4, background: 'var(--border-strong)', borderRadius: 2, margin: '8px auto 12px' }} />
        {MORE_ITEMS.map(item => {
          const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
          return (
            <Link key={item.to} to={item.to} onClick={onClose} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 10px', borderRadius: 'var(--radius-2)',
              fontSize: 15, fontWeight: 500,
              color: active ? 'var(--brand)' : 'var(--fg)',
              background: active ? 'var(--brand-soft)' : 'transparent',
              textDecoration: 'none',
            }}>
              <item.icon size={18} strokeWidth={1.5} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

/* ─── AppShell ─────────────────────────────────────────────────────── */

export default function AppShell({ onLogout }) {
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setMobileOpen(false); setSheetOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const res = await workflowAPI.getMyTasks('pending');
        setPendingCount(res.data.tasks?.length || 0);
      } catch {}
    };
    load();
    const newTaskHandler = () => { setPendingCount(p => p + 1); setTimeout(load, 1000); };
    const updateHandler = () => setTimeout(load, 1000);
    window.addEventListener('newTask', newTaskHandler);
    window.addEventListener('taskUpdate', updateHandler);
    const interval = setInterval(load, 120000);
    return () => {
      window.removeEventListener('newTask', newTaskHandler);
      window.removeEventListener('taskUpdate', updateHandler);
      clearInterval(interval);
    };
  }, [user]);

  return (
    <div style={{
      display: 'flex', height: '100vh',
      background: 'var(--bg)',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* ── Sidebar desktop ── */}
      <div className="hidden lg:flex" style={{ height: '100vh', position: 'sticky', top: 0 }}>
        <Sidebar user={user} onLogout={onLogout} pendingCount={pendingCount} />
      </div>

      {/* ── Overlay sidebar mobile ── */}
      {mobileOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(15,27,45,0.4)', backdropFilter: 'blur(2px)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar mobile (drawer) ── */}
      <div className="lg:hidden" style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
        transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s var(--ease)',
        width: 240,
      }}>
        <Sidebar user={user} onLogout={onLogout} pendingCount={pendingCount} />
      </div>

      {/* ── Colonne principale ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <Topbar onToggleSidebar={() => setMobileOpen(o => !o)} />
        <main
          key={location.pathname}
          className="animate-pageFade"
          style={{ flex: 1, overflow: 'auto', paddingBottom: 0 }}
        >
          <Outlet />
        </main>
      </div>

      {/* ── Barre mobile bas ── */}
      <div className="lg:hidden">
        <MobileTabBar pendingCount={pendingCount} onMore={() => setSheetOpen(true)} />
      </div>

      {/* ── Sheet "Plus" mobile ── */}
      {sheetOpen && <MoreSheet onClose={() => setSheetOpen(false)} />}

      {/* ── Recherche globale (⌘K + déclenchée par la barre sidebar) ── */}
      <GlobalSearch hideTrigger />
    </div>
  );
}
