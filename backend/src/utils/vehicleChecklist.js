// backend/src/utils/vehicleChecklist.js
// Check-list type d'une ambulance (proposition de départ, modifiable dans
// l'interface par la cheffe de pôle / le chef sécurité logistique), et calcul
// du résultat d'un contrôle.
//
// Types de points :
//  - check : OK / Pas OK / Absent
//  - level : niveau en % (anomalie sous `min`)
// Un point `critical` en anomalie rend le véhicule indisponible au retour.

const item = (id, label, extra = {}) => ({ id, label, kind: 'check', critical: false, ...extra });

export const DEFAULT_AMBULANCE_SECTIONS = [
  {
    key: 'vehicule',
    label: 'Véhicule',
    role: 'Chauffeur',
    askMileage: true,
    items: [
      item('carburant', 'Niveau de carburant', { kind: 'level', min: 25, critical: true }),
      item('huile', "Niveau d'huile moteur"),
      item('refroidissement', 'Liquide de refroidissement'),
      item('frein_liquide', 'Liquide de frein'),
      item('freins', 'Freins (essai)', { critical: true }),
      item('pneus', 'Pneus : état et pression', { critical: true }),
      item('roue_secours', 'Roue de secours, cric et clé'),
      item('feux', 'Feux, clignotants et feux stop'),
      item('gyrophare', 'Gyrophare et sirène', { critical: true }),
      item('essuie_glace', 'Essuie-glaces et lave-glace'),
      item('ceintures', 'Ceintures de sécurité (avant et cellule)'),
      item('extincteur', 'Extincteur (présent, non périmé)'),
      item('triangle', 'Triangle et gilet de signalisation'),
      item('papiers', 'Papiers du véhicule (carte grise, assurance, visite technique)'),
      item('telephone', 'Téléphone / radio de bord chargé'),
      item('proprete', 'Propreté de la cellule sanitaire'),
    ],
  },
  {
    key: 'materiel',
    label: 'Matériel médical',
    role: 'Infirmier / soignant',
    items: [
      item('o2_principal', "Bouteille d'oxygène principale : niveau", { kind: 'level', min: 50, critical: true }),
      item('o2_portable', "Bouteille d'oxygène portable : niveau", { kind: 'level', min: 50, critical: true }),
      item('manodetendeur', 'Manodétendeur et débitmètre'),
      item('masques_o2', 'Masques à oxygène et lunettes (adulte / enfant)'),
      item('bavu', 'Ballon auto-remplisseur (BAVU) adulte et pédiatrique', { critical: true }),
      item('aspirateur', 'Aspirateur de mucosités (fonctionnel, chargé) et sondes', { critical: true }),
      item('defibrillateur', 'Défibrillateur (chargé, électrodes non périmées)', { critical: true }),
      item('moniteur', 'Moniteur / oxymètre de pouls'),
      item('tensiometre', 'Tensiomètre et stéthoscope'),
      item('glucometre', 'Glucomètre et bandelettes'),
      item('brancard', 'Brancard principal et sangles', { critical: true }),
      item('chaise', 'Chaise portoir'),
      item('immobilisation', 'Matelas immobilisateur et attelles'),
      item('collier', 'Colliers cervicaux (adulte / enfant)'),
      item('perfusion', 'Matériel de perfusion (cathéters, perfuseurs, solutés)'),
      item('pansements', 'Pansements, compresses et bandes'),
      item('protection', 'Gants, masques et gel hydroalcoolique'),
      item('couvertures', 'Couvertures et draps'),
      item('dasri', 'Conteneur à aiguilles / DASRI'),
      item('medicaments', "Trousse de médicaments d'urgence (scellée)", { critical: true }),
    ],
  },
];

// Véhicule de service (pas de matériel médical) : une seule section, le conducteur
export const DEFAULT_SERVICE_SECTIONS = [
  {
    key: 'vehicule',
    label: 'Véhicule',
    role: 'Conducteur',
    askMileage: true,
    items: DEFAULT_AMBULANCE_SECTIONS[0].items
      .filter((it) => !['gyrophare', 'proprete'].includes(it.id))
      .concat([item('proprete_int', 'Propreté intérieure'), item('carrosserie', 'Carrosserie (rayures, chocs)')]),
  },
];

