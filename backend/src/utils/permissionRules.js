// backend/src/utils/permissionRules.js
// Demande de permission : délai de prévenance.

// Première date de début autorisée pour une demande de permission : 2 jours
// OUVRABLES après aujourd'hui (heure du Cameroun), le week-end ne compte pas
// (ex. demande le vendredi → au plus tôt le mardi).
export const PERMISSION_NOTICE_DAYS = 2;

/** @returns {string} AAAA-MM-JJ */
export function permissionEarliestStart(now = new Date()) {
  const today = new Date(now).toLocaleDateString('en-CA', { timeZone: 'Africa/Douala' }); // AAAA-MM-JJ
  const d = new Date(`${today}T12:00:00Z`);
  let added = 0;
  while (added < PERMISSION_NOTICE_DAYS) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) added++;
  }
  return d.toISOString().slice(0, 10);
}

/** Les administrateurs peuvent demander une permission sans délai. */
export const isPermissionNoticeExempt = (user) => ['admin', 'superadmin'].includes(user?.role);
