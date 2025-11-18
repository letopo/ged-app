// frontend/src/components/Navbar.jsx - VERSION CORRIGÉE
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
  LayoutGrid
} from 'lucide-react';
import { workflowAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';

export default function Navbar({ onLogout }) {
  const { user } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadPendingTasks();
      const interval = setInterval(loadPendingTasks, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadPendingTasks = async () => {
    try {
      const response = await workflowAPI.getMyTasks('pending');
      setPendingCount(response.data.tasks?.length || 0);
    } catch (err) {
      console.error('Erreur chargement tâches:', err);
    }
  };

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
    // NOUVEAU : Lien pour la gestion des employés (RH et Admin)
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

          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              // Vérifier les permissions
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
                    <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <ThemeToggle />
            
            {pendingCount > 0 && (
              <Link
                to="/my-tasks"
                className="relative text-white hover:text-blue-200 transition-colors"
              >
                <Bell className="w-6 h-6" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {pendingCount}
                </span>
              </Link>
            )}
            <div className="text-white text-sm">
              <div className="font-medium">{user?.username}</div>
              <div className="text-blue-200 dark:text-gray-400 text-xs">{user?.role}</div>
            </div>
            <button
              onClick={onLogout}
              className="text-blue-100 hover:bg-blue-700 dark:hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </button>
          </div>
          
          <div className="md:hidden flex items-center space-x-2">
            <ThemeToggle />
            <button onClick={() => setIsOpen(!isOpen)} className="text-white hover:text-blue-200 p-2">
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="md:hidden pb-4">
            <div className="space-y-1">
              {navItems.map((item) => {
                // Vérifier les permissions (version mobile)
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
                      <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
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