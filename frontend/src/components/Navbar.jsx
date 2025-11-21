// frontend/src/components/Navbar.jsx - VERSION AVEC PARAMÈTRES NOTIFICATIONS

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
  Settings,
  User,
  ChevronDown
} from 'lucide-react';
import { workflowAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';

export default function Navbar({ onLogout }) {
  const { user } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false); // ✅ NOUVEAU
  const [pendingCount, setPendingCount] = useState(0);
  const [hasNewTask, setHasNewTask] = useState(false);

  // Charger les tâches en attente
  const loadPendingTasks = async () => {
    try {
      const response = await workflowAPI.getMyTasks('pending');
      setPendingCount(response.data.tasks?.length || 0);
    } catch (err) {
      console.error('Erreur chargement tâches:', err);
    }
  };

  // Écouter les événements Socket.IO via window events
  useEffect(() => {
    if (!user) return;

    loadPendingTasks();

    const handleNewTask = (event) => {
      console.log('🔔 Navbar: Nouvelle tâche détectée', event.detail);
      setPendingCount(prev => prev + 1);
      setHasNewTask(true);
      setTimeout(() => setHasNewTask(false), 3000);
      setTimeout(() => loadPendingTasks(), 1000);
    };

    const handleTaskUpdate = (event) => {
      console.log('🔄 Navbar: Mise à jour de tâche', event.detail);
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

  // ✅ NOUVEAU : Fermer le menu utilisateur en cliquant ailleurs
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  const isActive = (path) => {
    return location.pathname === path
      ? 'bg-blue-700 text-white dark:bg-blue-800'
      : 'text-blue-100 hover:bg-blue-700 dark:hover:bg-blue-800';
  };

  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Tableau de bord' },
    { path: '/documents', icon: FileText, label: 'Documents' },
    { path: '/upload', icon: Upload, label: 'Upload' },
    { path: '/my-tasks', icon: CheckSquare, label: 'Mes tâches', badge: pendingCount },
    { path: '/workflow-dashboard', icon: BarChart3, label: 'Workflow' },
    { path: '/user-management', icon: Users, label: 'Utilisateurs', adminOnly: true },
    { path: '/services', icon: LayoutGrid, label: 'Services', adminOnly: true },
    { path: '/employees', icon: Users, label: 'Employés', rhOrAdminOnly: true },
  ];

  return (
    <nav className="bg-blue-600 dark:bg-gray-800 shadow-lg transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center">
              <FileText className="w-8 h-8 text-white mr-2" />
              <span className="text-white text-xl font-bold">GED Workflow</span>
            </Link>
          </div>

          {/* Navigation Desktop */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              if (item.adminOnly && user?.role !== 'admin') return null;
              if (item.rhOrAdminOnly) {
                const isRHOrAdmin = user?.role === 'admin' || user?.email === 'hsjm.rh@gmail.com';
                if (!isRHOrAdmin) return null;
              }
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`${isActive(item.path)} px-3 py-2 rounded-md text-sm font-medium flex items-center relative transition-colors`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.label}
                  {item.badge > 0 && (
                    <span 
                      className={`ml-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ${
                        hasNewTask && item.path === '/my-tasks' ? 'animate-bounce' : 'animate-pulse'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Section droite Desktop */}
          <div className="hidden md:flex items-center space-x-4">
            <ThemeToggle />
            
            {/* Badge de notification */}
            {pendingCount > 0 && (
              <Link
                to="/my-tasks"
                className="relative text-white hover:text-blue-200 transition-colors"
                title={`${pendingCount} tâche${pendingCount > 1 ? 's' : ''} en attente`}
              >
                <Bell className={`w-6 h-6 ${hasNewTask ? 'animate-bounce' : ''}`} />
                <span 
                  className={`absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ${
                    hasNewTask ? 'animate-ping' : 'animate-pulse'
                  }`}
                >
                  {pendingCount}
                </span>
                {hasNewTask && (
                  <span className="absolute -top-1 -right-1 bg-red-500 rounded-full h-5 w-5 animate-ping opacity-75"></span>
                )}
              </Link>
            )}
            
            {/* ✅ NOUVEAU : Menu utilisateur avec dropdown */}
            <div className="relative user-menu-container">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 text-white hover:bg-blue-700 dark:hover:bg-gray-700 px-3 py-2 rounded-md transition-colors"
              >
                <User className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium text-sm">{user?.username}</div>
                  <div className="text-blue-200 dark:text-gray-400 text-xs">{user?.role}</div>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
                  <div className="p-2">
                    {/* Info utilisateur */}
                    <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 mb-2">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {user?.username}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {user?.email}
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        {user?.role === 'admin' ? 'Administrateur' : 
                         user?.role === 'validator' ? 'Validateur' : 'Utilisateur'}
                      </p>
                    </div>

                    {/* ✅ NOUVEAU : Lien vers paramètres notifications */}
                    <Link
                      to="/parametres/notifications"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      <Bell className="w-5 h-5" />
                      <div>
                        <div className="font-medium">Notifications</div>
                        <div className="text-xs text-gray-500">Gérer vos alertes</div>
                      </div>
                    </Link>

                    {/* Autres paramètres */}
                    <Link
                      to="/parametres"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      <Settings className="w-5 h-5" />
                      <div>
                        <div className="font-medium">Paramètres</div>
                        <div className="text-xs text-gray-500">Configuration du compte</div>
                      </div>
                    </Link>

                    {/* Séparateur */}
                    <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

                    {/* Déconnexion */}
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-600 dark:text-red-400 transition-colors"
                    >
                      <LogOut className="w-5 h-5" />
                      <div className="text-left">
                        <div className="font-medium">Déconnexion</div>
                        <div className="text-xs opacity-75">Se déconnecter du compte</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Menu Mobile Toggle */}
          <div className="md:hidden flex items-center space-x-2">
            {pendingCount > 0 && (
              <Link to="/my-tasks" className="relative" onClick={() => setIsOpen(false)}>
                <Bell className={`w-6 h-6 text-white ${hasNewTask ? 'animate-bounce' : ''}`} />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {pendingCount}
                </span>
              </Link>
            )}
            <ThemeToggle />
            <button onClick={() => setIsOpen(!isOpen)} className="text-white hover:text-blue-200 p-2">
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Menu Mobile */}
        {isOpen && (
          <div className="md:hidden pb-4">
            <div className="space-y-1">
              {navItems.map((item) => {
                if (item.adminOnly && user?.role !== 'admin') return null;
                if (item.rhOrAdminOnly) {
                  const isRHOrAdmin = user?.role === 'admin' || user?.email === 'hsjm.rh@gmail.com';
                  if (!isRHOrAdmin) return null;
                }
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`${isActive(item.path)} block px-3 py-2 rounded-md text-base font-medium flex items-center transition-colors`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.label}
                    {item.badge > 0 && (
                      <span 
                        className={`ml-auto bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ${
                          hasNewTask && item.path === '/my-tasks' ? 'animate-bounce' : ''
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}

              {/* ✅ NOUVEAU : Liens mobile pour paramètres */}
              <div className="border-t border-blue-500 dark:border-gray-700 pt-2 mt-2">
                <Link
                  to="/parametres/notifications"
                  onClick={() => setIsOpen(false)}
                  className="text-blue-100 hover:bg-blue-700 dark:hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium flex items-center transition-colors"
                >
                  <Bell className="w-5 h-5 mr-3" />
                  Notifications
                </Link>
                <Link
                  to="/parametres"
                  onClick={() => setIsOpen(false)}
                  className="text-blue-100 hover:bg-blue-700 dark:hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium flex items-center transition-colors"
                >
                  <Settings className="w-5 h-5 mr-3" />
                  Paramètres
                </Link>
              </div>

              <div className="border-t border-blue-500 dark:border-gray-700 pt-4 mt-4 px-3">
                <div className="text-white text-sm mb-2">
                  <div className="font-medium">{user?.username}</div>
                  <div className="text-blue-200 dark:text-gray-400 text-xs">{user?.email}</div>
                </div>
                <button
                  onClick={() => { setIsOpen(false); onLogout(); }}
                  className="w-full text-left text-blue-100 hover:bg-blue-700 dark:hover:bg-gray-700 px-3 py-2 rounded-md text-base font-medium flex items-center transition-colors"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}