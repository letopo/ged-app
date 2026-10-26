// frontend/src/components/vehicles/fleetUi.js
// Codes couleur du parc véhicules (part de la check-list vérifiée au dernier contrôle)
export const LEVELS = {
  complet: { color: '#16a34a', bg: '#dcfce7', emoji: '🟢', label: 'Contrôlé' },
  moitie:  { color: '#ea580c', bg: '#ffedd5', emoji: '🟠', label: 'À moitié' },
  quart:   { color: '#ca8a04', bg: '#fef9c3', emoji: '🟡', label: 'Partiel' },
  aucun:   { color: '#dc2626', bg: '#fee2e2', emoji: '🔴', label: 'Non contrôlé' },
};

export const STATUS = {
  disponible:   { label: 'Disponible', color: '#16a34a', bg: '#dcfce7' },
  en_mission:   { label: 'En mission', color: '#2563eb', bg: '#dbeafe' },
  indisponible: { label: 'Indisponible', color: '#dc2626', bg: '#fee2e2' },
};

export const MISSION_STATUS = {
  planifiee: 'Prévue', en_cours: 'En cours', terminee: 'Terminée', annulee: 'Annulée',
};

export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—');

export const levelOf = (pct) => (pct >= 100 ? 'complet' : pct >= 50 ? 'moitie' : pct > 0 ? 'quart' : 'aucun');

export const WEEKDAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
export const fmtDay = (iso) => (iso ? iso.split('-').reverse().slice(0, 2).join('/') : '');

// Ouvre une fiche PDF de contrôle (récupérée avec le jeton de connexion)
export async function openCheckPdf(vehiclesAPI, checkId, kind = 'check') {
  const win = window.open('', '_blank');
  try {
    const res = kind === 'inventory' ? await vehiclesAPI.inventoryPdf(checkId) : await vehiclesAPI.checkPdf(checkId);
    const url = URL.createObjectURL(res.data);
    if (win) win.location.href = url; else window.location.href = url;
  } catch {
    win?.close();
  }
}
