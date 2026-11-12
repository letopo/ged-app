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
  // Comptes tiers Sage de l'agent (propositions par matricule + décisions)
  comptesSage: (id, refresh) => api.get(`/php/patients/${id}/comptes-sage`, { params: refresh ? { refresh: 1 } : {} }),
  decideComptesSage: (id, comptes, statut) => api.put(`/php/patients/${id}/comptes-sage`, { comptes, statut }),
  addCompteSage: (id, compte) => api.post(`/php/patients/${id}/comptes-sage`, { compte }),
  parcours: (id, months) => api.get(`/php/patients/${id}/parcours`, { params: { months } }),
  resetCompteSage: (id, compte) => api.delete(`/php/patients/${id}/comptes-sage/${encodeURIComponent(compte)}`),
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
  // Tableaux de l'Excel du Point Focal
  getTableauJour: (params) => api.get('/php/stats/tableau-jour', { params }),
  getIndicateurs: (params) => api.get('/php/stats/indicateurs', { params }),
  getActivite: (params) => api.get('/php/stats/activite', { params }),
  getIndicateursConfig: () => api.get('/php/stats/indicateurs/config'),
  saveIndicateursConfig: (data) => api.put('/php/stats/indicateurs/config', data),
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

// BL PHP en attente de facturation — lecture directe de Sage (backend sageBlController)
export const sageBlAPI = {
  summary: (refresh) => api.get('/sage-bl/summary', { params: refresh ? { refresh: 1 } : {} }),
  lines: (pieces) => api.get('/sage-bl/lines', { params: { pieces: pieces.join(',') } }),
  bpcFactures: (tiers, start, end) => api.get('/sage-bl/bpc-factures', { params: { tiers, start, end } }),
  controle: (days) => api.get('/sage-bl/controle', { params: { days } }),
  dme: (from, to) => api.get('/sage-bl/dme', { params: { from, to } }),
  access: () => api.get('/sage-bl/access'),
  updateAccess: (postes) => api.put('/sage-bl/access', { postes }),
  factures: (from, to) => api.get('/sage-bl/factures', { params: { from, to } }),
  facturePdf: (piece) => api.get(`/sage-bl/factures/${encodeURIComponent(piece)}/pdf`, { responseType: 'blob' }),
  relevePdf: (date) => api.get(`/sage-bl/releve/${date}/pdf`, { responseType: 'blob' }),
  createReleve: (date, force) => api.post('/sage-bl/releve', { date, force }),
  // Facturation assistée d'un BPC
  preparations: (status) => api.get('/sage-bl/preparations', { params: { status } }),
  prepare: (data) => api.post('/sage-bl/preparations', data),
  checkPreparations: (ids) => api.post('/sage-bl/preparations/verifier', ids ? { ids } : {}),
  sendToSignature: (id, force) => api.post(`/sage-bl/preparations/${id}/signature`, { force }),
  cancelPreparation: (id, note) => api.post(`/sage-bl/preparations/${id}/annuler`, { note }),
};

// Import du classeur Excel du Point Focal (apply=false : simulation)
export const phpImportAPI = {
  importExcel: (file, apply = false) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/php/import-excel${apply ? '?apply=1' : ''}`, fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 10 * 60 * 1000 });
  },
};

// ============================================
// REGISTRE DE PHARMACIE
// ============================================
export const phpPharmacieAPI = {
  getLignes: (params) => api.get('/php/pharmacie', { params }),
  getStats: (params) => api.get('/php/pharmacie/stats', { params }),
  getProduits: (q) => api.get('/php/pharmacie/produits', { params: { q } }),
  getConsultationsDuJour: (patientId, date) => api.get('/php/pharmacie/consultations', { params: { patientId, date } }),
  create: (data) => api.post('/php/pharmacie', data),
  update: (id, data) => api.put(`/php/pharmacie/${id}`, data),
  remove: (id) => api.delete(`/php/pharmacie/${id}`),
};

export default { phpReferenceAPI, phpPatientAPI, phpConsultationAPI, phpStatsAPI, phpRendezVousAPI, phpFactureAPI };

// État de la caisse de vente pharmacie (lecture Sage) — envoi en signature Caissière → Comptable
export const caissePharmacieAPI = {
  get: (from, to) => api.get('/caisse-pharmacie', { params: { from, to } }),
  pdf: (from, to) => api.get('/caisse-pharmacie/pdf', { params: { from, to }, responseType: 'blob' }),
  create: (data) => api.post('/caisse-pharmacie', data),
  // Caisse de permanence (séances jour / nuit)
  permanence: () => api.get('/caisse-pharmacie/permanence'),
  permanenceSeances: (from, to) => api.get('/caisse-pharmacie/permanence/seances', { params: { from, to } }),
  permanenceSeance: (id) => api.get(`/caisse-pharmacie/permanence/seances/${id}`),
  permanenceRecherche: (q) => api.get('/caisse-pharmacie/permanence/recherche', { params: { q } }),
  permanenceOuvrir: (data) => api.post('/caisse-pharmacie/permanence/seances', data),
  permanenceMouvement: (id, data) => api.post(`/caisse-pharmacie/permanence/seances/${id}/mouvements`, data),
  permanenceCloturer: (id, data) => api.post(`/caisse-pharmacie/permanence/seances/${id}/cloturer`, data),
  permanenceAnnuler: (id, motif) => api.post(`/caisse-pharmacie/permanence/mouvements/${id}/annuler`, { motif }),
  permanencePdf: (id) => api.get(`/caisse-pharmacie/permanence/seances/${id}/pdf`, { responseType: 'blob' }),
  permanenceSoumettre: (id, selections) => api.post(`/caisse-pharmacie/permanence/seances/${id}/soumettre`, { selections }),
  permanenceSupprimer: (id, motif) => api.delete(`/caisse-pharmacie/permanence/seances/${id}`, { data: { motif } }),
};

// Bons de commande fournisseurs préparés dans Sage → signature (12/11/2026)
export const bonsCommandeAPI = {
  list: (params) => api.get('/sage-bons-commande', { params }),
  get: (piece) => api.get(`/sage-bons-commande/${encodeURIComponent(piece)}`),
  pdf: (piece) => api.get(`/sage-bons-commande/${encodeURIComponent(piece)}/pdf`, { responseType: 'blob' }),
  send: (piece, data) => api.post(`/sage-bons-commande/${encodeURIComponent(piece)}`, data),
};
