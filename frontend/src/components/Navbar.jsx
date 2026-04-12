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
  User,
  ChevronDown,
  Calendar,
  Briefcase,
  Kanban,
  Grid,
  Receipt,
  ShoppingCart,
  Activity,
  Archive,
  Wrench,
  Stethoscope
} from 'lucide-react';
import { workflowAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';
import GlobalSearch from './GlobalSearch';
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

export default function Navbar({ onLogout }) {
  const { user } = useAuth();
  const location = useLocation();
  
  const [isOpen, setIsOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  
  const [pendingCount, setPendingCount] = useState(0);
  const [hasNewTask, setHasNewTask] = useState(false);
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

    const handleNewTask = (event) => {
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
      if (showUserMenu && !event.target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
      if (showMoreMenu && !event.target.closest('.more-menu-container')) {
        setShowMoreMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu, showMoreMenu]);

  const isActive = (path) => {
    if (path.startsWith('/kanban') && location.pathname.startsWith('/kanban')) {
      return 'bg-blue-700 dark:bg-blue-700';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/')
      ? 'bg-blue-700 dark:bg-blue-700'
      : '';
  };

  // ==========================================
  // CONFIGURATION DES MENUS
  // ==========================================

  // Items visibles directement sur la navbar
  const visibleItems = [
    { path: '/dashboard', icon: Home, label: 'Tableau de bord' },
    { path: '/documents', icon: FileText, label: 'Documents' },
    { path: '/upload', icon: Upload, label: 'Upload' },
  ];

  // Items dans le menu « Plus » — regroupés par sections
  const moreItems = {
    navigation: [
      { path: '/archives', icon: Archive, label: 'Archives', desc: 'Documents archivés' },
      { path: '/workflow-dashboard', icon: BarChart3, label: 'Workflow', desc: 'Tableau de bord workflow' },
    ],
    gestion: [
      { path: '/schedules', icon: Calendar, label: 'Plannings', desc: 'Gérer les plannings', managementOnly: true },
      { path: '/employees', icon: Users, label: 'Employés', desc: 'Fiches des employés', rhOrAdminOnly: true },
      { path: '/user-management', icon: Users, label: 'Utilisateurs', desc: 'Comptes & rôles', adminOnly: true },
      { path: '/services', icon: LayoutGrid, label: 'Services', desc: 'Structure de l\'hôpital', adminOnly: true },
    ],
    apps: [
      { path: '/portail', icon: UserPlus, label: 'Portail', desc: 'Gestion des entrées', gardienOnly: true },
      { path: '/accueil', icon: DoorOpen, label: 'Accueil', desc: 'Enregistrement patients', accueilOnly: true },
      { path: '/caisse', icon: DollarSign, label: 'Caisse', desc: 'Paiements & reçus', caisseOnly: true },
      { path: '/demandes-achat', icon: ShoppingCart, label: 'Demandes d\'Achat', desc: 'Commandes & achats', demandeAchatOnly: true },
      { path: '/php', icon: Stethoscope, label: 'Module PHP', desc: 'Gestion clinique', phpOnly: true },
    ],
    outils: [
      { path: '/kanban/MG', icon: Kanban, label: 'Suivi Technique', desc: 'Tickets techniques', kanbanOnly: true },
      { path: '/invoices', icon: Receipt, label: 'Factures', desc: 'Facturation', managementOnly: true },
      { path: '/gmao', icon: Wrench, label: 'GMAO', desc: 'Maintenance équipements', gmaoOnly: true },
    ],
  };

  // Compat — ancien format pour certains checks
  const gestionItems = moreItems.gestion;
  const appsItems = moreItems.apps;
  const toolsItems = moreItems.outils;

  // ==========================================
  // LOGIQUE DE PERMISSIONS
  // ==========================================
  const canAccessItem = (item) => {
    if (item.adminOnly && user?.role !== 'admin') return false;
    
    if (item.kanbanOnly) {
      if (!user) return false;
      const allowedEmails = [
        'hsjm.directeurdusoutien@gmail.com',
        'hsjm.pharma@gmail.com',
        'hopitalcameroun@ordredemaltefrance.org',
        'aureleyankeu@gmail.com',
        'hsjm.moyengeneraux@gmail.com',
        'hsjm.celluleinformatique2@gmail.com',
        'hsjm.cellulebiomedicale@gmail.com'
      ];
      
      if (allowedEmails.includes(user.email)) return true;
      const userService = user.Service?.name || user.service || "";
      const allowedServices = ['MG', 'Moyens Généraux', 'Informatique', 'Biomédical', 'Biomedical'];
      return allowedServices.some(service => userService.includes(service));
    }
    
    if (item.rhOrAdminOnly) {
      return user?.role === 'admin' || user?.email === 'hsjm.rh@gmail.com';
    }
    
    if (item.gardienOnly) {
      return user?.role === 'admin' || user?.role === 'gardien';
    }
    
    if (item.accueilOnly) {
      return user?.role === 'admin' || ['agent_accueil_php', 'agent_accueil_normal'].includes(user?.role);
    }
    
    if (item.caisseOnly) {
      return user?.role === 'admin' || user?.role === 'caissier';
    }
    
    if (item.managementOnly) {
      return ['admin', 'director', 'dds', 'medical_chief'].includes(user?.role);
    }

    if (item.demandeAchatOnly) {
      return user?.role === 'admin' || user?.role === 'achat' || user?.role === 'user';
    }

    if (item.gmaoOnly) {
      const GMAO_EMAILS = [
        'hsjm.cellulebiomedicale@gmail.com',
        'hsjm.pharma@gmail.com',
        'hopitalcameroun@ordredemaltefrance.org',
      ];
      return user?.role === 'admin' || GMAO_EMAILS.includes(user?.email);
    }

    // ── Module PHP : accessible aux agents PHP et admins ─────────────────────
    if (item.phpOnly) {
      return user?.role === 'admin' || user?.role === 'agent_accueil_php';
    }

    return true;
  };

  const hasGestionAccess = gestionItems.some(item => canAccessItem(item));
  const hasAppsAccess = appsItems.some(item => canAccessItem(item));
  const hasToolsAccess = toolsItems.some(item => canAccessItem(item));

  // Le menu « Plus » contient au moins les items navigation (Archives, Workflow) visibles par tous
  const moreNavItems = moreItems.navigation.filter(i => canAccessItem(i));
  const moreGestionItems = moreItems.gestion.filter(i => canAccessItem(i));
  const moreAppsItems = moreItems.apps.filter(i => canAccessItem(i));
  const moreToolsItems = moreItems.outils.filter(i => canAccessItem(i));
  const hasMoreItems = moreNavItems.length + moreGestionItems.length + moreAppsItems.length + moreToolsItems.length > 0;

  // Initiales utilisateur pour l'avatar
  const userInitials = user
    ? ((user.firstName?.[0] || user.username?.[0] || '?') + (user.lastName?.[0] || '')).toUpperCase()
    : '?';
  const avatarColors = ['bg-violet-500','bg-blue-500','bg-emerald-500','bg-rose-500','bg-amber-500','bg-cyan-500','bg-pink-500'];
  const avatarColor = avatarColors[(user?.username?.charCodeAt(0) || 0) % avatarColors.length];

  // Helper pour rendre une section du menu « Plus »
  const renderMoreSection = (label, items, closeMenu) => {
    if (items.length === 0) return null;
    return (
      <div>
        <div className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</div>
        {items.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <Link key={item.path} to={item.path} onClick={closeMenu}
              className={`flex items-center gap-3 px-4 py-2 transition-all mx-1 rounded-xl ${active ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
            >
              <div className={`p-1.5 rounded-lg ${active ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-700'}`}>
                <Icon className={`w-4 h-4 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
              </div>
              <div className="min-w-0">
                <div className={`text-sm font-medium ${active ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'}`}>{item.label}</div>
                {item.desc && <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{item.desc}</div>}
              </div>
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <nav className={`sticky top-0 z-40 ${theme.bg} backdrop-blur-xl border-b border-white/10 dark:border-white/5 shadow-sm transition-all duration-300`}>
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">

          {/* ========== LOGO ========== */}
          <div className="flex items-center flex-shrink-0">
            <Link to="/dashboard" className="flex items-center gap-2.5 group">
              <div className="bg-white/15 group-hover:bg-white/25 p-1.5 rounded-xl transition-all duration-200">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block leading-none">
                <span className="text-white text-base font-semibold tracking-tight">GED</span>
                <span className="text-blue-200/70 dark:text-gray-500 text-[10px] block mt-0.5">HSJM Workflow</span>
              </div>
            </Link>
          </div>

          {/* ========== CENTRE : 3 items + « Plus » ========== */}
          <div className="hidden lg:flex items-center justify-center flex-1 px-4">
            <div className={`flex items-center gap-1 ${theme.pill} rounded-full p-1`}>
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                return (
                  <Link key={item.path} to={item.path}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200
                      ${active
                        ? 'bg-white dark:bg-gray-700 text-blue-700 dark:text-white shadow-sm'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {/* Menu « Plus » — tout le reste */}
              {hasMoreItems && (
                <div className="relative more-menu-container pb-3 -mb-3"
                  onMouseEnter={() => setShowMoreMenu(true)}
                  onMouseLeave={() => setShowMoreMenu(false)}
                >
                  <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 text-white/80 hover:text-white hover:bg-white/10">
                    <Grid className="w-3.5 h-3.5" />
                    <span>Plus</span>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showMoreMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showMoreMenu && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0 pt-2 w-80 z-50">
                      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 py-2 animate-fadeIn max-h-[75vh] overflow-y-auto">
                      {renderMoreSection('Navigation', moreNavItems, () => setShowMoreMenu(false))}
                      {moreGestionItems.length > 0 && moreNavItems.length > 0 && <div className="h-px bg-gray-100 dark:bg-gray-700 my-1 mx-4" />}
                      {renderMoreSection('Gestion', moreGestionItems, () => setShowMoreMenu(false))}
                      {moreAppsItems.length > 0 && <div className="h-px bg-gray-100 dark:bg-gray-700 my-1 mx-4" />}
                      {renderMoreSection('Applications', moreAppsItems, () => setShowMoreMenu(false))}
                      {moreToolsItems.length > 0 && <div className="h-px bg-gray-100 dark:bg-gray-700 my-1 mx-4" />}
                      {renderMoreSection('Outils', moreToolsItems, () => setShowMoreMenu(false))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ========== DROITE : icônes ========== */}
          <div className="hidden lg:flex items-center gap-1">
            {/* Recherche Spotlight */}
            <GlobalSearch />

            {/* Mes Tâches */}
            <Link to="/my-tasks" title="Mes tâches"
              className="relative p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
            >
              <CheckSquare className={hasNewTask ? 'animate-bounce' : ''} style={{ width: 18, height: 18 }} />
              {pendingCount > 0 && (
                <span className={`absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ${hasNewTask ? 'animate-pulse' : ''}`}>
                  {pendingCount}
                </span>
              )}
            </Link>

            {/* Notifications */}
            <button title="Notifications" className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200">
              <Bell style={{ width: 18, height: 18 }} />
            </button>

            <ThemeToggle />

            <div className="w-px h-5 bg-white/20 mx-1" />

            {/* Avatar utilisateur */}
            <div className="relative user-menu-container">
              <button onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-white/10 transition-all duration-200"
              >
                <div className={`${avatarColor} w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm`}>
                  {userInitials}
                </div>
                <ChevronDown className={`w-3 h-3 text-white/50 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 z-50 overflow-hidden animate-fadeIn">
                  <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700">
                    <div className={`${avatarColor} w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
                      {userInitials}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{user?.username}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                      <span className="inline-block mt-0.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">{getRoleLabel(user?.role)}</span>
                    </div>
                  </div>
                  <div className="p-2">
                    <Link to="/parametres/notifications" onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl text-gray-700 dark:text-gray-300 transition-all">
                      <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg"><Bell className="w-4 h-4 text-gray-500 dark:text-gray-400" /></div>
                      <div><div className="text-sm font-medium">Notifications</div><div className="text-xs text-gray-400">Gérer vos alertes</div></div>
                    </Link>
                    <Link to="/settings" onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl text-gray-700 dark:text-gray-300 transition-all">
                      <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg"><Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" /></div>
                      <div><div className="text-sm font-medium">Paramètres</div><div className="text-xs text-gray-400">Configuration</div></div>
                    </Link>
                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-1.5 mx-3" />
                    <div className="px-3 py-2">
                      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Couleur de la barre</p>
                      <div className="flex gap-1.5">
                        {Object.entries(themes).map(([key, t]) => (
                          <button key={key} onClick={() => setThemeName(key)} title={t.label}
                            className={`w-6 h-6 rounded-full ${t.dot} transition-all ${themeName === key ? 'ring-2 ring-offset-2 ring-blue-400 dark:ring-offset-gray-800 scale-110' : 'hover:scale-110'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-1.5 mx-3" />
                    <button onClick={() => { setShowUserMenu(false); onLogout(); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400 transition-all">
                      <div className="p-1.5 bg-red-50 dark:bg-red-900/30 rounded-lg"><LogOut className="w-4 h-4" /></div>
                      <div className="text-left"><div className="text-sm font-medium">Déconnexion</div><div className="text-xs opacity-60">Se déconnecter</div></div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========== MOBILE BUTTON ========== */}
          <div className="lg:hidden flex items-center gap-1.5">
            {pendingCount > 0 && (
              <Link to="/my-tasks" className="relative p-2" onClick={() => setIsOpen(false)}>
                <Bell className="w-5 h-5 text-white" />
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">{pendingCount}</span>
              </Link>
            )}
            <ThemeToggle />
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-xl text-white hover:bg-white/10 transition-all">
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* ========== MOBILE MENU ========== */}
        {isOpen && (
          <div className="lg:hidden pb-4 border-t border-white/10 mt-1">
            <div className="space-y-0.5 pt-3">
              {/* Items principaux + navigation */}
              {[...visibleItems, ...moreNavItems].map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                return (
                  <Link key={item.path} to={item.path} onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                      ${active ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
                    <Icon className="w-4 h-4" /><span>{item.label}</span>
                  </Link>
                );
              })}

              {moreGestionItems.length > 0 && (
                <div className="pt-2 mt-1">
                  <div className="px-3 py-1.5 text-white/40 text-[10px] font-semibold uppercase tracking-widest">Gestion</div>
                  {moreGestionItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.path} to={item.path} onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive(item.path) ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
                        <Icon className="w-4 h-4" /><span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}

              {moreAppsItems.length > 0 && (
                <div className="pt-2 mt-1">
                  <div className="px-3 py-1.5 text-white/40 text-[10px] font-semibold uppercase tracking-widest">Applications</div>
                  {moreAppsItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.path} to={item.path} onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive(item.path) ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
                        <Icon className="w-4 h-4" /><span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}

              {moreToolsItems.length > 0 && (
                <div className="pt-2 mt-1">
                  <div className="px-3 py-1.5 text-white/40 text-[10px] font-semibold uppercase tracking-widest">Outils</div>
                  {moreToolsItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.path} to={item.path} onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive(item.path) ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
                        <Icon className="w-4 h-4" /><span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}

              <div className="pt-2 mt-1 border-t border-white/10">
                <button onClick={() => { setIsOpen(false); onLogout(); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-red-300 hover:bg-red-500/20 rounded-xl text-sm font-medium transition-all">
                  <LogOut className="w-4 h-4" /><span>Déconnexion</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}