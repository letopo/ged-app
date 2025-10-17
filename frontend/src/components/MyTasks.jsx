// frontend/src/components/MyTasks.jsx
import { useState, useEffect } from 'react';
import { workflowAPI } from '../services/api';
import { 
  Clock, CheckCircle, XCircle, FileText, User, 
  Calendar, Loader, Filter 
} from 'lucide-react';

export default function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending, approved, rejected, all
  const [selectedTask, setSelectedTask] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    filterTasks();
  }, [filter, tasks]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await workflowAPI.getMyTasks();
      setTasks(response.data.tasks || []);
    } catch (err) {
      setError('Erreur lors du chargement des tâches');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filterTasks = () => {
    if (filter === 'all') {
      setFilteredTasks(tasks);
    } else {
      setFilteredTasks(tasks.filter(task => task.status === filter));
    }
  };

  const handleApprove = async (taskId) => {
    if (!comment.trim()) {
      setError('Veuillez ajouter un commentaire');
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      await workflowAPI.approve(taskId, comment);
      setSuccess('Tâche approuvée avec succès !');
      setSelectedTask(null);
      setComment('');
      loadTasks();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'approbation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (taskId) => {
    if (!comment.trim()) {
      setError('Un commentaire est requis pour rejeter');
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      await workflowAPI.reject(taskId, comment);
      setSuccess('Tâche rejetée');
      setSelectedTask(null);
      setComment('');
      loadTasks();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors du rejet');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };

    const icons = {
      pending: Clock,
      approved: CheckCircle,
      rejected: XCircle
    };

    const Icon = icons[status];
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status === 'pending' ? 'En attente' : status === 'approved' ? 'Approuvé' : 'Rejeté'}
      </span>
    );
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes tâches de validation</h1>
        <p className="text-gray-600">Gérez les documents qui attendent votre validation</p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <XCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
          <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
          <span className="text-green-700">{success}</span>
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Toutes ({tasks.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'pending'
              ? 'bg-yellow-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          En attente ({tasks.filter(t => t.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'approved'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Approuvées ({tasks.filter(t => t.status === 'approved').length})
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'rejected'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Rejetées ({tasks.filter(t => t.status === 'rejected').length})
        </button>
      </div>

      {/* Liste des tâches */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucune tâche {filter !== 'all' ? `${filter === 'pending' ? 'en attente' : filter === 'approved' ? 'approuvée' : 'rejetée'}` : ''}</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {task.document.title}
                    </h3>
                    {getStatusBadge(task.status)}
                  </div>
                  <p className="text-gray-600 text-sm">{task.document.filename}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div className="flex items-center text-gray-600">
                  <User className="w-4 h-4 mr-2" />
                  Soumis par: {task.document.uploadedBy.fullName || task.document.uploadedBy.username}
                </div>
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  {formatDate(task.createdAt)}
                </div>
              </div>

              {task.comment && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-700">
                    <strong>Commentaire:</strong> {task.comment}
                  </p>
                </div>
              )}

              {task.status === 'pending' && (
                <div className="mt-4">
                  {selectedTask === task.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Ajoutez un commentaire..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows="3"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleApprove(task.id)}
                          disabled={actionLoading}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                        >
                          {actionLoading ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approuver
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleReject(task.id)}
                          disabled={actionLoading}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
                        >
                          {actionLoading ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 mr-2" />
                              Rejeter
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTask(null);
                            setComment('');
                            setError('');
                          }}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedTask(task.id)}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Traiter cette tâche
                    </button>
                  )}
                </div>
              )}

              {task.validatedAt && (
                <div className="text-sm text-gray-500 mt-4">
                  Traité le {formatDate(task.validatedAt)}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}