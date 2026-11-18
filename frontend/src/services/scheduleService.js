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
  getStatusStyle: (status) => {
    const styles = {
      'draft':           { background: 'var(--surface-2)',    color: 'var(--fg-muted)'  },
      'pending_dds':     { background: 'var(--brand-soft)',   color: 'var(--brand)'     },
      'pending_medical': { background: 'rgba(139,92,246,0.12)', color: '#7c3aed'        },
      'pending_dg':      { background: 'var(--warning-soft)', color: 'var(--warning)'   },
      'approved':        { background: 'var(--success-soft)', color: 'var(--success)'   },
      'rejected':        { background: 'var(--danger-soft)',  color: 'var(--danger)'    },
      'archived':        { background: 'var(--surface-2)',    color: 'var(--fg-subtle)' },
    };
    return styles[status] || { background: 'var(--surface-2)', color: 'var(--fg-muted)' };
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
   * Week-ends d'un mois : chaque samedi du mois et son dimanche (qui peut tomber
   * le mois suivant). Dates au format AAAA-MM-JJ, en heure locale.
   */
  weekendsOfMonth: (year, month) => {
    const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const out = [];
    const last = new Date(year, month, 0).getDate();
    for (let day = 1; day <= last; day++) {
      const sat = new Date(year, month - 1, day);
      if (sat.getDay() !== 6) continue;
      const sun = new Date(year, month - 1, day + 1);
      out.push({ startDate: ymd(sat), endDate: ymd(sun), label: scheduleService.formatWeekend(ymd(sat), ymd(sun)) });
    }
    return out;
  },

  /** « 21-22 novembre 2026 » ou « 31 octobre - 1er novembre 2026 » */
  formatWeekend: (startDate, endDate) => {
    const [y1, m1, d1] = startDate.split('-').map(Number);
    const [y2, m2, d2] = endDate.split('-').map(Number);
    const mois = (m) => scheduleService.getMonthName(m).toLowerCase();
    const jour = (d) => (d === 1 ? '1er' : String(d));
    if (m1 === m2 && y1 === y2) return `${jour(d1)}-${jour(d2)} ${mois(m1)} ${y1}`;
    return `${jour(d1)} ${mois(m1)}${y1 !== y2 ? ` ${y1}` : ''} - ${jour(d2)} ${mois(m2)} ${y2}`;
  },

  /** Planning du week-end limité à un week-end précis (samedi → dimanche) ? */
  isSingleWeekend: (schedule) => {
    if (schedule?.scheduleType !== 'weekend' || !schedule.startDate || !schedule.endDate) return false;
    const [y, m, d] = String(schedule.startDate).slice(0, 10).split('-').map(Number);
    const start = new Date(y, m - 1, d);
    const [y2, m2, d2] = String(schedule.endDate).slice(0, 10).split('-').map(Number);
    const days = Math.round((new Date(y2, m2 - 1, d2) - start) / 86400000);
    return start.getDay() === 6 && days >= 0 && days <= 1;
  },

  /**
   * Jours affichés par un planning (grille, aperçu, PDF). Planning du week-end :
   * seulement le samedi et le dimanche du week-end choisi, ou tous les samedis
   * et dimanches du mois pour les anciens plannings. Autres : tout le mois.
   * Même format que generateMonthDates (clé `date` des affectations).
   */
  generateScheduleDates: (schedule) => {
    if (!schedule) return [];
    if (schedule.scheduleType !== 'weekend') return scheduleService.generateMonthDates(schedule.year, schedule.month);
    if (scheduleService.isSingleWeekend(schedule)) {
      const [y, m, d] = String(schedule.startDate).slice(0, 10).split('-').map(Number);
      return [0, 1].map((k) => {
        const date = new Date(y, m - 1, d + k);
        return {
          day: date.getDate(),
          date: date.toISOString().split('T')[0],
          dayOfWeek: date.getDay(),
          dayName: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][date.getDay()],
        };
      });
    }
    return scheduleService.generateMonthDates(schedule.year, schedule.month).filter((d) => d.dayOfWeek === 0 || d.dayOfWeek === 6);
  },

  /** Période lisible : « Week-end du 21-22 novembre 2026 » ou « Novembre 2026 » */
  getPeriodLabel: (schedule) => (scheduleService.isSingleWeekend(schedule)
    ? `Week-end du ${scheduleService.formatWeekend(String(schedule.startDate).slice(0, 10), String(schedule.endDate).slice(0, 10))}`
    : `${scheduleService.getMonthName(schedule.month)} ${schedule.year}`),

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