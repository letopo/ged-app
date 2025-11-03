// frontend/src/components/Dashboard.jsx - VERSION AVEC CALENDRIERS
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { documentsAPI, workflowAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Calendar from './Calendar'; // ⬇️ AJOUTÉ
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

  // ⬇️ AJOUTÉ : Calcul des mois pour les calendriers
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
    const badges = {
      draft: { text: 'Brouillon', color: 'bg-gray-100 text-gray-800' },
      pending_validation: { text: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
      approved: { text: 'Approuvé', color: 'bg-green-100 text-green-800' },
      rejected: { text: 'Rejeté', color: 'bg-red-100 text-red-800' }
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Bonjour, {user?.firstName || user?.username} 👋
        </h1>
        <p className="text-gray-600">Voici un aperçu de votre activité</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3"><FileText className="w-10 h-10 text-blue-600" /><span className="text-4xl font-bold text-blue-900">{stats.total}</span></div>
          <p className="text-sm font-semibold text-blue-800">Documents</p><p className="text-xs text-blue-600 mt-1">Total dans la GED</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-l-4 border-yellow-500 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3"><Clock className="w-10 h-10 text-yellow-600" /><span className="text-4xl font-bold text-yellow-900">{myTasks.length}</span></div>
          <p className="text-sm font-semibold text-yellow-800">Tâches en attente</p><p className="text-xs text-yellow-600 mt-1">À valider</p>
        </div>
        <Link to="/upload" className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center justify-between mb-3"><Upload className="w-10 h-10 text-green-600" /></div>
          <p className="text-sm font-semibold text-green-800">Uploader</p><p className="text-xs text-green-600 mt-1">Nouveau document</p>
        </Link>
        <Link to="/workflow-dashboard" className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-500 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center justify-between mb-3"><BarChart3 className="w-10 h-10 text-purple-600" /></div>
          <p className="text-sm font-semibold text-purple-800">Workflow</p><p className="text-xs text-purple-600 mt-1">Tableau de bord</p>
        </Link>
      </div>

      {/* ⬇️ MODIFIÉ : Nouvelle grille avec Documents/Tâches à gauche et Calendriers à droite */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* COLONNE GAUCHE : Documents récents et Tâches */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><FileText className="w-5 h-5" />Documents récents</h2>
              <Link to="/documents" className="text-sm text-blue-600 hover:text-blue-700 font-medium">Voir tout →</Link>
            </div>
            {recentDocuments.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Aucun document pour le moment</p>
                <Link to="/upload" className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2 inline-block">Uploader votre premier document</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                        <p className="text-xs text-gray-500">{doc.uploadedBy?.firstName ? `${doc.uploadedBy.firstName} • ` : ''}{formatDate(doc.createdAt)}</p>
                      </div>
                    </div>
                    {getStatusBadge(doc.status)}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><CheckCircle className="w-5 h-5" />Mes tâches à traiter</h2>
              <Link to="/my-tasks" className="text-sm text-blue-600 hover:text-blue-700 font-medium">Voir tout →</Link>
            </div>
            {myTasks.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Aucune tâche en attente</p><p className="text-gray-400 text-xs mt-1">Vous êtes à jour ! 🎉</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{task.document?.title}</p>
                        <p className="text-xs text-gray-500">En attente de validation</p>
                      </div>
                    </div>
                    <Link to="/my-tasks" className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">Traiter</Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ⬇️ COLONNE DROITE : CALENDRIERS (NOUVEAU) */}
        <div className="space-y-4">
          <Calendar month={currentMonth} year={currentYear} />
          <Calendar month={nextMonth} year={nextYear} />
        </div>
      </div>

      {/* Section Raccourcis rapides */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Raccourcis rapides
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link 
            to="/documents"
            className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <FileText className="w-6 h-6 text-blue-600" />
            <div>
              <p className="font-medium text-gray-900">Mes documents</p>
              <p className="text-xs text-gray-600">Consulter et gérer tous vos documents</p>
            </div>
          </Link>

          <Link 
            to="/my-tasks"
            className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
          >
            <CheckCircle className="w-6 h-6 text-yellow-600" />
            <div>
              <p className="font-medium text-gray-900">Mes tâches</p>
              <p className="text-xs text-gray-600">Valider les documents en attente</p>
            </div>
          </Link>

          <Link 
            to="/upload"
            className="flex items-center gap-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <Upload className="w-6 h-6 text-green-600" />
            <div>
              <p className="font-medium text-gray-900">Upload</p>
              <p className="text-xs text-gray-600">Ajouter de nouveaux documents</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;