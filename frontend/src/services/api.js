// frontend/src/services/api.js - VERSION COMPLÈTE MISE À JOUR

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ============================================
// API pour l'Authentification
// ============================================
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data)
};

// ============================================
// API pour les Documents
// ============================================
export const documentsAPI = {
  getAll: () => api.get('/documents'),
  upload: (formData, onUploadProgress) => api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  }),
  delete: (documentId) => api.delete(`/documents/${documentId}`),
  updateMetadata: (documentId, data) => api.patch(`/documents/${documentId}/metadata`, data),
  getValidatedOrdreMission: () => api.get('/documents/ordres-mission/valides'),
};

// ============================================
// API pour les Listes (Services & Motifs)
// ============================================
export const listsAPI = {
  // Services
  getServices: () => api.get('/lists/services'),
  getServicesWithMembers: () => api.get('/lists/services/with-members'),
  createService: (data) => api.post('/lists/services', data),
  updateService: (serviceId, data) => api.put(`/lists/services/${serviceId}`, data),
  deleteService: (serviceId) => api.delete(`/lists/services/${serviceId}`),
  
  // Motifs
  getMotifs: (type) => api.get(`/lists/motifs?type=${type}`), // type = 'MG' ou 'Biomedical'
  createMotif: (data) => api.post('/lists/motifs', data),
  updateMotif: (motifId, data) => api.put(`/lists/motifs/${motifId}`, data),
  deleteMotif: (motifId) => api.delete(`/lists/motifs/${motifId}`),
};

// ============================================
// API pour les Services et Membres
// ============================================
export const servicesAPI = {
  getAll: () => api.get('/lists/services'),
  getServicesWithMembers: () => api.get('/lists/services/with-members'),
  getById: (serviceId) => api.get(`/lists/services/${serviceId}`),
  createService: (data) => api.post('/lists/services', data),
  updateService: (serviceId, data) => api.put(`/lists/services/${serviceId}`, data),
  deleteService: (serviceId) => api.delete(`/lists/services/${serviceId}`),
  
  // Membres du service
  getServiceMembers: (serviceId) => api.get(`/lists/services/${serviceId}/members`),
  addMember: (serviceId, data) => api.post(`/lists/services/${serviceId}/members`, data),
  updateMember: (serviceId, memberId, data) => api.put(`/lists/services/${serviceId}/members/${memberId}`, data),
  removeMember: (serviceId, memberId) => api.delete(`/lists/services/${serviceId}/members/${memberId}`),
  
  // Chef de Service
  getChefDeService: (serviceId) => api.get(`/lists/services/${serviceId}/chef`),
};

// ============================================
// API pour les Utilisateurs
// ============================================
export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (userId) => api.get(`/users/${userId}`),
  getMyService: () => api.get('/users/me/service'),
  create: (userData) => api.post('/users', userData),
  update: (userId, data) => api.put(`/users/${userId}`, data),
  delete: (userId) => api.delete(`/users/${userId}`),
  resetPassword: (userId, newPassword) => api.post(`/users/${userId}/reset-password`, { newPassword }),
  uploadSignature: (userId, formData) => api.post(`/users/${userId}/signature`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadStamp: (userId, formData) => api.post(`/users/${userId}/stamp`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// ============================================
// API pour le Workflow
// ============================================
export const workflowAPI = {
  create: (workflowData) => api.post('/workflows', workflowData),
  submitWorkflow: (workflowData) => api.post('/workflows', workflowData),
  getMyTasks: (status = 'all') => api.get(`/workflows/my-tasks?status=${status}`),
  validateTask: (taskId, data) => api.put(`/workflows/${taskId}/validate`, data),
  getDocumentWorkflow: (documentId) => api.get(`/workflows/document/${documentId}`),
  getValidators: () => api.get('/workflows/validators'),
  // ✅ NOUVEAU : Validation en masse
  bulkValidate: (data) => api.post('/workflows/bulk-validate', data),
};

// ============================================
// API pour les Notifications
// ============================================
export const notificationsAPI = {
  checkNewTasks: (timestamp) => api.get(`/notifications/new-tasks-check?since=${timestamp}`),
};

// ============================================
// API pour le Calendrier
// ============================================
export const calendarAPI = {
  getPermissions: (startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return api.get(`/calendar/permissions?${params.toString()}`);
  },
};

// ✅ NOUVEAU : API Jours fériés
export const holidaysAPI = {
  getHolidays: (year) => api.get('/holidays', { params: { year } }),
  checkHoliday: (date) => api.get('/holidays/check', { params: { date } })
};

export default api;