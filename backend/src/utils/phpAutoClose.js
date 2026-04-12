// backend/src/utils/phpAutoClose.js
// Clôture automatique des consultations PHP en fin de journée
// Toutes les consultations "en_cours" de la veille (ou avant) sont closes
// avec le résultat "retour_travail".
// Utilise setTimeout récursif — aucune dépendance externe requise.

import { Op } from 'sequelize';
import { ConsultationPHP } from '../models/index.js';

// ─── Clôture effective ────────────────────────────────────────────────────────
export async function cloturerConsultationsPassees() {
  const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"

  try {
    const [nbUpdated] = await ConsultationPHP.update(
      {
        resultat:            'retour_travail',
        heure_fin_consultation: new Date().toTimeString().slice(0, 5), // HH:MM
        notes: 'Clôture automatique en fin de journée (Retour au travail)',
      },
      {
        where: {
          resultat:          'en_cours',
          date_consultation: { [Op.lt]: today },   // strictement avant aujourd'hui
        },
      }
    );

    if (nbUpdated > 0) {
      console.log(`[PHP AutoClose] ✅ ${nbUpdated} consultation(s) clôturée(s) automatiquement → retour_travail`);
    } else {
      console.log('[PHP AutoClose] ℹ️  Aucune consultation en_cours à clôturer.');
    }
  } catch (err) {
    console.error('[PHP AutoClose] ❌ Erreur lors de la clôture automatique:', err.message);
  }
}

// ─── Planificateur sans cron ──────────────────────────────────────────────────
// Calcule les ms jusqu'à la prochaine minuit et replanifie à chaque fois.
function msUntilMidnight() {
  const now  = new Date();
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(0, 1, 0, 0); // 00:01 — une petite marge pour être sûr
  return next - now;
}

export function startPHPAutoCloseScheduler() {
  const ms = msUntilMidnight();
  const heureProchain = new Date(Date.now() + ms).toLocaleTimeString('fr-FR');

  console.log(`[PHP AutoClose] ⏰ Planifié à minuit (dans ${Math.round(ms / 60000)} min, ~${heureProchain})`);

  setTimeout(async () => {
    console.log('[PHP AutoClose] 🔔 Déclenchement clôture automatique...');
    await cloturerConsultationsPassees();
    // Replanifier pour le lendemain
    startPHPAutoCloseScheduler();
  }, ms);
}
