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
  Archive
} from 'lucide-react';
import { workflowAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';

const getRoleLabel = (role) => {
  const roleLabels = {
    'user': 'Utilisateur',
    'validator': 'Validateur',
    'director': 'Directeur',
    'admin': 'Administrateur',
    'gardien': 'Gardien',
    'agent_accueil_php': 'Agent Accueil PHP',
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
  const [showGestionMenu, setShowGestionMenu] = useState(false);
  const [showAppsMenu, setShowAppsMenu] = useState(false);
  
  const [pendingCount, setPendingCount] = useState(0);
  const [hasNewTask, setHasNewTask] = useState(false);

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
      if (showGestionMenu && !event.target.closest('.gestion-menu-container')) {
        setShowGestionMenu(false);
      }
      if (showAppsMenu && !event.target.closest('.apps-menu-container')) {
        setShowAppsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu, showGestionMenu, showAppsMenu]);

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

  const mainNavItems = [
    { path: '/dashboard', icon: Home, label: 'Tableau de bord' },
    { path: '/documents', icon: FileText, label: 'Documents' },
    { path: '/archives', icon: Archive, label: 'Archives' },
    { path: '/workflow-dashboard', icon: BarChart3, label: 'Workflow' },
  ];

  const gestionItems = [
    { path: '/schedules', icon: Calendar, label: 'Plannings', managementOnly: true },
    { path: '/employees', icon: Users, label: 'Employés', rhOrAdminOnly: true },
    { path: '/user-management', icon: Users, label: 'Utilisateurs', adminOnly: true },
    { path: '/services', icon: LayoutGrid, label: 'Services', adminOnly: true },
  ];

  const appsItems = [
    { path: '/portail', icon: UserPlus, label: 'Portail', gardienOnly: true },
    { path: '/accueil', icon: DoorOpen, label: 'Accueil', accueilOnly: true },
    { path: '/caisse', icon: DollarSign, label: 'Caisse', caisseOnly: true },
    { 
      path: '/demandes-achat',
      icon: ShoppingCart,
      label: 'Demandes d\'Achat', 
      demandeAchatOnly: true 
    },
  ];

  const toolsItems = [
    { 
      path: '/kanban/MG',
      icon: Kanban, 
      label: 'Suivi Technique', 
      kanbanOnly: true 
    },
    { path: '/invoices', icon: Receipt, label: 'Factures', managementOnly: true },
    { path: '/upload', icon: Upload, label: 'Upload' },
  ];

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
    
    return true;
  };

  const hasGestionAccess = gestionItems.some(item => canAccessItem(item));
  const hasAppsAccess = appsItems.some(item => canAccessItem(item));
  const hasToolsAccess = toolsItems.some(item => canAccessItem(item));

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-gray-800 dark:to-gray-900 shadow-lg transition-all duration-200">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* ==================== LOGO + NOM (GAUCHE) ==================== */}
          <div className="flex items-center flex-shrink-0">
            <Link to="/dashboard" className="flex items-center space-x-3 group">
              <div className="bg-white/10 dark:bg-white/5 p-2 rounded-lg group-hover:bg-white/20 transition-all duration-200">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="text-white text-lg font-bold tracking-tight">GED</span>
                <span className="text-blue-200 dark:text-gray-400 text-xs block -mt-1">HSJM Workflow</span>
              </div>
            </Link>
          </div>

          {/* ==================== NAVIGATION PRINCIPALE (CENTRE) ==================== */}
          <div className="hidden lg:flex items-center justify-center flex-1 px-8">
            <div className="flex items-center space-x-1">
              
              {/* Navigation Principale */}
              {mainNavItems.map((item) => {
                if (!canAccessItem(item)) return null;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`${isActive(item.path)} text-blue-100 hover:bg-blue-700 dark:hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-all duration-200`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {/* Menu Gestion */}
              {hasGestionAccess && (
                <div
                  className="relative gestion-menu-container pb-2"
                  onMouseEnter={() => setShowGestionMenu(true)}
                  onMouseLeave={() => setShowGestionMenu(false)}
                >
                  <button className="text-blue-100 hover:bg-blue-700 dark:hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-all duration-200">
                    <Briefcase className="w-4 h-4" />
                    <span>Gestion</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showGestionMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showGestionMenu && (
                    <div className="absolute top-full left-0 mt-0 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-50 animate-fadeIn">
                      {gestionItems.map((item) => {
                        if (!canAccessItem(item)) return null;
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setShowGestionMenu(false)}
                            className={`flex items-center space-x-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 transition-all ${location.pathname.startsWith(item.path) ? 'bg-blue-50 dark:bg-gray-700 text-blue-600 dark:text-blue-400 border-l-4 border-blue-600' : ''}`}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Menu Applications */}
              {hasAppsAccess && (
                <div
                  className="relative apps-menu-container pb-2"
                  onMouseEnter={() => setShowAppsMenu(true)}
                  onMouseLeave={() => setShowAppsMenu(false)}
                >
                  <button className="text-blue-100 hover:bg-blue-700 dark:hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-all duration-200">
                    <Grid className="w-4 h-4" />
                    <span>Applications</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showAppsMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showAppsMenu && (
                    <div className="absolute top-full left-0 mt-0 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-50 animate-fadeIn">
                      {appsItems.map((item) => {
                        if (!canAccessItem(item)) return null;
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setShowAppsMenu(false)}
                            className={`flex items-center space-x-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 transition-all ${location.pathname.startsWith(item.path) ? 'bg-blue-50 dark:bg-gray-700 text-blue-600 dark:text-blue-400 border-l-4 border-blue-600' : ''}`}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Menu Outils */}
              {hasToolsAccess && toolsItems.some(item => canAccessItem(item)) && (
                <div className="flex items-center space-x-1 ml-2 pl-2 border-l border-blue-500/30">
                  {toolsItems.map((item) => {
                    if (!canAccessItem(item)) return null;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`${isActive(item.path)} text-blue-100 hover:bg-blue-700 dark:hover:bg-gray-700 p-2 rounded-lg transition-all duration-200`}
                        title={item.label}
                      >
                        <Icon className="w-5 h-5" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ==================== ACTIONS UTILISATEUR (DROITE) ==================== */}
          <div className="hidden lg:flex items-center space-x-3">
            
            {/* Mes Tâches avec Badge */}
            <Link 
              to="/my-tasks" 
              className="relative text-blue-100 hover:bg-blue-700 dark:hover:bg-gray-700 p-2 rounded-lg transition-all duration-200"
              title="Mes tâches"
            >
              <CheckSquare className={`w-5 h-5 ${hasNewTask ? 'animate-bounce' : ''}`} />
              {pendingCount > 0 && (
                <span className={`absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ${hasNewTask ? 'animate-pulse' : ''}`}>
                  {pendingCount}
                </span>
              )}
            </Link>

            {/* Notifications */}
            <button className="text-blue-100 hover:bg-blue-700 dark:hover:bg-gray-700 p-2 rounded-lg transition-all duration-200">
              <Bell className="w-5 h-5" />
            </button>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Séparateur */}
            <div className="h-8 w-px bg-blue-500/30"></div>

            {/* Menu Utilisateur */}
            <div className="relative user-menu-container">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 text-blue-100 hover:bg-blue-700 dark:hover:bg-gray-700 px-3 py-2 rounded-lg transition-all duration-200"
              >
                <div className="flex items-center space-x-2">
                  <div className="bg-white/20 p-1.5 rounded-full">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="text-left hidden xl:block">
                    <p className="text-sm font-medium">{user?.firstName || user?.username}</p>
                    <p className="text-xs text-blue-200">{getRoleLabel(user?.role)}</p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-fadeIn">
                  <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-gray-700 dark:to-gray-800">
                    <p className="font-semibold text-white">{user?.username}</p>
                    <p className="text-sm text-blue-100 dark:text-gray-300">{user?.email}</p>
                    <p className="text-xs text-blue-200 dark:text-gray-400 mt-1 bg-white/10 inline-block px-2 py-1 rounded">
                      {getRoleLabel(user?.role)}
                    </p>
                  </div>

                  <div className="p-2">
                    <Link 
                      to="/parametres/notifications" 
                      onClick={() => setShowUserMenu(false)} 
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 transition-all"
                    >
                      <Bell className="w-5 h-5" />
                      <div>
                        <div className="font-medium">Notifications</div>
                        <div className="text-xs text-gray-500">Gérer vos alertes</div>
                      </div>
                    </Link>

                    <Link 
                      to="/settings" 
                      onClick={() => setShowUserMenu(false)} 
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 transition-all"
                    >
                      <Settings className="w-5 h-5" />
                      <div>
                        <div className="font-medium">Paramètres</div>
                        <div className="text-xs text-gray-500">Configuration</div>
                      </div>
                    </Link>

                    <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

                    <button 
                      onClick={() => { setShowUserMenu(false); onLogout(); }} 
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 transition-all"
                    >
                      <LogOut className="w-5 h-5" />
                      <div className="text-left">
                        <div className="font-medium">Déconnexion</div>
                        <div className="text-xs opacity-75">Se déconnecter</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* ==================== MOBILE MENU BUTTON ==================== */}
          <div className="lg:hidden flex items-center space-x-2">
            {pendingCount > 0 && (
              <Link to="/my-tasks" className="relative" onClick={() => setIsOpen(false)}>
                <Bell className={`w-6 h-6 text-white ${hasNewTask ? 'animate-bounce' : ''}`} />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">{pendingCount}</span>
              </Link>
            )}
            <ThemeToggle />
            <button onClick={() => setIsOpen(!isOpen)} className="text-white hover:text-blue-200 p-2">
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* ==================== MOBILE MENU ==================== */}
        {isOpen && (
          <div className="lg:hidden pb-4 border-t border-blue-500/30 mt-2">
            <div className="space-y-1 pt-4">
              {mainNavItems.map((item) => {
                if (!canAccessItem(item)) return null;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`${isActive(item.path)} text-blue-100 hover:bg-blue-700 dark:hover:bg-gray-700 block px-3 py-2.5 rounded-lg text-base font-medium flex items-center space-x-3 transition-all`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                    {item.badge > 0 && <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{item.badge}</span>}
                  </Link>
                );
              })}

              {hasGestionAccess && (
                <div className="border-t border-blue-500/30 pt-2 mt-2">
                  <div className="px-3 py-2 text-blue-200 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">Gestion</div>
                  {gestionItems.map((item) => {
                    if (!canAccessItem(item)) return null;
                    const Icon = item.icon;
                    return (
                      <Link key={item.path} to={item.path} onClick={() => setIsOpen(false)} className={`${isActive(item.path)} text-blue-100 hover:bg-blue-700 dark:hover:bg-gray-700 block px-3 py-2.5 rounded-lg text-base font-medium flex items-center space-x-3 transition-all`}>
                        <Icon className="w-5 h-5" /><span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}

              {hasAppsAccess && (
                <div className="border-t border-blue-500/30 pt-2 mt-2">
                  <div className="px-3 py-2 text-blue-200 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">Applications</div>
                  {appsItems.map((item) => {
                    if (!canAccessItem(item)) return null;
                    const Icon = item.icon;
                    return (
                      <Link key={item.path} to={item.path} onClick={() => setIsOpen(false)} className={`${isActive(item.path)} text-blue-100 hover:bg-blue-700 dark:hover:bg-gray-700 block px-3 py-2.5 rounded-lg text-base font-medium flex items-center space-x-3 transition-all`}>
                        <Icon className="w-5 h-5" /><span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}

              {hasToolsAccess && (
                <div className="border-t border-blue-500/30 pt-2 mt-2">
                  <div className="px-3 py-2 text-blue-200 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">Outils</div>
                  {toolsItems.map((item) => {
                    if (!canAccessItem(item)) return null;
                    const Icon = item.icon;
                    return (
                      <Link key={item.path} to={item.path} onClick={() => setIsOpen(false)} className={`${isActive(item.path)} text-blue-100 hover:bg-blue-700 dark:hover:bg-gray-700 block px-3 py-2.5 rounded-lg text-base font-medium flex items-center space-x-3 transition-all`}>
                        <Icon className="w-5 h-5" /><span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}

              <div className="border-t border-blue-500/30 pt-2 mt-2">
                <button onClick={() => { setIsOpen(false); onLogout(); }} className="w-full text-left px-3 py-2.5 text-blue-100 hover:bg-red-600/80 rounded-lg text-base font-medium flex items-center space-x-3 transition-all">
                  <LogOut className="w-5 h-5" /><span>Déconnexion</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}