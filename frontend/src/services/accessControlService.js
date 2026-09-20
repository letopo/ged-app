// frontend/src/services/accessControlService.js
const BASE = '/api';

const h = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export const accessControlService = {
  /** Tous les utilisateurs avec leur liste de postes incluse */
  getUsersWithPostes: async () => {
    const r = await fetch(`${BASE}/users/with-postes`, { headers: h() });
    if (!r.ok) throw new Error('Impossible de charger les utilisateurs');
    return (await r.json()).users;
  },

  /** Tous les postes du système */
  getPostes: async () => {
    const r = await fetch(`${BASE}/postes`, { headers: h() });
    if (!r.ok) throw new Error('Impossible de charger les postes');
    const body = await r.json();
    return body.data || body.postes || [];
  },

  /** Modifier le rôle d'un utilisateur */
  updateRole: async (userId, role) => {
    const r = await fetch(`${BASE}/users/${userId}`, {
      method: 'PUT',
      headers: h(),
      body: JSON.stringify({ role }),
    });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new Error(body.error || 'Erreur lors de la modification du rôle');
    }
    return r.json();
  },

  /** Assigner un poste à un utilisateur */
  assignPoste: async (posteCode, userId) => {
    const r = await fetch(`${BASE}/postes/${posteCode}/holders`, {
      method: 'POST',
      headers: h(),
      body: JSON.stringify({ userId }),
    });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new Error(body.error || body.message || 'Erreur lors de l\'assignation du poste');
    }
    return r.json();
  },

  /** Retirer un poste d'un utilisateur */
  removePoste: async (posteCode, userId) => {
    const r = await fetch(`${BASE}/postes/${posteCode}/holders/${userId}`, {
      method: 'DELETE',
      headers: h(),
    });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new Error(body.error || body.message || 'Erreur lors du retrait du poste');
    }
    return r.json();
  },

  /** Activer ou désactiver un compte */
  toggleActive: async (userId, isActive) => {
    const r = await fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: h(),
      body: JSON.stringify({ isActive }),
    });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new Error(body.error || 'Erreur lors de la modification du statut');
    }
    return r.json();
  },

  /** Réinitialiser le mot de passe — retourne { newPassword } */
  resetPassword: async (userId) => {
    const r = await fetch(`/api/users/${userId}/reset-password`, {
      method: 'POST',
      headers: h(),
      body: JSON.stringify({}),
    });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new Error(body.error || 'Erreur lors de la réinitialisation');
    }
    return r.json();
  },

  /** Supprimer un utilisateur */
  deleteUser: async (userId) => {
    const r = await fetch(`/api/users/${userId}`, { method: 'DELETE', headers: h() });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new Error(body.error || 'Erreur lors de la suppression');
    }
    return r.json();
  },

  /** Journal d'audit pour un utilisateur donné (actions effectuées par lui) */
  getUserAuditLogs: async (userId, limit = 30) => {
    const params = new URLSearchParams({ userId, limit });
    const r = await fetch(`/api/audit-logs?${params}`, { headers: h() });
    if (!r.ok) return [];
    const body = await r.json();
    return body.data || [];
  },

  /** Journal d'audit filtré sur les changements de droits */
  getAccessAuditLogs: async ({ limit = 100, page = 1 } = {}) => {
    const params = new URLSearchParams({ limit, page });
    const r = await fetch(`${BASE}/audit-logs?${params}`, { headers: h() });
    if (!r.ok) throw new Error('Impossible de charger les logs');
    const body = await r.json();
    // Filtrer uniquement les actions liées aux droits
    const relevant = ['ROLE_CHANGED', 'POSTE_ASSIGNED', 'POSTE_REMOVED', 'USER_CREATED', 'USER_DELETED', 'USER_ACTIVATED', 'USER_DEACTIVATED'];
    const all = body.data || body.logs || body.auditLogs || [];
    return all.filter(l => relevant.includes(l.action));
  },
};
