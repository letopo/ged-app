// frontend/src/services/phpService.js - Module PHP

import api from './api';

// ============================================
// DONNÉES DE RÉFÉRENCE
// ============================================
export const phpReferenceAPI = {
  getInfirmeries: () => api.get('/php/reference/infirmeries'),
  getInfirmerieById: (id) => api.get(`/php/reference/infirmeries/${id}`),
  createInfirmerie: (data) => api.post('/php/reference/infirmeries', data),
  updateInfirmerie: (id, data) => api.put(`/php/reference/infirmeries/${id}`, data),

  getSecteurs: (params) => api.get('/php/reference/secteurs', { params }),
  createSecteur: (data) => api.post('/php/reference/secteurs', data),
  updateSecteur: (id, data) => api.put(`/php/reference/secteurs/${id}`, data),

  getServicesMedicaux: () => api.get('/php/reference/services-medicaux'),
};

// ============================================
// PATIENTS
// ============================================
export const phpPatientAPI = {
  getAll: (params) => api.get('/php/patients', { params }),
  getById: (id) => api.get(`/php/patients/${id}`),
  getHistorique: (id) => api.get(`/php/patients/${id}/historique`),
  searchByMatricule: (matricule) => api.get(`/php/patients/search/matricule/${matricule}`),
  create: (data) => api.post('/php/patients', data),
  update: (id, data) => api.put(`/php/patients/${id}`, data),
  delete: (id, mode = 'desactiver') => api.delete(`/php/patients/${id}?mode=${mode}`),
  genererBon: (id, data) => api.post(`/php/patients/${id}/bon`, data),
};

// ============================================
// CONSULTATIONS
// ============================================
export const phpConsultationAPI = {
  getAll: (params) => api.get('/php/consultations', { params }),
  create: (data) => api.post('/php/consultations', data),
  cloturer: (id, data) => api.put(`/php/consultations/${id}/cloturer`, data),

  // Hospitalisations
  getHospitalisationsEnCours: () => api.get('/php/consultations/hospitalisations/en-cours'),
  cloturerHospitalisation: (id, data) => api.put(`/php/consultations/hospitalisations/${id}/cloturer`, data),

  // Repos
  getReposEnCours: () => api.get('/php/consultations/repos/en-cours'),
  prolongerRepos: (id, data) => api.put(`/php/consultations/repos/${id}/prolonger`, data),
};

// ============================================
// STATISTIQUES
// ============================================
export const phpStatsAPI = {
  getDashboard: () => api.get('/php/stats/dashboard'),
  getStatsDuJour: () => api.get('/php/stats/jour'),
  getStatsMensuelles: (params) => api.get('/php/stats/mensuelles', { params }),
  getStatsTempsAttente: (params) => api.get('/php/stats/temps-attente', { params }),
  getRapportMensuel: (params) => api.get('/php/stats/rapport-mensuel', { params }),
  getRapportTrimestriel: (params) => api.get('/php/stats/rapport-trimestriel', { params }),
  getPathologies: (params) => api.get('/php/stats/pathologies', { params }),
};

// ============================================
// RENDEZ-VOUS
// ============================================
export const phpRendezVousAPI = {
  getAll: (params) => api.get('/php/rendez-vous', { params }),
  getToday: () => api.get('/php/rendez-vous/today'),
  create: (data) => api.post('/php/rendez-vous', data),
  updateStatus: (id, data) => api.patch(`/php/rendez-vous/${id}/status`, data),
  delete: (id) => api.delete(`/php/rendez-vous/${id}`),
};

// ============================================
// FACTURES PRESTATAIRES (OCR / extraction IA)
// ============================================
export const phpFactureAPI = {
  getAll: () => api.get('/php/factures'),
  getById: (id) => api.get(`/php/factures/${id}`),
  // Import du scan + extraction IA en une fois (multipart).
  // Renvoie {documentId, fields, suggestedNumeroOrdre, dateReception, extractionError}
  extract: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/php/factures/extract', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  reextract: (documentId) => api.post(`/php/factures/${documentId}/reextract`),
  create: (data) => api.post('/php/factures', data),
  update: (id, data) => api.put(`/php/factures/${id}`, data),
  delete: (id) => api.delete(`/php/factures/${id}`),
  exportCsvPath: '/php/factures/export.csv',
};

// ============================================
// FACTURES PATIENT PHP — import automatique depuis Sage (supervision)
// À ne pas confondre avec phpFactureAPI ci-dessus (factures FOURNISSEURS
// scannées par la secrétaire, module totalement différent).
// ============================================
export const sageFactureAPI = {
  list: (params) => api.get('/sage-factures', { params }),
  exportPaiement: (from, to) => api.get('/sage-factures/export-paiement', { params: { from, to }, responseType: 'blob' }),
};

export default { phpReferenceAPI, phpPatientAPI, phpConsultationAPI, phpStatsAPI, phpRendezVousAPI, phpFactureAPI };
