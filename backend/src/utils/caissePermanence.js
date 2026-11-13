// backend/src/utils/caissePermanence.js
// Règles de la caisse de permanence de la pharmacie (11/11/2026), fonctions pures.
//  - Séance de JOUR : 7 h → 16 h 30 ; séance de NUIT : 16 h 30 → 7 h le lendemain.
//    Une nuit porte la date du soir où elle commence (la nuit du 10 au 11 = 10, nuit).
//  - Espèces et Orange Money sont suivis à part : seules les espèces sont dans le
//    tiroir, comptées à la clôture et remises à la caissière suivante.
//  - Les sorties (pass remboursés, pièces de caisse, versement DG…) sont en espèces.

export const JOUR_DEBUT = 7 * 60;          // 7 h 00
export const NUIT_DEBUT = 16 * 60 + 30;     // 16 h 30
export const TZ_OFFSET_MIN = 60;            // Douala, UTC+1 sans heure d'été

export const TYPES = ['caution', 'recette', 'sortie'];
export const MODES = ['especes', 'orange_money'];
// Libellés proposés (repris du classeur) ; un libellé libre reste possible
export const LIBELLES = {
  caution: ['Caution'],
  recette: ['Pass vendu', 'Carnet', 'Autre recette'],
  sortie: ['Pass remboursé', 'Pièce de caisse', 'Versement DG', 'Autre sortie'],
};

const pad = (n) => String(n).padStart(2, '0');
const isoOf = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
export const addDays = (iso, n) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return isoOf(d); };

/** Séance en cours à un instant donné (heure de Douala). */
export function periodeAt(now = new Date()) {
  const local = new Date(now.getTime() + TZ_OFFSET_MIN * 60_000);
  const minutes = local.getUTCHours() * 60 + local.getUTCMinutes();
  const day = isoOf(local);
  if (minutes >= JOUR_DEBUT && minutes < NUIT_DEBUT) return { date: day, periode: 'jour' };
  if (minutes >= NUIT_DEBUT) return { date: day, periode: 'nuit' };
  return { date: addDays(day, -1), periode: 'nuit' };
}

/** Ordre chronologique des séances : comparable en chaîne (« 2026-11-10#1 »). */
export const seanceKey = (s) => `${s.date}#${s.periode === 'nuit' ? 1 : 0}`;
export const nextSeance = (s) => (s.periode === 'jour' ? { date: s.date, periode: 'nuit' } : { date: addDays(s.date, 1), periode: 'jour' });

/**
 * Week-end (13/11/2026) : la Caissière principale est absente du vendredi soir
 * au lundi matin. Une séance de ce créneau (vendredi nuit, samedi, dimanche jour)
 * peut être transmise de main en main sans envoi en signature : les espèces se
 * cumulent jusqu'au lundi (sauf si la caisse est arrêtée avec la DG). La nuit du
 * dimanche se termine le lundi à 7 h : elle est versée à la Caissière.
 * En semaine, une séance doit être envoyée en signature (versée) avant la suivante.
 */
export function cumulAutorise(s) {
  const jour = new Date(`${s.date}T00:00:00Z`).getUTCDay(); // 0 = dimanche, 5 = vendredi, 6 = samedi
  if (jour === 5) return s.periode === 'nuit';
  if (jour === 6) return true;
  if (jour === 0) return s.periode === 'jour';
  return false;
}

/** Nombre de séances sautées entre deux séances (0 = consécutives). */
export function seancesSautees(prev, next) {
  let n = 0;
  let cur = nextSeance(prev);
  while (seanceKey(cur) < seanceKey(next) && n < 1000) { n += 1; cur = nextSeance(cur); }
  return n;
}

/** Totaux d'une séance (mouvements annulés exclus). */
export function totauxSeance(soldeOuverture, mouvements) {
  const t = { cautions: 0, recettes: 0, sorties: 0, orangeMoney: 0, entreesEspeces: 0, nbMouvements: 0 };
  for (const m of mouvements) {
    if (m.annule) continue;
    const v = Number(m.montant) || 0;
    t.nbMouvements += 1;
    if (m.type === 'caution') t.cautions += v;
    else if (m.type === 'recette') t.recettes += v;
    else if (m.type === 'sortie') t.sorties += v;
    if (m.type !== 'sortie') {
      if (m.mode === 'orange_money') t.orangeMoney += v; else t.entreesEspeces += v;
    }
  }
  t.soldeOuverture = Number(soldeOuverture) || 0;
  t.especesTheoriques = t.soldeOuverture + t.entreesEspeces - t.sorties;
  t.totalEntrees = t.cautions + t.recettes;
  return t;
}

/** Solde courant après chaque mouvement (comme la colonne SOLDE du classeur, espèces + OM). */
export function soldesCourants(soldeOuverture, mouvements) {
  let solde = Number(soldeOuverture) || 0;
  return mouvements.map((m) => {
    if (!m.annule) solde += (m.type === 'sortie' ? -1 : 1) * (Number(m.montant) || 0);
    return solde;
  });
}

/** Billetage FCFA : { "10000": 3, "5000": 2, … } → total. */
export const COUPURES = [10000, 5000, 2000, 1000, 500, 100, 50, 25, 10, 5];
export function totalBilletage(b) {
  if (!b || typeof b !== 'object') return null;
  let total = 0;
  for (const c of COUPURES) {
    const n = Number(b[c] ?? b[String(c)] ?? 0);
    if (!Number.isInteger(n) || n < 0) return NaN;
    total += c * n;
  }
  return total;
}

/** Montant FCFA saisi : entier positif (espaces et points de milliers acceptés). */
export function parseMontant(v, { allowZero = false } = {}) {
  if (v == null || String(v).trim() === '') return null; // vide ≠ 0
  const n = Number(String(v ?? '').replace(/[\s.  ]/g, '').replace(',', '.'));
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  if (n < 0 || (!allowZero && n === 0) || n > 1e11) return null;
  return n;
}
