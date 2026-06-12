// frontend/src/services/api.js - VERSION STRICTE COMPLÈTE + FIX

import axios from 'axios';
import { io } from 'socket.io-client';

// Détection Electron : utiliser l'URL configurée par l'utilisateur
const getApiBaseUrl = () => {
  if (window.electronAPI?.isElectron && window.electronAPI?.serverUrl) {
    return `${window.electronAPI.serverUrl}/api`
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
}

// Base URL pour les fichiers statiques (uploads, signatures…)
// En navigateur : '/api' (Nginx proxy)
// En Electron  : 'http://serverUrl/api' (URL absolue nécessaire depuis file://)
export const getFileBaseUrl = () => {
  if (window.electronAPI?.serverUrl) {
    return `${window.electronAPI.serverUrl}/api`
  }
  return import.meta.env.VITE_API_URL || ''
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
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
  // Electron : utiliser l'URL serveur configurée
  if (window.electronAPI?.isElectron && window.electronAPI?.serverUrl) {
    return window.electronAPI.serverUrl
  }
  // En production (via Docker/Nginx), utiliser l'origine actuelle
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
  // En développement
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
    transports: import.meta.env.PROD ? ['polling', 'websocket'] : ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    upgrade: true,
    rememberUpgrade: true,
    // ✅ En dev, permettre les connexions cross-origin
    withCredentials: import.meta.env.DEV,
    // ✅ AJOUTER ces 3 lignes
    timeout: 10000,
    autoConnect: true,
    forceNew: false,
    timestampRequests: false
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
  console.error('🔧 Transport actuel:', socket?.io?.engine?.transport?.name || 'aucun');
  console.error('📋 Transports disponibles:', socket.io.opts.transports);
  
  if (import.meta.env.PROD) {
    console.error('💡 Vérifiez que Nginx proxie correctement /socket.io/');
    console.error('💡 Tentative avec polling en fallback...');
  }
  });

  socket.io.engine.on('upgrade', (transport) => {
    console.log('⬆️ Upgrade vers:', transport.name);
  });
  socket.io.engine.on('upgradeError', (error) => {
  console.warn('⚠️ Échec upgrade WebSocket:', error.message);
  console.log('📡 Reste en polling (fonctionnel)');
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
  getAll: (params) => api.get('/documents', { params }),
  getById: (id) => api.get(`/documents/${id}`),
  getCategories: () => api.get('/documents/categories'),
  upload: (formData, onUploadProgress) => api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  }),
  addPage: (documentId, formData) => api.post(`/documents/${documentId}/add-page`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (documentId) => api.delete(`/documents/${documentId}`),
  updateMetadata: (documentId, data) => api.patch(`/documents/${documentId}/metadata`, data),
  getValidatedOrdreMission: () => api.get('/documents/ordres-mission/valides'),
  getValidatedForPC: () => api.get('/documents/valides-pour-pc'),
  getValidatedDemandesTravaux: () => api.get('/documents/demandes-travaux/valides'),
  getNextNumero: (category) => api.get(`/documents/next-numero?category=${encodeURIComponent(category)}`),
  getArchives: () => api.get('/documents/archives'),
  archive: (id) => api.patch(`/documents/${id}/archive`),
  unarchive: (id) => api.patch(`/documents/${id}/unarchive`),
  // OnlyOffice
  getOnlyOfficeConfig: (documentId) => api.get(`/onlyoffice/config/${documentId}`),
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
  getProfile: () => api.get('/users/profile'),
};

