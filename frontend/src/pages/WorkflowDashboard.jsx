// frontend/src/pages/WorkflowDashboard.jsx - VERSION 100% COMPLÈTE

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { workflowAPI } from '../services/api';
import DocumentViewer from '../components/DocumentViewer';
import Calendar from '../components/Calendar';
import { 
  CheckCircle, XCircle, Clock, Eye, FileText, Calendar as CalendarIcon, User, 
  MessageSquare, AlertCircle, TrendingUp, BarChart3, Loader
} from 'lucide-react';

const WorkflowDashboard = () => {
  const { user } = useAuth();
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filter, setFilter] = useState('pending');

  // Dates pour les calendriers
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
  const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

  const loadAllTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await workflowAPI.getMyTasks('all');
      // Gérer les différentes formes de réponse possibles de l'API
      const tasksData = response.data?.data || response.data?.tasks || (Array.isArray(response.data) ? response.data : []);
      setAllTasks(tasksData);
    } catch (error) {
      console.error('❌ Erreur chargement des tâches:', error);
      setError(error.message || 'Erreur lors du chargement des tâches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllTasks();
  }, []);

  const stats = useMemo(() => ({
    pending: allTasks.filter(t => t.status === 'pending').length,
    approved: allTasks.filter(t => t.status === 'approved').length,
    rejected: allTasks.filter(t => t.status === 'rejected').length,
    total: allTasks.length,
  }), [allTasks]);

  const filteredTasks = useMemo(() => {
    if (filter === 'all') return allTasks;
    return allTasks.filter(task => task.status === filter);
  }, [allTasks, filter]);

  const handleViewDocument = (task) => {
    if (!task.document) {
      alert('Les informations du document sont manquantes pour cette tâche.');
      return;
    }
    setSelectedTask(task);
  };

  const handleValidate = async ({ comment, realisePar }) => {
    if (!selectedTask) return;
    try {
      await workflowAPI.validateTask(selectedTask.id, { status: 'approved', comment, realisePar });
      setSelectedTask(null);
      loadAllTasks(); // Recharger la liste des tâches
      alert('Document approuvé avec succès !');
    } catch (error) {
      console.error('❌ Erreur validation:', error);
      const errorMessage = error.response?.data?.message || 'Erreur lors de la validation du document';
      alert(`❌ ${errorMessage}`);
    }
  };

  const handleReject = async ({ comment }) => {
    if (!comment || comment.trim() === '') {
      alert('Un commentaire est obligatoire pour rejeter un document');
      return;
    }
    if (!selectedTask) return;
    try {
      await workflowAPI.validateTask(selectedTask.id, { status: 'rejected', comment });
      setSelectedTask(null);
      loadAllTasks(); // Recharger la liste des tâches
      alert('Document rejeté');
    } catch (error) {
      console.error('❌ Erreur rejet:', error);
      const errorMessage = error.response?.data?.message || 'Erreur lors du rejet du document';
      alert(`❌ ${errorMessage}`);
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
    const labels = { pending: 'En attente', approved: 'Approuvé', rejected: 'Rejeté' };
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${styles[status]}`}>
        {icons[status]} {labels[status]}
      </span>
    );
  };

  const getFileType = (fileType) => {
    if (!fileType) return 'Inconnu';
    const types = {'application/pdf':'PDF','application/msword':'Word','application/vnd.openxmlformats-officedocument.wordprocessingml.document':'Word','image/jpeg':'JPEG','image/png':'PNG','image/jpg':'JPG'};
    return types[fileType] || fileType.split('/')[1]?.toUpperCase() || 'Fichier';
  };

  const getUserFullName = (document) => {
    const uploadedBy = document?.uploadedBy || document?.user;
    if (!uploadedBy) return 'Inconnu';
    if (uploadedBy.firstName && uploadedBy.lastName) return `${uploadedBy.firstName} ${uploadedBy.lastName}`;
    return 'Inconnu';
  };

  const completionRate = stats.total > 0 ? Math.round(((stats.approved + stats.rejected) / stats.total) * 100) : 0;
  const approvalRate = (stats.approved + stats.rejected) > 0 ? Math.round((stats.approved / (stats.approved + stats.rejected)) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="w-16 h-16 animate-spin text-blue-600" />
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
          <button onClick={loadAllTasks} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Tableau de bord Workflow</h1>
        </div>
        <p className="text-gray-600">Vue d'ensemble de vos tâches de validation</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-l-4 border-yellow-500 rounded-lg p-6 shadow-sm"><div className="flex items-center justify-between mb-3"><Clock className="w-10 h-10 text-yellow-600" /><span className="text-4xl font-bold text-yellow-900">{stats.pending}</span></div><p className="text-sm font-semibold text-yellow-800">En attente</p></div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500 rounded-lg p-6 shadow-sm"><div className="flex items-center justify-between mb-3"><CheckCircle className="w-10 h-10 text-green-600" /><span className="text-4xl font-bold text-green-900">{stats.approved}</span></div><p className="text-sm font-semibold text-green-800">Approuvées</p></div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-red-500 rounded-lg p-6 shadow-sm"><div className="flex items-center justify-between mb-3"><XCircle className="w-10 h-10 text-red-600" /><span className="text-4xl font-bold text-red-900">{stats.rejected}</span></div><p className="text-sm font-semibold text-red-800">Rejetées</p></div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500 rounded-lg p-6 shadow-sm"><div className="flex items-center justify-between mb-3"><FileText className="w-10 h-10 text-blue-600" /><span className="text-4xl font-bold text-blue-900">{stats.total}</span></div><p className="text-sm font-semibold text-blue-800">Total</p></div>
          </div>
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"><div className="flex items-center justify-between mb-4"><div className="flex items-center gap-3"><TrendingUp className="w-6 h-6 text-blue-600" /><h3 className="text-lg font-semibold text-gray-900">Taux de complétion</h3></div><span className="text-2xl font-bold text-blue-600">{completionRate}%</span></div><div className="w-full bg-gray-200 rounded-full h-3"><div className="bg-blue-600 h-3 rounded-full transition-all duration-500" style={{ width: `${completionRate}%` }}></div></div></div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"><div className="flex items-center justify-between mb-4"><div className="flex items-center gap-3"><CheckCircle className="w-6 h-6 text-green-600" /><h3 className="text-lg font-semibold text-gray-900">Taux d'approbation</h3></div><span className="text-2xl font-bold text-green-600">{approvalRate}%</span></div><div className="w-full bg-gray-200 rounded-full h-3"><div className="bg-green-600 h-3 rounded-full transition-all duration-500" style={{ width: `${approvalRate}%` }}></div></div></div>
          </div>
        </div>
        <div className="space-y-4">
          <Calendar month={currentMonth} year={currentYear} />
          <Calendar month={nextMonth} year={nextYear} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Filtrer:</span>
          <button onClick={() => setFilter('pending')} className={`px-4 py-2 rounded-lg transition ${filter === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>En attente</button>
          <button onClick={() => setFilter('approved')} className={`px-4 py-2 rounded-lg transition ${filter === 'approved' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Approuvés</button>
          <button onClick={() => setFilter('rejected')} className={`px-4 py-2 rounded-lg transition ${filter === 'rejected' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Rejetés</button>
          <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg transition ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Tous</button>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune tâche</h3>
          <p className="text-gray-600">{filter === 'pending' ? 'Vous n\'avez aucun document en attente de validation' : `Aucune tâche avec le statut "${filter}"`}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <div key={task.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">{task.document?.title || 'Document sans nom'}</h3>
                    {getStatusBadge(task.status)}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2"><User className="w-4 h-4 flex-shrink-0" /><span className="truncate">Envoyé par: {getUserFullName(task.document)}</span></div>
                    <div className="flex items-center gap-2"><CalendarIcon className="w-4 h-4 flex-shrink-0" /><span className="truncate">{task.createdAt ? new Date(task.createdAt).toLocaleDateString('fr-FR') : 'N/A'}</span></div>
                    <div className="flex items-center gap-2"><FileText className="w-4 h-4 flex-shrink-0" /><span className="truncate">Type: {getFileType(task.document?.fileType)}</span></div>
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
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  <button onClick={() => handleViewDocument(task)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition inline-flex items-center gap-2">
                    <Eye className="w-4 h-4" /> Voir le document
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTask && (
        <DocumentViewer
          document={selectedTask.document}
          onClose={() => setSelectedTask(null)}
          onValidate={handleValidate}
          onReject={handleReject}
          showActions={selectedTask.status === 'pending'}
        />
      )}
    </div>
  );
};

export default WorkflowDashboard;