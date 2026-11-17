// backend/src/utils/vehicleShift.js
// Prise de poste RO SAU (09/11/2026) : stock d'oxygène et anomalies de la fiche.
//
// Règle donnée par la responsable : 8 bouteilles, 2 dans chaque ambulance (IT
// et LT), 4 en réserve. Il faut passer commande quand la réserve n'a plus
// aucune bouteille pleine (4 vides en réserve) alors que chaque ambulance a
// encore ses 2 bouteilles. C'est urgent si, en plus, une ambulance a moins de
// ses 2 bouteilles : deux trajets peuvent suffire à tout consommer.

export const BOTTLES_PER_AMBULANCE = 2;

const int = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 99) : null;
};
export const cleanCount = int;

/**
 * Niveau du stock d'oxygène.
 *  - reserveFull / reserveEmpty : bouteilles pleines / vides en réserve
 *  - onboard : [{ label, bottles }] bouteilles dans chaque ambulance
 * Retourne { level: 'ok' | 'commander' | 'urgent' | null, short: [labels], total }.
 */
export function oxygenStatus({ reserveFull, reserveEmpty, onboard = [] }, perAmbulance = BOTTLES_PER_AMBULANCE) {
  const full = int(reserveFull);
  const empty = int(reserveEmpty);
  const counted = onboard.filter((o) => int(o.bottles) !== null);
  const short = counted.filter((o) => int(o.bottles) < perAmbulance).map((o) => o.label);
  const total = (full || 0) + (empty || 0) + counted.reduce((n, o) => n + int(o.bottles), 0);
  if (full === null) return { level: null, short, total };
  if (full === 0 && short.length) return { level: 'urgent', short, total };
  if (full === 0) return { level: 'commander', short, total };
  return { level: 'ok', short, total };
}

/** Le niveau d'oxygène s'est-il dégradé depuis la fiche précédente ? (alerte une seule fois) */
export function oxygenWorsened(prev, next) {
  const rank = { ok: 0, commander: 1, urgent: 2 };
  if (!next || !(next in rank) || next === 'ok') return false;
  return rank[next] > (rank[prev] ?? 0);
}

/** Article de la prise de poste → identifiant de manque (distinct de l'inventaire). */
export const shiftItemId = (itemId) => `pp_${itemId}`;

/**
 * Anomalies d'une ambulance à la prise de poste → manques (« hors service »,
 * « sous le minimum ») suivis jusqu'au réarmement, comme ceux de l'inventaire.
 */
export function shortagesFromShift(items, answers, sectionLabel = 'Prise de poste') {
  const byId = new Map((items || []).map((it) => [it.id, it]));
  const out = [];
  for (const a of answers || []) {
    const it = byId.get(a.itemId);
    if (!it || !['ko', 'absent'].includes(a.status)) continue;
    const kind = it.kind === 'level' ? 'niveau' : 'panne';
    const itemId = shiftItemId(it.id);
    out.push({ itemId, kind, label: it.label, section: sectionLabel, unit: it.unit || null, critical: !!it.critical, quantity: null, key: `${itemId}|${kind}` });
  }
  return out;
}

/** Articles relevés à la prise de poste (identifiants de manque). */
export const shiftAnsweredIds = (answers) => new Set((answers || []).filter((a) => a.status).map((a) => shiftItemId(a.itemId)));

// ─── Suivi de l'oxygène (17/11/2026) ─────────────────────────────────────────
// Bouteilles pleines d'une prise de poste : réserve pleine + bouteilles à bord.
// null si la fiche n'a pas tout compté (une ambulance sans nombre fausserait
// la consommation).
export function fullBottles(shift) {
  const reserve = int(shift?.reserveFull);
  const onboard = (shift?.vehicles || []).map((v) => int(v.bottles));
  if (reserve === null || !onboard.length || onboard.some((b) => b === null)) return null;
  return reserve + onboard.reduce((n, b) => n + b, 0);
}

/**
 * Consommation d'oxygène entre deux comptages successifs.
 *  - shifts   : prises de poste (soignant) [{ at, reserveFull, vehicles: [{ bottles }] }]
 *  - receipts : livraisons [{ at, quantity }]
 * Entre deux comptages : consommées = pleines avant + reçues entre-temps − pleines après.
 * Retourne les intervalles du plus ancien au plus récent : [{ from, to, before, received, after, used }].
 */
export function oxygenConsumption(shifts = [], receipts = []) {
  const counted = shifts
    .map((s) => ({ at: new Date(s.at ?? s.performedAt), full: fullBottles(s) }))
    .filter((s) => s.full !== null && !Number.isNaN(s.at.getTime()))
    .sort((a, b) => a.at - b.at);
  const rec = receipts
    .map((r) => ({ at: new Date(r.at), quantity: int(r.quantity) || 0 }))
    .filter((r) => !Number.isNaN(r.at.getTime()));
  const out = [];
  for (let i = 1; i < counted.length; i++) {
    const prev = counted[i - 1];
    const cur = counted[i];
    const received = rec.filter((r) => r.at > prev.at && r.at <= cur.at).reduce((n, r) => n + r.quantity, 0);
    out.push({ from: prev.at, to: cur.at, before: prev.full, received, after: cur.full, used: Math.max(0, prev.full + received - cur.full) });
  }
  return out;
}

/** Bouteilles consommées sur les `days` derniers jours (intervalles terminés dans la période). */
export function consumedSince(intervals, days, now = new Date()) {
  const since = now.getTime() - days * 86400000;
  return intervals.filter((x) => x.to.getTime() > since).reduce((n, x) => n + x.used, 0);
}
