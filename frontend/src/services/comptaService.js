// frontend/src/services/comptaService.js — Module Comptabilité (pièces de caisse)
import api from './api';

export const comptaAPI = {
  getAll: () => api.get('/compta'),
  getById: (id) => api.get(`/compta/${id}`),
  extract: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/compta/extract', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  reextract: (documentId) => api.post(`/compta/${documentId}/reextract`),
  create: (data) => api.post('/compta', data),
  update: (id, data) => api.put(`/compta/${id}`, data),
  delete: (id) => api.delete(`/compta/${id}`),
  exportCsvPath: '/compta/export.csv',
};

export default { comptaAPI };
