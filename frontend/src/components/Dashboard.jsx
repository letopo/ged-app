// frontend/src/components/Dashboard.jsx - VERSION 100% COMPLÈTE AVEC SUPPORT DARK MODE

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { documentsAPI, workflowAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Calendar from './Calendar'; 
import { 
  FileText, Clock, CheckCircle, TrendingUp, 
  Calendar as CalendarIcon, User, Upload, BarChart3, Loader
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Calcul des mois pour les calendriers
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
  const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

  useEffect(() => {
    loadDashboardData();
  }, []);

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

    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (date) => {
    if (!date) return 'Date inconnue';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    // J'ajoute les classes Dark Mode aux badges (qui sont des fonds très légers)
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
        {/* Support Dark Mode pour le titre */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text mb-2">
          Bonjour, {user?.firstName || user?.username} 👋
        </h1>
        <p className="text-gray-600 dark:text-dark-text-secondary">Voici un aperçu de votre activité</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Carte 1: Documents (Gradients Light to Dark) */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow dark:from-dark-surface dark:to-gray-800 dark:border-blue-700">
          <div className="flex items-center justify-between mb-3">
            <FileText className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            <span className="text-4xl font-bold text-blue-900 dark:text-dark-text">{stats.total}</span>
          </div>
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">Documents</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Total dans la GED</p>
        </div>
        {/* Carte 2: Tâches en attente */}
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-l-4 border-yellow-500 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow dark:from-dark-surface dark:to-gray-800 dark:border-yellow-700">
          <div className="flex items-center justify-between mb-3">
            <Clock className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
            <span className="text-4xl font-bold text-yellow-900 dark:text-dark-text">{myTasks.length}</span>
          </div>
          <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">Tâches en attente</p>
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">À valider</p>
        </div>
        {/* Carte 3: Uploader */}
        <Link to="/upload" className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer dark:from-dark-surface dark:to-gray-800 dark:border-green-700">
          <div className="flex items-center justify-between mb-3">
            <Upload className="w-10 h-10 text-green-600 dark:text-green-400" />
            {/* Laissez le coin vide comme sur l'image */}
          </div>
          <p className="text-sm font-semibold text-green-800 dark:text-green-200">Uploader</p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">Nouveau document</p>
        </Link>
        {/* Carte 4: Workflow */}
        <Link to="/workflow-dashboard" className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-500 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer dark:from-dark-surface dark:to-gray-800 dark:border-purple-700">
          <div className="flex items-center justify-between mb-3">
            <BarChart3 className="w-10 h-10 text-purple-600 dark:text-purple-400" />
            {/* Laissez le coin vide comme sur l'image */}
          </div>
          <p className="text-sm font-semibold text-purple-800 dark:text-purple-200">Workflow</p>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Tableau de bord</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* COLONNE GAUCHE : Documents récents et Tâches */}
        <div className="space-y-6">
          {/* Panneau Documents récents */}
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
                  // Item de document récent (Support Dark Mode)
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

          {/* Panneau Mes tâches à traiter */}
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
                  // Item de tâche (Support Dark Mode)
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

        {/* COLONNE DROITE : CALENDRIERS (Le composant Calendar doit être mis à jour séparément) */}
        <div className="space-y-4">
          <Calendar month={currentMonth} year={currentYear} />
          <Calendar month={nextMonth} year={nextYear} />
        </div>
      </div>

      {/* Section Raccourcis rapides */}
      <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm dark:shadow-none border border-gray-200 dark:border-dark-border p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Raccourcis rapides
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Raccourci 1: Mes documents */}
          <Link 
            to="/documents"
            className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="font-medium text-gray-900 dark:text-dark-text">Mes documents</p>
              <p className="text-xs text-gray-600 dark:text-dark-text-secondary">Consulter et gérer tous vos documents</p>
            </div>
          </Link>

          {/* Raccourci 2: Mes tâches */}
          <Link 
            to="/my-tasks"
            className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
          >
            <CheckCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            <div>
              <p className="font-medium text-gray-900 dark:text-dark-text">Mes tâches</p>
              <p className="text-xs text-gray-600 dark:text-dark-text-secondary">Valider les documents en attente</p>
            </div>
          </Link>

          {/* Raccourci 3: Upload */}
          <Link 
            to="/upload"
            className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/10 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
          >
            <Upload className="w-6 h-6 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-medium text-gray-900 dark:text-dark-text">Upload</p>
              <p className="text-xs text-gray-600 dark:text-dark-text-secondary">Ajouter de nouveaux documents</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;