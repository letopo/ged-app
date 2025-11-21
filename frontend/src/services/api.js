// frontend/src/services/api.js - VERSION CORRIGÉE AVEC DÉTECTION DEV/PROD

import axios from 'axios';
import { io } from 'socket.io-client';

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
// ✅ GESTION SOCKET.IO AVEC DÉTECTION DEV/PROD
// ============================================
let socket = null;

/**
 * Détermine l'URL Socket.IO selon l'environnement
 */
const getSocketUrl = () => {
  // En production (via Docker/Nginx), utiliser l'origine actuelle
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
  
  // En développement, utiliser l'URL du backend explicitement
  return import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
};

/**
 * Initialise la connexion Socket.IO
 */
export const initializeSocket = () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.warn('⚠️ Impossible d\'initialiser Socket.IO - Pas de token');
    return null;
  }

  if (socket && socket.connected) {
    console.log('✅ Socket.IO déjà connecté');
    return socket;
  }

  const socketUrl = getSocketUrl();
  
  console.log('🔌 Connexion Socket.IO vers:', socketUrl);
  console.log('🌍 Environnement:', import.meta.env.MODE);
  
  socket = io(socketUrl, {
    auth: {
      token: token
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    upgrade: true,
    rememberUpgrade: true,
    // ✅ En dev, permettre les connexions cross-origin
    withCredentials: import.meta.env.DEV
  });

  socket.on('connect', () => {
    console.log('✅ Socket.IO connecté:', socket.id);
    console.log('📡 Transport utilisé:', socket.io.engine.transport.name);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket.IO déconnecté:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Erreur connexion Socket.IO:', error.message);
    console.error('📍 URL tentée:', socketUrl);
  });

  socket.io.engine.on('upgrade', (transport) => {
    console.log('⬆️ Upgrade vers:', transport.name);
  });

  return socket;
};

/**
 * Déconnecte Socket.IO
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('🔌 Socket.IO déconnecté manuellement');
  }
};

/**
 * Récupère l'instance Socket.IO
 */
export const getSocket = () => socket;

/**
 * Écoute les notifications de nouvelles tâches
 */
export const onNewTask = (callback) => {
  if (!socket) {
    console.warn('⚠️ Socket.IO non initialisé');
    return;
  }
  socket.on('task_assigned', callback);
};

/**
 * Écoute les mises à jour de tâches
 */
export const onTaskUpdate = (callback) => {
  if (!socket) {
    console.warn('⚠️ Socket.IO non initialisé');
    return;
  }
  socket.on('task_updated', callback);
};

/**
 * Arrête d'écouter les événements
 */
export const offSocketEvent = (eventName, callback) => {
  if (!socket) return;
  socket.off(eventName, callback);
};

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
  getValidatedForPC: () => api.get('/documents/valides-pour-pc'),
};

// ============================================
// API pour les Listes (Services & Motifs)
// ============================================
export const listsAPI = {
  getServices: () => api.get('/lists/services'),
  getServicesWithMembers: () => api.get('/lists/services/with-members'),
  createService: (data) => api.post('/lists/services', data),
  updateService: (serviceId, data) => api.put(`/lists/services/${serviceId}`, data),
  deleteService: (serviceId) => api.delete(`/lists/services/${serviceId}`),
  
  getMotifs: (type) => api.get(`/lists/motifs?type=${type}`),
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
  
  getServiceMembers: (serviceId) => api.get(`/lists/services/${serviceId}/members`),
  addMember: (serviceId, data) => api.post(`/lists/services/${serviceId}/members`, data),
  updateMember: (serviceId, memberId, data) => api.put(`/lists/services/${serviceId}/members/${memberId}`, data),
  removeMember: (serviceId, memberId) => api.delete(`/lists/services/${serviceId}/members/${memberId}`),
  
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

// ============================================
// API pour les Employés (RH)
// ============================================
export const employeesAPI = {
  getAll: (params = {}) => api.get('/employees', { params }),
  getById: (employeeId) => api.get(`/employees/${employeeId}`),
  create: (employeeData) => api.post('/employees', employeeData),
  update: (employeeId, data) => api.put(`/employees/${employeeId}`, data),
  delete: (employeeId) => api.delete(`/employees/${employeeId}`),
  getByService: (serviceId) => api.get(`/employees/service/${serviceId}`),
  getServicesWithEmployees: () => api.get('/employees/services/with-employees'),
  exportCSV: () => api.get('/employees/export/csv', {
    responseType: 'blob'
  }),
  importCSV: (formData) => api.post('/employees/import/csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// ✅ API Jours fériés
export const holidaysAPI = {
  getHolidays: (year) => api.get('/holidays', { params: { year } }),
  checkHoliday: (date) => api.get('/holidays/check', { params: { date } })
};

export default api;