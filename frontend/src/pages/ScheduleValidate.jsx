// frontend/src/pages/ScheduleValidate.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import scheduleService from '../services/scheduleService';
import toast from 'react-hot-toast';

const ScheduleValidate = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [action, setAction] = useState(''); // 'approve' | 'reject'
  const [comments, setComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadSchedule();
  }, [id]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const data = await scheduleService.getScheduleById(id);
      setSchedule(data);
    } catch (error) {
      console.error('Erreur chargement planning:', error);
      toast('Erreur lors du chargement du planning');
      navigate('/schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (validateAction) => {
    if (validateAction === 'reject' && !rejectionReason.trim()) {
      toast('Veuillez indiquer la raison du rejet');
      return;
    }

    const confirmMessage = validateAction === 'approve'
      ? 'Êtes-vous sûr de vouloir approuver ce planning ?'
      : 'Êtes-vous sûr de vouloir rejeter ce planning ?';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setSubmitting(true);
    try {
      await scheduleService.validateSchedule(
        id,
        validateAction,
        comments,
        rejectionReason
      );

      const successMessage = validateAction === 'approve'
        ? 'Planning approuvé avec succès!'
        : 'Planning rejeté';

      toast(successMessage);
      navigate('/schedules');
    } catch (error) {
      console.error('Erreur validation:', error);
      toast(error.response?.data?.message || 'Erreur lors de la validation');
    } finally {
      setSubmitting(false);
    }
  };

  const getAssignmentsByEmployee = () => {
    if (!schedule?.assignments) return [];

    const employeeMap = {};
    schedule.assignments.forEach(assignment => {
      const empId = assignment.employeeId || assignment.userId;
      if (!employeeMap[empId]) {
        employeeMap[empId] = {
          name: assignment.employeeName || `${assignment.user?.firstName} ${assignment.user?.lastName}`,
          assignments: []
        };
      }
      employeeMap[empId].assignments.push(assignment);
    });

    return Object.values(employeeMap);
  };

  if (loading || !schedule) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const employeeAssignments = getAssignmentsByEmployee();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/schedules')}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour à la liste
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Validation du planning</h1>
            <p className="text-gray-600 mt-1">{schedule.title}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${scheduleService.getStatusColor(schedule.status)}`}>
            {scheduleService.getStatusLabels()[schedule.status]}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informations du planning */}
        <div className="lg:col-span-2 space-y-6">
          {/* Détails */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Détails du planning</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Type de planning</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {scheduleService.getScheduleTypeLabels()[schedule.scheduleType]}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Période</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {scheduleService.getMonthName(schedule.month)} {schedule.year}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Créé par</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {schedule.creator?.firstName} {schedule.creator?.lastName}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Date de création</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(schedule.createdAt).toLocaleDateString('fr-FR')}
                </dd>
              </div>
            </dl>

            {schedule.notes && (
              <div className="mt-4 pt-4 border-t">
                <dt className="text-sm font-medium text-gray-500 mb-2">Notes</dt>
                <dd className="text-sm text-gray-900 whitespace-pre-wrap">{schedule.notes}</dd>
              </div>
            )}
          </div>

          {/* Statistiques */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Statistiques</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">
                  {employeeAssignments.length}
                </div>
                <div className="text-sm text-gray-600 mt-1">Employés</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {schedule.assignments?.length || 0}
                </div>
                <div className="text-sm text-gray-600 mt-1">Affectations</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">
                  {new Date(schedule.year, schedule.month, 0).getDate()}
                </div>
                <div className="text-sm text-gray-600 mt-1">Jours</div>
              </div>
            </div>
          </div>

          {/* Aperçu des affectations */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Aperçu des affectations ({employeeAssignments.length} employés)
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {employeeAssignments.map((emp, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="font-medium text-gray-900 mb-2">{emp.name}</div>
                  <div className="flex flex-wrap gap-1">
                    {emp.assignments
                      .sort((a, b) => new Date(a.assignmentDate) - new Date(b.assignmentDate))
                      .map((assignment, idx) => (
                        <span
                          key={idx}
                          className="inline-block px-2 py-1 text-xs rounded"
                          style={{
                            backgroundColor: assignment.shiftType?.color || '#e5e7eb',
                            color: assignment.shiftType?.color && 
                              parseInt(assignment.shiftType.color.replace('#', ''), 16) > 0xffffff / 2
                              ? '#000' : '#fff'
                          }}
                          title={`${new Date(assignment.assignmentDate).toLocaleDateString('fr-FR')} - ${assignment.shiftType?.name}`}
                        >
                          {assignment.shiftCode}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel de validation */}
        <div className="space-y-6">
          {/* Workflow de validation */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Workflow de validation</h2>
            <div className="space-y-3">
              {schedule.validations?.map((validation, index) => (
                <div key={validation.id} className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    validation.status === 'approved'
                      ? 'bg-green-100 text-green-600'
                      : validation.status === 'rejected'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {validation.status === 'approved' && '✓'}
                    {validation.status === 'rejected' && '✗'}
                    {validation.status === 'pending' && index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {validation.validatorRole === 'dds' && 'Directrice des Soins'}
                      {validation.validatorRole === 'medical_chief' && 'Médecin Chef'}
                      {validation.validatorRole === 'dg' && 'Directeur Général'}
                    </div>
                    {validation.validator && (
                      <div className="text-sm text-gray-600">
                        {validation.validator.firstName} {validation.validator.lastName}
                      </div>
                    )}
                    <div className={`text-xs mt-1 ${
                      validation.status === 'approved'
                        ? 'text-green-600'
                        : validation.status === 'rejected'
                        ? 'text-red-600'
                        : 'text-gray-500'
                    }`}>
                      {validation.status === 'approved' && 'Approuvé'}
                      {validation.status === 'rejected' && 'Rejeté'}
                      {validation.status === 'pending' && 'En attente'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Formulaire de validation */}
          {schedule.status.startsWith('pending_') && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Votre décision</h2>
              
              {/* Commentaires */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commentaires (optionnel)
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ajoutez des commentaires..."
                />
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={() => handleValidate('approve')}
                  disabled={submitting}
                  className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Traitement...' : '✓ Approuver le planning'}
                </button>

                <button
                  onClick={() => setAction(action === 'reject' ? '' : 'reject')}
                  className="w-full px-4 py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors"
                >
                  ✗ Rejeter le planning
                </button>
              </div>

              {/* Raison du rejet */}
              {action === 'reject' && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <label className="block text-sm font-medium text-red-900 mb-2">
                    Raison du rejet <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Expliquez pourquoi vous rejetez ce planning..."
                  />
                  <button
                    onClick={() => handleValidate('reject')}
                    disabled={submitting || !rejectionReason.trim()}
                    className="mt-3 w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Traitement...' : 'Confirmer le rejet'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleValidate;