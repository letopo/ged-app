// frontend/src/pages/SchedulesList.jsx

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import scheduleService from '../services/scheduleService';
import { useAuth } from '../contexts/AuthContext'; // ✅ Ajouter cet import

const SchedulesList = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); // ✅ Récupérer l'utilisateur connecté
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    scheduleType: '',
    year: new Date().getFullYear(),
    month: '',
    status: ''
  });

  const scheduleTypeLabels = scheduleService.getScheduleTypeLabels();
  const statusLabels = scheduleService.getStatusLabels();

  useEffect(() => {
    loadSchedules();
  }, [filters]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const data = await scheduleService.getSchedules(filters);
      setSchedules(data);
    } catch (error) {
      console.error('Erreur chargement plannings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  // ✅ Fonction pour vérifier si l'utilisateur peut supprimer
  const canDeleteSchedule = (schedule) => {
    if (!user) return false;
    
    const isAdmin = ['admin', 'dg'].includes(user.role);
    const isCreator = schedule.createdBy === user.id;
    const isDraft = schedule.status === 'draft';

    // Admin peut tout supprimer
    if (isAdmin) return true;

    // Créateur peut supprimer uniquement les brouillons
    if (isCreator && isDraft) return true;

    return false;
  };

  const handleDelete = async (schedule) => {
    const statusMessage = schedule.status !== 'draft' 
      ? '\n\n⚠️ ATTENTION: Ce planning n\'est plus en brouillon !' 
      : '';
    
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le planning "${schedule.title}" ?${statusMessage}\n\nCette action est irréversible et supprimera toutes les affectations associées.`)) {
      return;
    }

    try {
      await scheduleService.deleteSchedule(schedule.id);
      alert('Planning supprimé avec succès');
      loadSchedules();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert(error.response?.data?.message || 'Erreur lors de la suppression du planning');
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Plannings Hospitaliers</h1>
          <p className="text-gray-600 mt-1">Gestion des plannings de rotation du personnel</p>
        </div>
        <Link
          to="/schedules/create"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          + Nouveau Planning
        </Link>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Type de planning */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de planning
            </label>
            <select
              value={filters.scheduleType}
              onChange={(e) => handleFilterChange('scheduleType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous les types</option>
              {Object.entries(scheduleTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Année */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Année
            </label>
            <select
              value={filters.year}
              onChange={(e) => handleFilterChange('year', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {[2024, 2025, 2026, 2027].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Mois */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mois
            </label>
            <select
              value={filters.month}
              onChange={(e) => handleFilterChange('month', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous les mois</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month}>
                  {scheduleService.getMonthName(month)}
                </option>
              ))}
            </select>
          </div>

          {/* Statut */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Statut
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous les statuts</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Liste des plannings */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun planning trouvé</h3>
          <p className="mt-1 text-sm text-gray-500">
            Commencez par créer un nouveau planning.
          </p>
          <div className="mt-6">
            <Link
              to="/schedules/create"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              + Nouveau Planning
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Titre et type */}
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {schedule.title}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${scheduleService.getStatusColor(schedule.status)}`}>
                      {statusLabels[schedule.status]}
                    </span>
                  </div>

                  {/* Informations */}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <span>{scheduleTypeLabels[schedule.scheduleType]}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>
                        {scheduleService.getMonthName(schedule.month)} {schedule.year}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>
                        Créé par {schedule.creator?.firstName} {schedule.creator?.lastName}
                      </span>
                    </div>
                  </div>

                  {/* Workflow de validation */}
                  {schedule.validations && schedule.validations.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Validations:</span>
                      {schedule.validations.map((validation, index) => (
                        <React.Fragment key={validation.id}>
                          {index > 0 && <span className="text-gray-400">→</span>}
                          <span
                            className={`px-2 py-1 rounded ${
                              validation.status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : validation.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {validation.validatorRole === 'dds' && 'DDS'}
                            {validation.validatorRole === 'medical_chief' && 'Médecin Chef'}
                            {validation.validatorRole === 'dg' && 'DG'}
                            {validation.status === 'approved' && ' ✓'}
                            {validation.status === 'rejected' && ' ✗'}
                          </span>
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => navigate(`/schedules/${schedule.id}/view`)}
                    className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Voir détails
                  </button>

                  {schedule.status === 'draft' && (
                    <button
                      onClick={() => navigate(`/schedules/${schedule.id}/edit`)}
                      className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      Modifier
                    </button>
                  )}

                  {/* ✅ Bouton Supprimer avec logique de permissions */}
                  {canDeleteSchedule(schedule) && (
                    <button
                      onClick={() => handleDelete(schedule)}
                      className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
                      title={schedule.status !== 'draft' ? 'Admin uniquement' : 'Supprimer ce planning'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Supprimer
                    </button>
                  )}

                  {schedule.status.startsWith('pending_') && (
                    <button
                      onClick={() => navigate(`/schedules/${schedule.id}/validate`)}
                      className="px-4 py-2 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                    >
                      Valider
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SchedulesList;