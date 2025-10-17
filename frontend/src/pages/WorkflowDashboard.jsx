// frontend/src/pages/WorkflowDashboard.jsx - Design Amélioré
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { workflowAPI } from '../services/api';
import DocumentViewer from '../components/DocumentViewer';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  FileText,
  Calendar,
  User,
  MessageSquare,
  AlertCircle,
  TrendingUp,
  BarChart3
} from 'lucide-react';

const WorkflowDashboard = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  });

  useEffect(() => {
    loadTasks();
  }, [filter]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await workflowAPI.getMyTasks(filter === 'all' ? undefined : filter);
      let tasksData = [];
      if (response.data) {
        if (response.data.tasks) {
          tasksData = response.data.tasks;
        } else if (response.data.data) {
          tasksData = response.data.data;
        } else if (Array.isArray(response.data)) {
          tasksData = response.data;
        }
      }
      
      setTasks(tasksData);

      // Charger toutes les tâches pour les statistiques
      try {
        const allTasks = await workflowAPI.getMyTasks();
        const all = allTasks.data.tasks || allTasks.data.data || allTasks.data || [];
        setStats({
          pending: all.filter(t => t.status === 'pending').length,
          approved: all.filter(t => t.status === 'approved').length,
          rejected: all.filter(t => t.status === 'rejected').length,
          total: all.length
        });
      } catch (statsError) {
        console.warn('⚠️ Erreur chargement stats:', statsError);
      }
    } catch (error) {
      console.error('❌ Erreur chargement des tâches:', error);
      setError(error.message || 'Erreur lors du chargement des tâches');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = (task) => {
    if (!task.document) {
      alert('Document non disponible');
      return;
    }
    
    const normalizedDoc = {
      id: task.document.id,
      fileName: task.document.filename || task.document.fileName || task.document.originalName,
      filePath: task.document.path || task.document.filePath,
      fileSize: task.document.size || task.document.fileSize,
      documentType: task.document.type || task.document.documentType,
      status: task.document.status,
      createdAt: task.document.createdAt || task.document.created_at,
      uploadedBy: task.document.user || task.document.uploadedBy
    };
    
    setSelectedDocument(normalizedDoc);
  };

  const handleValidate = async ({ comment }) => {
    try {
      const taskId = tasks.find(t => t.document?.id === selectedDocument.id)?.id;
      if (!taskId) {
        alert('Tâche introuvable');
        return;
      }

      await workflowAPI.validateTask(taskId, {
        status: 'approved',
        comment
      });

      setSelectedDocument(null);
      loadTasks();
      alert('Document approuvé avec succès !');
    } catch (error) {
      console.error('❌ Erreur validation:', error);
      alert('Erreur lors de la validation du document');
    }
  };

  const handleReject = async ({ comment }) => {
    if (!comment || comment.trim() === '') {
      alert('Un commentaire est obligatoire pour rejeter un document');
      return;
    }

    try {
      const taskId = tasks.find(t => t.document?.id === selectedDocument.id)?.id;
      if (!taskId) {
        alert('Tâche introuvable');
        return;
      }

      await workflowAPI.validateTask(taskId, {
        status: 'rejected',
        comment
      });

      setSelectedDocument(null);
      loadTasks();
      alert('Document rejeté');
    } catch (error) {
      console.error('❌ Erreur rejet:', error);
      alert('Erreur lors du rejet du document');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      approved: 'bg-green-100 text-green-800 border-green-300',
      rejected: 'bg-red-100 text-red-800 border-red-300'
    };

    const icons = {
      pending: <Clock className="w-4 h-4" />,
      approved: <CheckCircle className="w-4 h-4" />,
      rejected: <XCircle className="w-4 h-4" />
    };

    const labels = {
      pending: 'En attente',
      approved: 'Approuvé',
      rejected: 'Rejeté'
    };

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${styles[status]}`}>
        {icons[status]}
        {labels[status]}
      </span>
    );
  };

  // Calculs pour les métriques
  const completionRate = stats.total > 0 
    ? Math.round(((stats.approved + stats.rejected) / stats.total) * 100) 
    : 0;
  
  const approvalRate = (stats.approved + stats.rejected) > 0
    ? Math.round((stats.approved / (stats.approved + stats.rejected)) * 100)
    : 0;

  const pendingPercent = stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0;
  const approvedPercent = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;
  const rejectedPercent = stats.total > 0 ? Math.round((stats.rejected / stats.total) * 100) : 0;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des tâches...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-red-900 mb-2">Erreur de Chargement</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={loadTasks}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* En-tête */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">
            Tableau de bord Workflow
          </h1>
        </div>
        <p className="text-gray-600">
          Vue d'ensemble de vos tâches de validation
        </p>
      </div>

      {/* Statistiques principales - 4 cartes */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* En attente */}
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-l-4 border-yellow-500 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <Clock className="w-10 h-10 text-yellow-600" />
            <span className="text-4xl font-bold text-yellow-900">{stats.pending}</span>
          </div>
          <p className="text-sm font-semibold text-yellow-800">En attente</p>
          <p className="text-xs text-yellow-600 mt-1">Tâches à traiter</p>
        </div>

        {/* Approuvées */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <CheckCircle className="w-10 h-10 text-green-600" />
            <span className="text-4xl font-bold text-green-900">{stats.approved}</span>
          </div>
          <p className="text-sm font-semibold text-green-800">Approuvées</p>
          <p className="text-xs text-green-600 mt-1">Validations réussies</p>
        </div>

        {/* Rejetées */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-red-500 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <XCircle className="w-10 h-10 text-red-600" />
            <span className="text-4xl font-bold text-red-900">{stats.rejected}</span>
          </div>
          <p className="text-sm font-semibold text-red-800">Rejetées</p>
          <p className="text-xs text-red-600 mt-1">Demandes refusées</p>
        </div>

        {/* Total */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <FileText className="w-10 h-10 text-blue-600" />
            <span className="text-4xl font-bold text-blue-900">{stats.total}</span>
          </div>
          <p className="text-sm font-semibold text-blue-800">Total</p>
          <p className="text-xs text-blue-600 mt-1">Toutes les tâches</p>
        </div>
      </div>

      {/* Métriques avancées */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Taux de complétion */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Taux de complétion</h3>
            </div>
            <span className="text-2xl font-bold text-blue-600">{completionRate}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600">
            {stats.approved + stats.rejected} / {stats.total}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Pourcentage de tâches traitées (approuvées ou rejetées)
          </p>
        </div>

        {/* Taux d'approbation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Taux d'approbation</h3>
            </div>
            <span className="text-2xl font-bold text-green-600">{approvalRate}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div 
              className="bg-green-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${approvalRate}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600">
            {stats.approved} approuvées
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Pourcentage de tâches approuvées parmi celles traitées
          </p>
        </div>
      </div>

      {/* Répartition des tâches */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Répartition des tâches</h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-yellow-600 mb-2">{stats.pending}</div>
            <div className="text-sm text-gray-600 mb-1">À traiter</div>
            <div className="text-xs text-gray-500">{pendingPercent}%</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">{stats.approved}</div>
            <div className="text-sm text-gray-600 mb-1">Approuvées</div>
            <div className="text-xs text-gray-500">{approvedPercent}%</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-red-600 mb-2">{stats.rejected}</div>
            <div className="text-sm text-gray-600 mb-1">Rejetées</div>
            <div className="text-xs text-gray-500">{rejectedPercent}%</div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Filtrer:</span>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'pending'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            En attente
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'approved'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Approuvés
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'rejected'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Rejetés
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tous
          </button>
        </div>
      </div>

      {/* Liste des tâches */}
      {tasks.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Aucune tâche
          </h3>
          <p className="text-gray-600">
            {filter === 'pending' 
              ? 'Vous n\'avez aucun document en attente de validation'
              : `Aucune tâche avec le statut "${filter}"`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {task.document?.filename || task.document?.fileName || 'Document sans nom'}
                    </h3>
                    {getStatusBadge(task.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>
                        Envoyé par: {task.document?.user?.username || task.document?.uploadedBy?.username || 'Inconnu'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {task.createdAt ? new Date(task.createdAt).toLocaleDateString('fr-FR') : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>
                        Type: {task.document?.type || task.document?.documentType || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {task.comment && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Commentaire:</p>
                          <p className="text-sm text-gray-600 mt-1">{task.comment}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {task.validatedAt && (
                    <p className="text-xs text-gray-500">
                      Validé le {new Date(task.validatedAt).toLocaleString('fr-FR')}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  <button
                    onClick={() => handleViewDocument(task)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition inline-flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Voir le document
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de visualisation */}
      {selectedDocument && (
        <DocumentViewer
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
          onValidate={handleValidate}
          onReject={handleReject}
          showActions={tasks.find(t => t.document?.id === selectedDocument.id)?.status === 'pending'}
        />
      )}
    </div>
  );
};

export default WorkflowDashboard;