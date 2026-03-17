// frontend/src/services/scheduleService.js

import api from './api';

/**
 * Service pour gérer les plannings
 */
const scheduleService = {
  // ==================== SCHEDULES ====================
  
  /**
   * Récupérer tous les plannings avec filtres optionnels
   */
  getSchedules: async (filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.scheduleType) params.append('scheduleType', filters.scheduleType);
    if (filters.month) params.append('month', filters.month);
    if (filters.year) params.append('year', filters.year);
    if (filters.status) params.append('status', filters.status);
    if (filters.departmentId) params.append('departmentId', filters.departmentId);
    
    const response = await api.get(`/schedules?${params.toString()}`);
    return response.data;
  },
  
  /**
   * Récupérer un planning par ID avec toutes ses affectations
   */
  getScheduleById: async (id) => {
    const response = await api.get(`/schedules/${id}`);
    return response.data;
  },
  
  /**
   * Créer un nouveau planning
   */
  createSchedule: async (scheduleData) => {
    const response = await api.post('/schedules', scheduleData);
    return response.data;
  },
  
  /**
   * Ajouter/Mettre à jour des affectations en masse
   */
  bulkUpsertAssignments: async (scheduleId, assignments) => {
    const response = await api.post(`/schedules/${scheduleId}/assignments`, {
      assignments
    });
    return response.data;
  },
  
   updateScheduleAssignments: async (scheduleId, assignments) => {
    // On réutilise la même logique que bulkUpsertAssignments
    const response = await api.post(`/schedules/${scheduleId}/assignments`, {
      assignments
    });
    return response.data;
  },

  /**
   * Soumettre un planning pour validation
   */
  submitForValidation: async (scheduleId) => {
    const response = await api.post(`/schedules/${scheduleId}/submit`);
    return response.data;
  },
  
  /**
   * Valider ou rejeter un planning
   */
  validateSchedule: async (scheduleId, action, comments = '', rejectionReason = '') => {
    const response = await api.post(`/schedules/${scheduleId}/validate`, {
      action, // 'approve' | 'reject'
      comments,
      rejectionReason
    });
    return response.data;
  },
  
  /**
   * Récupérer l'historique des modifications
   */
  getScheduleChangesLog: async (scheduleId) => {
    const response = await api.get(`/schedules/${scheduleId}/changes-log`);
    return response.data;
  },
  
  /**
   * Supprimer un planning
   */
  deleteSchedule: async (scheduleId) => {
    const response = await api.delete(`/schedules/${scheduleId}`);
    return response.data;
  },
  
  // ==================== DEPARTMENTS ====================
  
  /**
   * Récupérer tous les départements
   */
  getDepartments: async (filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.type) params.append('type', filters.type);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive);
    
    const response = await api.get(`/departments?${params.toString()}`);
    return response.data;
  },
  
  /**
   * Récupérer un département par ID
   */
  getDepartmentById: async (id) => {
    const response = await api.get(`/departments/${id}`);
    return response.data;
  },
  
  /**
   * Créer un nouveau département
   */
  createDepartment: async (departmentData) => {
    const response = await api.post('/departments', departmentData);
    return response.data;
  },
  
  /**
   * Mettre à jour un département
   */
  updateDepartment: async (id, departmentData) => {
    const response = await api.put(`/departments/${id}`, departmentData);
    return response.data;
  },
  
  // ==================== SHIFT TYPES ====================
  
  /**
   * Récupérer tous les types de shifts
   */
  getShiftTypes: async (filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive);
    if (filters.isWorkDay !== undefined) params.append('isWorkDay', filters.isWorkDay);
    
    const response = await api.get(`/shift-types?${params.toString()}`);
    return response.data;
  },
  
  /**
   * Récupérer un type de shift par ID
   */
  getShiftTypeById: async (id) => {
    const response = await api.get(`/shift-types/${id}`);
    return response.data;
  },
  
  /**
   * Créer un nouveau type de shift
   */
  createShiftType: async (shiftTypeData) => {
    const response = await api.post('/shift-types', shiftTypeData);
    return response.data;
  },
  
  /**
   * Mettre à jour un type de shift
   */
  updateShiftType: async (id, shiftTypeData) => {
    const response = await api.put(`/shift-types/${id}`, shiftTypeData);
    return response.data;
  },
  
  // ==================== HELPERS ====================
  
  /**
   * Obtenir les labels des types de plannings
   */
  getScheduleTypeLabels: () => ({
    'administrative': 'Personnel Administratif',
    'paramedical_services': 'Paramédical - Services Hospitaliers',
    'paramedical_pharmacy': 'Paramédical - Services & Pharmacie',
    'medical_duties': 'Médecins - Astreintes et Consultations',
    'hospital_services_agents': 'Agents Services Hospitaliers',
    'general_services': 'Personnel Moyens Généraux',
    'emergency_reinforcement': 'Renforcement Opérationnel SAU',
    'weekend': 'Planning Weekend'
  }),
  
  /**
   * Obtenir les labels des statuts
   */
  getStatusLabels: () => ({
    'draft': 'Brouillon',
    'pending_dds': 'En attente DDS',
    'pending_medical': 'En attente Médecin Chef',
    'pending_dg': 'En attente DG',
    'approved': 'Validé',
    'rejected': 'Rejeté',
    'archived': 'Archivé'
  }),
  
  /**
   * Obtenir la couleur du badge de statut
   */
  getStatusColor: (status) => {
    const colors = {
      'draft': 'bg-gray-100 text-gray-800',
      'pending_dds': 'bg-blue-100 text-blue-800',
      'pending_medical': 'bg-purple-100 text-purple-800',
      'pending_dg': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800',
      'archived': 'bg-gray-100 text-gray-600'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  },
  
  /**
   * Générer les dates d'un mois
   */
  generateMonthDates: (year, month) => {
    const dates = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      dates.push({
        day,
        date: date.toISOString().split('T')[0],
        dayOfWeek: date.getDay(),
        dayName: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][date.getDay()]
      });
    }
    
    return dates;
  },
  
  /**
   * Obtenir le nom du mois
   */
  getMonthName: (month) => {
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return months[month - 1];
  },

  /**
 * Supprimer un planning
 */
deleteSchedule: async (scheduleId) => {
  const response = await api.delete(`/schedules/${scheduleId}`);
  return response.data;
}

};

export default scheduleService;