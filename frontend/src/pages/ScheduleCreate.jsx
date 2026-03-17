// frontend/src/pages/ScheduleCreate.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import scheduleService from '../services/scheduleService';

const ScheduleCreate = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    scheduleType: '',
    departmentId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    notes: ''
  });

  const scheduleTypeLabels = scheduleService.getScheduleTypeLabels();

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    // Générer automatiquement le titre
    if (formData.scheduleType && formData.month && formData.year) {
      const typeLabel = scheduleTypeLabels[formData.scheduleType];
      const monthName = scheduleService.getMonthName(formData.month);
      setFormData(prev => ({
        ...prev,
        title: `${typeLabel} - ${monthName} ${formData.year}`
      }));
    }
  }, [formData.scheduleType, formData.month, formData.year]);

  const loadDepartments = async () => {
    try {
      const data = await scheduleService.getDepartments({ isActive: true });
      setDepartments(data);
    } catch (error) {
      console.error('Erreur chargement départements:', error);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.scheduleType) {
      alert('Veuillez sélectionner un type de planning');
      return;
    }

    setLoading(true);

    try {
      // ✅ CORRECTION: Calcul correct des dates
      const year = parseInt(formData.year);
      const month = parseInt(formData.month);
      
      // Premier jour du mois
      const startDate = new Date(year, month - 1, 1);
      
      // Dernier jour du mois (jour 0 du mois suivant = dernier jour du mois actuel)
      const endDate = new Date(year, month, 0);

      console.log('Dates calculées:', {
        year,
        month,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });

      const scheduleData = {
        title: formData.title,
        scheduleType: formData.scheduleType,
        departmentId: formData.departmentId || null,
        month: month,
        year: year,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        notes: formData.notes || ''
      };

      console.log('Données envoyées:', scheduleData);

      const createdSchedule = await scheduleService.createSchedule(scheduleData);
      
      // Rediriger vers la page d'édition
      navigate(`/schedules/${createdSchedule.id}/edit`);
    } catch (error) {
      console.error('Erreur création planning:', error);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Erreur lors de la création du planning';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
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
        <h1 className="text-3xl font-bold text-gray-800">Nouveau Planning</h1>
        <p className="text-gray-600 mt-1">Créez un nouveau planning de rotation du personnel</p>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
        <div className="space-y-6">
          {/* Type de planning */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de planning <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.scheduleType}
              onChange={(e) => handleChange('scheduleType', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">-- Sélectionnez un type --</option>
              {Object.entries(scheduleTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Le workflow de validation sera automatiquement configuré selon le type
            </p>
          </div>

          {/* Période */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mois <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.month}
                onChange={(e) => handleChange('month', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={month} value={month}>
                    {scheduleService.getMonthName(month)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Année <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.year}
                onChange={(e) => handleChange('year', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {[2024, 2025, 2026, 2027, 2028].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Titre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titre du planning <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: Planning Personnel Administratif - Novembre 2025"
              required
            />
          </div>

          {/* Département */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Département (optionnel)
            </label>
            <select
              value={formData.departmentId}
              onChange={(e) => handleChange('departmentId', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- Aucun département spécifique --</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes / Commentaires
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ajoutez des notes ou commentaires sur ce planning..."
            />
          </div>

          {/* Info workflow */}
          {formData.scheduleType && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-1">
                    Workflow de validation
                  </h4>
                  <p className="text-sm text-blue-700">
                    {formData.scheduleType === 'general_services' && 'Validation: Directeur Général'}
                    {formData.scheduleType === 'administrative' && 'Validation: Directeur Général'}
                    {formData.scheduleType === 'emergency_reinforcement' && 'Validation: Directeur Général'}
                    {formData.scheduleType === 'paramedical_services' && 'Validation: DDS → Directeur Général'}
                    {formData.scheduleType === 'paramedical_pharmacy' && 'Validation: DDS → Directeur Général'}
                    {formData.scheduleType === 'hospital_services_agents' && 'Validation: DDS → Directeur Général'}
                    {formData.scheduleType === 'medical_duties' && 'Validation: Médecin Chef → Directeur Général'}
                    {formData.scheduleType === 'weekend' && 'Validation: DDS → Médecin Chef → Directeur Général'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
          <button
            type="button"
            onClick={() => navigate('/schedules')}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Création...
              </>
            ) : (
              'Créer et continuer'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ScheduleCreate;