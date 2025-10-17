// frontend/src/services/api.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data)
};

// Documents
export const documentsAPI = {
  getAll: (params) => api.get('/documents', { params }),
  getOne: (id) => api.get(`/documents/${id}`),
  upload: (formData, onProgress) => api.post('/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
  }),
  update: (id, data) => api.put(`/documents/${id}`, data),
  delete: (id) => api.delete(`/documents/${id}`),
  search: (query) => api.get('/documents/search', { params: { q: query } })
};

// Workflows
export const workflowAPI = {
  // Créer un workflow (soumettre pour validation)
  submitForValidation: (documentId, validatorIds) => 
    api.post('/workflows', { documentId, validatorIds }),
  
  // Récupérer mes tâches de validation
  getMyTasks: (status = null) => 
    api.get('/workflows/my-tasks', { params: status ? { status } : {} }),
  
  // Récupérer le workflow d'un document
  getDocumentWorkflow: (documentId) => 
    api.get(`/workflows/document/${documentId}`),
  
  // Approuver une tâche
  approve: (id, comment) => 
    api.put(`/workflows/${id}/approve`, { comment }),
  
  // Rejeter une tâche
  reject: (id, comment) => 
    api.put(`/workflows/${id}/reject`, { comment }),
  
  // Statistiques
  getStats: () => 
    api.get('/workflows/stats')
};

// Users
export const usersAPI = {
  getAll: () => api.get('/users'),
  getOne: (id) => api.get(`/users/${id}`)
};

export default api;