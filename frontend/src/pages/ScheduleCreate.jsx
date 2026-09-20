// frontend/src/pages/ScheduleCreate.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import scheduleService from '../services/scheduleService';
import toast from 'react-hot-toast';

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
      toast('Veuillez sélectionner un type de planning');
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
      toast(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    border: '1px solid var(--border)',
    background: 'var(--surface-2)',
    color: 'var(--fg)',
    borderRadius: 'var(--radius-2)',
    width: '100%',
    padding: '0.5rem 1rem'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'var(--fg-muted)',
    marginBottom: '0.5rem'
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/schedules')}
          className="flex items-center mb-4"
          style={{ color: 'var(--fg-muted)' }}
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour à la liste
        </button>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--fg)' }}>Nouveau Planning</h1>
        <p className="mt-1" style={{ color: 'var(--fg-muted)' }}>Créez un nouveau planning de rotation du personnel</p>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="rounded-lg p-6" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-1)' }}>
        <div className="space-y-6">
          {/* Type de planning */}
          <div>
            <label style={labelStyle}>
              Type de planning <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <select
              value={formData.scheduleType}
              onChange={(e) => handleChange('scheduleType', e.target.value)}
              style={inputStyle}
              required
            >
              <option value="">-- Sélectionnez un type --</option>
              {Object.entries(scheduleTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <p className="text-xs mt-1" style={{ color: 'var(--fg-subtle)' }}>
              Le workflow de validation sera automatiquement configuré selon le type
            </p>
          </div>

          {/* Période */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>
                Mois <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <select
                value={formData.month}
                onChange={(e) => handleChange('month', e.target.value)}
                style={inputStyle}
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
              <label style={labelStyle}>
                Année <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <select
                value={formData.year}
                onChange={(e) => handleChange('year', e.target.value)}
                style={inputStyle}
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
            <label style={labelStyle}>
              Titre du planning <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              style={inputStyle}
              placeholder="Ex: Planning Personnel Administratif - Novembre 2025"
              required
            />
          </div>

          {/* Département */}
          <div>
            <label style={labelStyle}>
              Département (optionnel)
            </label>
            <select
              value={formData.departmentId}
              onChange={(e) => handleChange('departmentId', e.target.value)}
              style={inputStyle}
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
            <label style={labelStyle}>
              Notes / Commentaires
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={4}
              style={inputStyle}
              placeholder="Ajoutez des notes ou commentaires sur ce planning..."
            />
          </div>

          {/* Info workflow */}
          {formData.scheduleType && (
            <div className="rounded-lg p-4" style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand)' }}>
              <div className="flex items-start">
                <svg className="w-5 h-5 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--brand)', flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium mb-1" style={{ color: 'var(--brand)' }}>
                    Workflow de validation
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--brand)' }}>
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
        <div className="flex justify-end gap-3 mt-8 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={() => navigate('/schedules')}
            className="px-6 py-2 rounded-lg font-medium transition-colors"
            style={{ border: '1px solid var(--border)', color: 'var(--fg)', background: 'var(--surface)' }}
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 rounded-lg font-medium transition-colors flex items-center"
            style={{
              background: loading ? 'var(--surface-3)' : 'var(--brand)',
              color: loading ? 'var(--fg-muted)' : '#fff',
              opacity: loading ? 0.5 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" style={{ color: 'var(--fg-muted)' }}>
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