// Échéances créées avec chaque véhicule (dates à renseigner)
export const DEFAULT_DEADLINES = [
  { kind: 'assurance', label: 'Assurance', intervalMonths: 12 },
  { kind: 'visite_technique', label: 'Visite technique', intervalMonths: 12 },
  { kind: 'vidange', label: 'Vidange', intervalKm: 5000, intervalMonths: 6 },
  { kind: 'extincteur', label: 'Extincteur (contrôle)', intervalMonths: 12 },
];

export const ANSWER_LABELS = { ok: 'OK', ko: 'Pas OK', absent: 'Absent' };

/** Nettoie les sections reçues de l'interface (modèle de check-list). */
export function sanitizeSections(sections) {
  if (!Array.isArray(sections)) return null;
  const usedKeys = new Set();
  const out = [];
  for (const s of sections.slice(0, 10)) {
    const key = String(s?.key || s?.label || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
    if (!key || usedKeys.has(key)) continue;
    usedKeys.add(key);
    const itemIds = new Set();
    const items = (Array.isArray(s.items) ? s.items : []).slice(0, 80).map((it, i) => {
      let id = String(it?.id || '').replace(/[^a-z0-9_]/gi, '').slice(0, 40) || `p${i + 1}`;
      while (itemIds.has(id)) id = `${id}_${i}`;
      itemIds.add(id);
      const kind = it?.kind === 'level' ? 'level' : 'check';
      const min = kind === 'level' ? Math.min(100, Math.max(0, Math.round(Number(it?.min) || 0))) : undefined;
      return { id, label: String(it?.label || '').trim().slice(0, 200), kind, critical: !!it?.critical, ...(kind === 'level' ? { min } : {}) };
    }).filter((it) => it.label);
    out.push({
      key,
      label: String(s.label || key).trim().slice(0, 120),
      role: String(s.role || '').trim().slice(0, 80),
      askMileage: !!s.askMileage,
      items,
    });
  }
  return out;
}

/**
 * Résultat d'une section : réponses nettoyées, nombre de points vérifiés,
 * anomalies (Pas OK, Absent, niveau sous le minimum) et anomalie critique.
 */
export function evaluateAnswers(items, rawAnswers) {
  const byId = new Map((Array.isArray(rawAnswers) ? rawAnswers : []).map((a) => [String(a?.itemId), a]));
  let answered = 0;
  let anomalies = 0;
  let critical = false;
  const answers = items.map((it) => {
    const a = byId.get(it.id) || {};
    let status = ['ok', 'ko', 'absent'].includes(a.status) ? a.status : null;
    let value = null;
    if (it.kind === 'level') {
      const n = Number(a.value);
      if (a.value !== '' && a.value !== null && a.value !== undefined && Number.isFinite(n)) {
        value = Math.min(100, Math.max(0, Math.round(n)));
        if (status !== 'absent') status = value < (it.min || 0) ? 'ko' : 'ok';
      }
    }
    if (status) answered++;
    const bad = status === 'ko' || status === 'absent';
    if (bad) { anomalies++; if (it.critical) critical = true; }
    return {
      itemId: it.id,
      status,
      value,
      comment: String(a.comment || '').trim().slice(0, 500) || null,
      photoPath: typeof a.photoPath === 'string' && /^uploads\/vehicle-checks\/[\w.-]+\.(jpe?g|png)$/i.test(a.photoPath) ? a.photoPath : null,
    };
  });
  return { answers, answered, anomalies, critical, total: items.length };
}

/** Pourcentage de la check-list vérifié (pour le code couleur). */
export const completionPct = (answered, total) => (total ? Math.round((answered / total) * 100) : 0);

/** Couleur : 100 % vert, ≥ 50 % orange, > 0 jaune, 0 rouge. */
export function completionLevel(pct) {
  if (pct >= 100) return 'complet';
  if (pct >= 50) return 'moitie';
  if (pct > 0) return 'quart';
  return 'aucun';
}
