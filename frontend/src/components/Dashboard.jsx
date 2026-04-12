// frontend/src/components/Dashboard.jsx - VERSION AVEC REDIRECTION AUTOMATIQUE

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { documentsAPI, workflowAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Calendar from './Calendar'; 
import {
  FileText, Clock, CheckCircle, TrendingUp,
  Calendar as CalendarIcon, User, Upload, BarChart3, Loader,
  Activity as ActivityIcon
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // ✅ NOUVEAU : Redirection automatique selon le rôle
  useEffect(() => {
    if (!user) return;

    // Rediriger les rôles spéciaux vers leur dashboard dédié
    if (user.role === 'gardien') {
      console.log('➡️ Redirection gardien vers /portail');
      navigate('/portail', { replace: true });
      return;
    }
    
    if (user.role === 'agent_accueil_php' || user.role === 'agent_accueil_normal') {
      console.log('➡️ Redirection agent accueil vers /accueil');
      navigate('/accueil', { replace: true });
      return;
    }
    
    if (user.role === 'caissier') {
      console.log('➡️ Redirection caissier vers /caisse');
      navigate('/caisse', { replace: true });
      return;
    }

    // Si ce n'est pas un rôle spécial, charger le dashboard normal
    loadDashboardData();
  }, [user, navigate]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const docsResponse = await documentsAPI.getAll();
      const documents = docsResponse.data.data || [];

      setStats({
        total: documents.length,
        approved: documents.filter(d => d.status === 'approved').length,
        rejected: documents.filter(d => d.status === 'rejected').length,
        pending: documents.filter(d => ['pending', 'pending_validation'].includes(d.status)).length
      });

      const sortedDocs = [...documents]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
      setRecentDocuments(sortedDocs);

      try {
        const tasksResponse = await workflowAPI.getMyTasks('pending');
        setMyTasks(tasksResponse.data.tasks || []);
      } catch (error) {
        console.log('Pas de tâches en attente à charger pour le dashboard.');
        setMyTasks([]);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  // ✅ NOUVEAU : Loader pendant la redirection
  if (user && ['gardien', 'agent_accueil_php', 'agent_accueil_normal', 'caissier'].includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Redirection vers votre espace...</p>
        </div>
      </div>
    );
  }
  
  const formatDate = (date) => {
    if (!date) return 'Date inconnue';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: { text: 'Brouillon', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
      pending_validation: { text: 'En attente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200' },
      approved: { text: 'Approuvé', color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' },
      rejected: { text: 'Rejeté', color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' }
    };
    const badge = badges[status] || badges.draft;
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>{badge.text}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text mb-2">
          Bonjour, {user?.firstName || user?.username} 👋
        </h1>
        <p className="text-gray-600 dark:text-dark-text-secondary">Voici un aperçu de votre activité</p>
      </div>
      {lastUpdated && (
        <div className="flex items-center justify-end gap-2 -mt-4 mb-6">
          <button onClick={loadDashboardData} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 transition-colors group">
            <TrendingUp className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
            Mis à jour {Math.floor((new Date() - lastUpdated) / 60000) === 0 ? 'à l\'instant' : `il y a ${Math.floor((new Date() - lastUpdated) / 60000)} min`}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link to="/documents" className="group bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500 rounded-lg p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all dark:from-dark-surface dark:to-gray-800 dark:border-blue-700">
          <div className="flex items-center justify-between mb-3">
            <FileText className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            <span className="text-4xl font-bold text-blue-900 dark:text-dark-text">{stats.total}</span>
          </div>
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">Documents</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center justify-between">
            Total dans la GED
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500">→</span>
          </p>
        </Link>

        <Link to="/my-tasks" className="group bg-gradient-to-br from-yellow-50 to-yellow-100 border-l-4 border-yellow-500 rounded-lg p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all dark:from-dark-surface dark:to-gray-800 dark:border-yellow-700">
          <div className="flex items-center justify-between mb-3">
            <Clock className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
            <span className="text-4xl font-bold text-yellow-900 dark:text-dark-text">{myTasks.length}</span>
          </div>
          <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">Tâches en attente</p>
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 flex items-center justify-between">
            À valider
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-yellow-500">→</span>
          </p>
        </Link>

        <Link to="/upload" className="group bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500 rounded-lg p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all dark:from-dark-surface dark:to-gray-800 dark:border-green-700">
          <div className="flex items-center justify-between mb-3">
            <Upload className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-sm font-semibold text-green-800 dark:text-green-200">Uploader</p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center justify-between">
            Nouveau document
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-green-500">→</span>
          </p>
        </Link>

        <Link to="/workflow-dashboard" className="group bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-500 rounded-lg p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all dark:from-dark-surface dark:to-gray-800 dark:border-purple-700">
          <div className="flex items-center justify-between mb-3">
            <BarChart3 className="w-10 h-10 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-sm font-semibold text-purple-800 dark:text-purple-200">Workflow</p>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 flex items-center justify-between">
            Tableau de bord
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-purple-500">→</span>
          </p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        <div className="space-y-6">
          <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm dark:shadow-none border border-gray-200 dark:border-dark-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text flex items-center gap-2"><FileText className="w-5 h-5" />Documents récents</h2>
              <Link to="/documents" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">Voir tout →</Link>
            </div>
            {recentDocuments.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-dark-text-secondary text-sm">Aucun document pour le moment</p>
                <Link to="/upload" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium mt-2 inline-block">Uploader votre premier document</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-bg rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-dark-text truncate">{doc.title}</p>
                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary">{doc.uploadedBy?.firstName ? `${doc.uploadedBy.firstName} • ` : ''}{formatDate(doc.createdAt)}</p>
                      </div>
                    </div>
                    {getStatusBadge(doc.status)}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm dark:shadow-none border border-gray-200 dark:border-dark-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text flex items-center gap-2"><CheckCircle className="w-5 h-5" />Mes tâches à traiter</h2>
              <Link to="/my-tasks" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">Voir tout →</Link>
            </div>
            {myTasks.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-dark-text-secondary text-sm">Aucune tâche en attente</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Vous êtes à jour ! 🎉</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors border border-yellow-200 dark:border-yellow-700">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-dark-text truncate">{task.document?.title}</p>
                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary">En attente de validation</p>
                      </div>
                    </div>
                    <Link to="/my-tasks" className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600">Traiter</Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <Calendar month={currentMonth} year={currentYear} />
        </div>
      </div>

      <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm dark:shadow-none border border-gray-200 dark:border-dark-border p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-4 flex items-center gap-2">
          <ActivityIcon className="w-5 h-5" />
          Activité récente
        </h2>
        {recentDocuments.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Aucune activité récente</p>
        ) : (
          <div className="relative pl-6">
            <div className="absolute left-2.5 top-2 bottom-2 w-px bg-gray-200 dark:bg-gray-700" />
            {recentDocuments.map((doc, i) => {
              const statusInfo = {
                draft: { icon: FileText, color: 'bg-gray-400', text: 'Nouveau brouillon créé' },
                pending_validation: { icon: Clock, color: 'bg-yellow-500', text: 'Soumis pour validation' },
                approved: { icon: CheckCircle, color: 'bg-green-500', text: 'Approuvé' },
                rejected: { icon: Clock, color: 'bg-red-500', text: 'Rejeté' },
              }[doc.status] || { icon: FileText, color: 'bg-gray-400', text: 'Mis à jour' };
              const Icon = statusInfo.icon;
              return (
                <div key={doc.id} className="relative flex gap-3 pb-4 last:pb-0">
                  <div className={`absolute -left-3.5 mt-1 w-3 h-3 rounded-full ${statusInfo.color} ring-2 ring-white dark:ring-dark-surface`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-dark-text truncate">{doc.title}</p>
                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                      {statusInfo.text} • {formatDate(doc.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;