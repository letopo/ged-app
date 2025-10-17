// frontend/src/components/Dashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { documentsAPI, workflowAPI } from '../services/api';
import { 
  FileText, Upload, CheckSquare, BarChart3, 
  Clock, TrendingUp, Loader 
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalDocuments: 0,
    pendingTasks: 0,
    recentDocuments: []
  });
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Charger les documents
      const docsResponse = await documentsAPI.getAll();
      const documents = docsResponse.data.data || [];
      
      // Charger les tâches en attente
      const tasksResponse = await workflowAPI.getMyTasks('pending');
      const pendingTasks = tasksResponse.data.tasks?.length || 0;
      
      setStats({
        totalDocuments: documents.length,
        pendingTasks,
        recentDocuments: documents.slice(0, 5)
      });
    } catch (err) {
      console.error('Erreur chargement dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Bonjour, {user.firstName || user.username} 👋
        </h1>
        <p className="text-gray-600 mt-2">
          Voici un aperçu de votre activité
        </p>
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total documents */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <FileText className="w-8 h-8 text-blue-600" />
            <span className="text-3xl font-bold text-blue-900">{stats.totalDocuments}</span>
          </div>
          <h3 className="text-blue-800 font-semibold">Documents</h3>
          <p className="text-blue-600 text-sm">Total dans la GED</p>
        </div>

        {/* Tâches en attente */}
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between mb-4">
            <Clock className="w-8 h-8 text-yellow-600" />
            <span className="text-3xl font-bold text-yellow-900">{stats.pendingTasks}</span>
          </div>
          <h3 className="text-yellow-800 font-semibold">Tâches en attente</h3>
          <p className="text-yellow-600 text-sm">À valider</p>
        </div>

        {/* Accès rapides */}
        <Link 
          to="/upload"
          className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-md p-6 border-l-4 border-green-500 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <Upload className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-green-800 font-semibold">Uploader</h3>
          <p className="text-green-600 text-sm">Nouveau document</p>
        </Link>

        <Link 
          to="/workflow-dashboard"
          className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-md p-6 border-l-4 border-purple-500 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <BarChart3 className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-purple-800 font-semibold">Workflow</h3>
          <p className="text-purple-600 text-sm">Tableau de bord</p>
        </Link>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link
          to="/documents"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-500"
        >
          <FileText className="w-10 h-10 text-blue-600 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Mes documents
          </h3>
          <p className="text-gray-600 text-sm">
            Consulter et gérer tous vos documents
          </p>
        </Link>

        <Link
          to="/my-tasks"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-500"
        >
          <CheckSquare className="w-10 h-10 text-green-600 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Mes tâches
          </h3>
          <p className="text-gray-600 text-sm">
            Valider les documents en attente
          </p>
        </Link>

        <Link
          to="/upload"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-500"
        >
          <Upload className="w-10 h-10 text-purple-600 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Upload
          </h3>
          <p className="text-gray-600 text-sm">
            Ajouter de nouveaux documents
          </p>
        </Link>
      </div>

      {/* Documents récents */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <TrendingUp className="w-6 h-6 mr-2 text-blue-600" />
            Documents récents
          </h2>
          <Link to="/documents" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            Voir tout →
          </Link>
        </div>

        {stats.recentDocuments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p>Aucun document pour le moment</p>
            <Link to="/upload" className="text-blue-600 hover:text-blue-700 text-sm mt-2 inline-block">
              Uploader votre premier document
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {stats.recentDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center flex-1">
                  <FileText className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <h3 className="font-medium text-gray-900">{doc.title}</h3>
                    <p className="text-sm text-gray-500">{doc.filename}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {doc.status || 'draft'}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}