// ============================================
// API pour le Workflow
// ============================================
export const workflowAPI = {
  create: (workflowData) => api.post('/workflows', workflowData),
  submitWorkflow: (workflowData) => api.post('/workflows', workflowData),
  
  // ✅ AJOUT IMPORTANT : La fonction qui manquait
  submitForValidation: (documentId, validatorIds) => api.post('/workflows', { documentId, validatorIds }),

  getMyTasks: (status = 'all', { page = 1, limit = 20 } = {}) =>
    api.get(`/workflows/my-tasks?status=${status}&page=${page}&limit=${limit}`),
  validateTask: (taskId, data) => api.put(`/workflows/${taskId}/validate`, data),
  getDocumentWorkflow: (documentId) => api.get(`/workflows/document/${documentId}`),
  getValidators: () => api.get('/workflows/validators'),
  bulkValidate: (data) => api.post('/workflows/bulk-validate', data),
  reassignTask: (taskId, newValidatorId) => api.put(`/workflows/${taskId}/reassign`, { newValidatorId }),
  getComments: (documentId) => api.get(`/workflows/document/${documentId}/comments`),
  addComment: (documentId, text) => api.post(`/workflows/document/${documentId}/comments`, { text }),
  relancerValidation: (documentId, motif) => api.post(`/workflows/document/${documentId}/relancer`, { motif }),
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

// ============================================
// ✅ API pour les Tickets (Système de files d'attente)
// ============================================
export const ticketAPI = {
  createTicket: (data) => api.post('/tickets', data),
  getQueue: (queueType) => api.get(`/tickets/queue/${queueType}`),
  getQueuePositions: (queueType) => api.get(`/tickets/positions/${queueType}`),
  getStatistics: (params = {}) => api.get('/tickets/statistics', { params }),
  assignToPosition: (data) => api.post('/tickets/positions/assign', data),
  unassignFromPosition: (positionId) => api.post(`/tickets/positions/${positionId}/unassign`),
  callNextPatient: (data) => api.post('/tickets/call-next', data),
  startTreatment: (ticketId) => api.post(`/tickets/${ticketId}/start`),
  transferToCaisse: (ticketId, data) => api.post(`/tickets/${ticketId}/transfer-to-caisse`, data),
  completeTicket: (ticketId, data) => api.post(`/tickets/${ticketId}/complete`, data),
  cancelTicket: (ticketId, data) => api.post(`/tickets/${ticketId}/cancel`, data),
};

// ============================================
// ✅ FONCTIONS SOCKET.IO POUR TICKETS
// ============================================
export const joinQueue = (queueType) => {
  if (!socket) return;
  socket.emit('join_queue', queueType);
};
export const leaveQueue = (queueType) => {
  if (!socket) return;
  socket.emit('leave_queue', queueType);
};
export const joinPosition = (queueType, positionNumber) => {
  if (!socket) return;
  socket.emit('join_position', { queueType, positionNumber });
};
export const leavePosition = (queueType, positionNumber) => {
  if (!socket) return;
  socket.emit('leave_position', { queueType, positionNumber });
};
export const onTicketCreated = (callback) => {
  if (!socket) return;
  socket.on('ticket_created', callback);
};
export const onTicketCalled = (callback) => {
  if (!socket) return;
  socket.on('ticket_called', callback);
};
export const onTicketCompleted = (callback) => {
  if (!socket) return;
  socket.on('ticket_completed', callback);
};
export const onQueueUpdate = (callback) => {
  if (!socket) return;
  socket.on('queue_update', callback);
};
export const onPositionUpdate = (callback) => {
  if (!socket) return;
  socket.on('position_update', callback);
};

// ============================================
// API Trello (Suivi Technique)
// ============================================
export const trelloAPI = {
  getBoard: (serviceType) => api.get(`/trello/board/${serviceType}`),
  createCard: (data) => api.post('/trello/cards', data),
  moveCard: (cardId, data) => api.put(`/trello/cards/${cardId}/move`, data),
  updateCard: (cardId, data) => api.put(`/trello/cards/${cardId}`, data),
  addComment: (cardId, data) => api.post(`/trello/cards/${cardId}/comments`, data),
  updateComment: (commentId, data) => api.put(`/trello/comments/${commentId}`, data),
  deleteComment: (commentId) => api.delete(`/trello/comments/${commentId}`),
  addAttachment: (cardId, formData) => api.post(`/trello/cards/${cardId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  syncLegacyDocs: () => api.post('/trello/sync'),
  deleteAttachment: (cardId, attachmentId) => api.delete(`/trello/cards/${cardId}/attachments/${attachmentId}`),
  getAssignees: (serviceType) => api.get(`/trello/assignees/${serviceType}`),
};

// ============================================
// API Factures (Module Invoice)
// ============================================
export const invoiceAPI = {
  getBoard: (startDate, endDate) => {
    let query = '/invoices/board';
    if (startDate && endDate) {
        query += `?startDate=${startDate}&endDate=${endDate}`;
    }
    return api.get(query);
},
  createFolder: (name, parentId) => api.post('/invoices/folders', { name, parentId }),
  updateFolder: (id, name) => api.put(`/invoices/folders/${id}`, { name }),
  deleteFolder: (id) => api.delete(`/invoices/folders/${id}`),
  moveDocument: (documentId, targetFolderId) => api.post('/invoices/move-document', { documentId, targetFolderId }),
};

// ============================================
// API pour les Demandes d'Achat
// ============================================
export const demandeAchatAPI = {
  create: (formData) => api.post('/demande-achat', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getAll: (params) => api.get('/demande-achat', { params }),
  getById: (id) => api.get(`/demande-achat/${id}`),
  update: (id, formData) => api.put(`/demande-achat/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateStatus: (id, newStatus) => api.patch(`/demande-achat/${id}/status`, { newStatus }),
  delete: (id) => api.delete(`/demande-achat/${id}`),
};

// ============================================
// API pour le GMAO (Maintenance Préventive)
// ============================================
export const gmaoAPI = {
  // Équipements
  getEquipements: (params) => api.get('/gmao/equipements', { params }),
  createEquipement: (data) => api.post('/gmao/equipements', data),
  updateEquipement: (id, data) => api.put(`/gmao/equipements/${id}`, data),
  deleteEquipement: (id) => api.delete(`/gmao/equipements/${id}`),
  // Plans
  getPlans: (params) => api.get('/gmao/plans', { params }),
  createPlan: (data) => api.post('/gmao/plans', data),
  updatePlan: (id, data) => api.put(`/gmao/plans/${id}`, data),
  deletePlan: (id) => api.delete(`/gmao/plans/${id}`),
  // Calendar
  getCalendar: (year) => api.get(`/gmao/calendar/${year}`),
  // Stats
  getStats: () => api.get('/gmao/stats'),
  // Interventions
  getInterventions: (params) => api.get('/gmao/interventions', { params }),
  getTodayInterventions: () => api.get('/gmao/interventions/today'),
  createIntervention: (data) => api.post('/gmao/interventions', data),
  updateIntervention: (id, data) => api.put(`/gmao/interventions/${id}`, data),
  deleteIntervention: (id) => api.delete(`/gmao/interventions/${id}`),
  completeIntervention: (id, data) => api.patch(`/gmao/interventions/${id}/complete`, data),
  generatePreventiveInterventions: (data) => api.post('/gmao/interventions/generate', data),
  getAnalytics: () => api.get('/gmao/analytics'),
  getRapportEquipement: (equipementId) => api.get(`/gmao/rapport/${equipementId}`),
  // Phase 4 — Contrats
  getContrats: (params) => api.get('/gmao/contrats', { params }),
  createContrat: (data) => api.post('/gmao/contrats', data),
  updateContrat: (id, data) => api.put(`/gmao/contrats/${id}`, data),
  deleteContrat: (id) => api.delete(`/gmao/contrats/${id}`),
  // Phase 4 — Pièces
  getPieces: (params) => api.get('/gmao/pieces', { params }),
  createPiece: (data) => api.post('/gmao/pieces', data),
  updatePiece: (id, data) => api.put(`/gmao/pieces/${id}`, data),
  deletePiece: (id) => api.delete(`/gmao/pieces/${id}`),
  getMouvements: (params) => api.get('/gmao/pieces/mouvements', { params }),
  createMouvement: (data) => api.post('/gmao/pieces/mouvements', data),
  // Phase 4 — Acquisitions
  getAcquisitions: (params) => api.get('/gmao/acquisitions', { params }),
  createAcquisition: (data) => api.post('/gmao/acquisitions', data),
  updateAcquisition: (id, data) => api.put(`/gmao/acquisitions/${id}`, data),
  deleteAcquisition: (id) => api.delete(`/gmao/acquisitions/${id}`),
  // Phase 4 — Budget
  getBudget: (annee) => api.get('/gmao/budget', { params: { annee } }),
  createBudgetLigne: (data) => api.post('/gmao/budget/lignes', data),
  deleteBudgetLigne: (id) => api.delete(`/gmao/budget/lignes/${id}`),
  createBudgetDepense: (data) => api.post('/gmao/budget/depenses', data),
  deleteBudgetDepense: (id) => api.delete(`/gmao/budget/depenses/${id}`),
  migrateBudget: (data) => api.post('/gmao/budget/migrate', data),
};

// ============================================
// API pour les Permissions de Templates
// ============================================
export const templatePermissionsAPI = {
  getAll: () => api.get('/template-permissions'),
  getMyTemplates: () => api.get('/template-permissions/my-templates'),
  upsert: (data) => api.post('/template-permissions', data),
  update: (id, data) => api.put(`/template-permissions/${id}`, data),
  seed: () => api.post('/template-permissions/seed'),
  getUsers: () => api.get('/template-permissions/users'),
};

// ============================================
// API pour les Preferences de Notifications
// ============================================
export const notificationPrefsAPI = {
  get: () => api.get('/notification-preferences/me'),
  update: (data) => api.put('/notification-preferences/me', data),
};

// ============================================
// API pour le Journal d'audit
// ============================================
export const auditLogAPI = {
  getAll: (params) => api.get('/audit-logs', { params }),
};

// ============================================
// API pour les Statistiques avancées
// ============================================
export const statisticsAPI = {
  get: (params) => api.get('/documents/statistics', { params }),
};

// ============================================
// API pour les Modeles de Workflow
// ============================================
export const workflowTemplatesAPI = {
  getAll: () => api.get('/workflow-templates'),
  create: (data) => api.post('/workflow-templates', data),
  update: (id, data) => api.put(`/workflow-templates/${id}`, data),
  delete: (id) => api.delete(`/workflow-templates/${id}`),
};

// ============================================
// ✅ API Form Builder
// ============================================
export const formsAPI = {
  getAll:      (params)      => api.get('/forms', { params }),
  getById:     (id)          => api.get(`/forms/${id}`),
  create:      (data)        => api.post('/forms', data),
  update:      (id, data)    => api.put(`/forms/${id}`, data),
  delete:      (id)          => api.delete(`/forms/${id}`),
  duplicate:   (id)          => api.post(`/forms/${id}/duplicate`),
  publish:     (id)          => api.patch(`/forms/${id}/publish`),
  unpublish:   (id)          => api.patch(`/forms/${id}/unpublish`),
  archive:     (id)          => api.patch(`/forms/${id}/archive`),
  getPermissions: (id)       => api.get(`/forms/${id}/permissions`),
  setPermissions: (id, perms)=> api.put(`/forms/${id}/permissions`, { permissions: perms }),
  getStats:    (id)          => api.get(`/forms/${id}/stats`),
  submitResponse:       (id, data)        => api.post(`/forms/${id}/responses`, { data }),
  getResponses:         (id, params)      => api.get(`/forms/${id}/responses`, { params }),
  getResponseById:      (id, rid)         => api.get(`/forms/${id}/responses/${rid}`),
  updateResponseStatus: (id, rid, status) => api.patch(`/forms/${id}/responses/${rid}/status`, { status }),
};

// Postes organisationnels assignables (comptable, DG, DDS…)
export const postesAPI = {
  getAll:              ()              => api.get('/postes'),
  getOrdreMissionTypes:()              => api.get('/postes/ordre-mission-types'),
  assignHolder:        (code, userId)  => api.post(`/postes/${code}/holders`, { userId }),
  removeHolder:        (code, userId)  => api.delete(`/postes/${code}/holders/${userId}`),
};

export default api;