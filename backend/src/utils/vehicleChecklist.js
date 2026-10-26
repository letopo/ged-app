// backend/src/utils/vehicleChecklist.js
// Check-list type d'une ambulance (proposition de départ, modifiable dans
// l'interface par la cheffe de pôle / le chef sécurité logistique), et calcul
// du résultat d'un contrôle.
//
// Types de points :
//  - check : OK / Pas OK / Absent
//  - level : niveau en % (anomalie sous `min`) ou, avec `unit: 'bar'`, pression
//            en bar (jusqu'à `max`)
// Un point `critical` en anomalie rend le véhicule indisponible au retour.

const item = (id, label, extra = {}) => ({ id, label, kind: 'check', critical: false, ...extra });
const bar = (id, label, min, extra = {}) => item(id, label, { kind: 'level', unit: 'bar', min, max: 300, ...extra });

// Matériel médical contrôlé à chaque mission (points vitaux)
const MISSION_MATERIEL_ITEMS = [
  bar('o2', "Bouteille d'oxygène : pression", 50, { critical: true }),
  item('o2_materiel', 'Manomètre, barboteuse et masques à oxygène (adulte / enfant)'),
  item('ballon', 'Ballon à oxygène (BAVU)', { critical: true }),
  item('aspirateur', 'Aspirateur à mucosités (fonctionnel)', { critical: true }),
  item('dsa', 'DSA fonctionnel (lumière verte qui clignote), électrodes et compresses', { critical: true }),
  item('brancard', 'Brancard et sangles', { critical: true }),
  item('sac', "Sac d'urgence complet (inventaire de la semaine fait)"),
  item('draps', 'Draps et couvertures de survie'),
  item('dasri', 'Boîte à aiguilles et poubelle'),
];

// Ancienne section « Matériel médical » (avant l'inventaire hebdomadaire) :
// remplacée par la version courte si elle n'a pas été modifiée.
export const LEGACY_MATERIEL_IDS = ['o2_principal', 'o2_portable', 'manodetendeur', 'masques_o2', 'bavu', 'aspirateur', 'defibrillateur', 'moniteur', 'tensiometre', 'glucometre', 'brancard', 'chaise', 'immobilisation', 'collier', 'perfusion', 'pansements', 'protection', 'couvertures', 'dasri', 'medicaments'];
export { MISSION_MATERIEL_ITEMS };

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
    // Contrôle court avant / après chaque mission : les points vitaux.
    // L'inventaire complet (quantités) se fait 3 fois par semaine.
    items: MISSION_MATERIEL_ITEMS,
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

// Niveau en % (0-100) ou pression en bar (0-max)
function levelOpts(it) {
  const unit = it?.unit === 'bar' ? 'bar' : '%';
  const max = unit === 'bar' ? Math.min(1000, Math.max(1, Math.round(Number(it?.max) || 300))) : 100;
  const min = Math.min(max, Math.max(0, Math.round(Number(it?.min) || 0)));
  return unit === 'bar' ? { unit, min, max } : { min };
}
const levelMax = (it) => (it?.unit === 'bar' ? (Number(it.max) || 300) : 100);

const slug = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);

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
      return { id, label: String(it?.label || '').trim().slice(0, 200), kind, critical: !!it?.critical, ...(kind === 'level' ? levelOpts(it) : {}) };
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
        value = Math.min(levelMax(it), Math.max(0, Math.round(n)));
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

// ── Inventaire hebdomadaire d'une ambulance ─────────────────────────────────
// Reprend la fiche papier RO SAU (« Semaine du … au … ») : quantité requise,
// quantité présente relevée le lundi, le mercredi et le vendredi, péremption
// des médicaments dans le mois, oxygène et DSA. Types de lignes :
//  - qty   : quantité présente (manque si < `required`) ; `expiry` → case
//            « périme ce mois »
//  - level : pression / niveau (anomalie sous `min`)
//  - check : OK / Pas OK
//  - yesno : simple information (Oui / Non), jamais une anomalie
const qty = (id, label, required, extra = {}) => ({ id, label, kind: 'qty', required, unit: '', critical: false, expiry: false, ...extra });
const med = (id, label, required, extra = {}) => qty(id, label, required, { expiry: true, ...extra });

export const DEFAULT_INVENTORY_DAYS = [1, 3, 5]; // lundi, mercredi, vendredi

export const DEFAULT_INVENTORY_SECTIONS = [
  {
    key: 'materiels',
    label: 'Matériels médicaux',
    items: [
      qty('tensiometre', 'Tensiomètre mécanique', 1),
      qty('stethoscope', 'Stéthoscope', 1),
      qty('saturometre', 'Saturomètre', 1),
      qty('glucometre', 'Glucomètre', 1),
      qty('thermometre', 'Thermomètre', 1),
      qty('manometre', 'Manomètre et barboteuse', 1),
      qty('ballon_o2', 'Ballon à oxygène', 1, { critical: true }),
      qty('masque_adulte', 'Masque adulte', 1),
      qty('masque_enfant', 'Masque enfant', 1),
      qty('guedel_adulte', 'Canule de Guedel adulte', 2),
      qty('guedel_enfant', 'Canule de Guedel enfant', 1),
      qty('guedel_nourrisson', 'Canule de Guedel nourrisson', 1),
      qty('aspirateur', 'Aspirateur à mucosités (manuel ou électrique)', 1, { critical: true }),
      qty('bassin', 'Bassin de lit', 1),
      qty('urinoir', 'Urinoir', 1),
      qty('plateau_pansement', 'Plateau pansement', 1),
      qty('draps', 'Draps', 2),
      qty('bouteille_o2', 'Bouteille à O2', 2),
      { id: 'pression_o2', label: 'Pression des bouteilles d\'O2 (minimum 50 bar)', kind: 'level', unit: 'bar', min: 50, max: 300, critical: true },
      { id: 'o2_utilise', label: 'Oxygène utilisé dans la semaine ?', kind: 'yesno', critical: false },
    ],
  },
  {
    key: 'consommables',
    label: 'Consommables',
    items: [
      qty('garrot_medical', 'Garrot médical', 2),
      qty('garrot_secourisme', 'Garrot secourisme', 1),
      qty('pansement_compressif', 'Pansement compressif', 1),
      qty('pansement_absorbant', 'Pansement absorbant', 2),
      qty('compresses', 'Compresses', 3, { unit: 'boîtes de 10' }),
      qty('bande_velpeau', 'Bande Velpeau', 3),
      qty('gants_soins', 'Gants de soins', 1, { unit: 'boîte' }),
      qty('gants_steriles', 'Gants stériles', 2, { unit: 'paires' }),
      qty('transfuseur', 'Transfuseur', 1),
      qty('perfuseur', 'Perfuseur', 1),
      qty('haricot', 'Haricot', 3),
      qty('seringue_5', 'Seringue 5 cc', 5),
      qty('seringue_10', 'Seringue 10 cc', 5),
      qty('seringue_20', 'Seringue 20 cc', 5),
      qty('sonde_aspiration_8', 'Sonde d\'aspiration 8', 1),
      qty('sonde_aspiration_14', 'Sonde d\'aspiration 14', 1),
      qty('sonde_aspiration_18', 'Sonde d\'aspiration 18', 1),
      qty('betadine_jaune', 'Bétadine jaune', 1, { unit: 'flacon' }),
      qty('betadine_rouge', 'Bétadine rouge', 1, { unit: 'flacon' }),
      qty('sng_10', 'Sonde nasogastrique 10', 1),
      qty('sng_12', 'Sonde nasogastrique 12', 1),
      qty('sng_16', 'Sonde nasogastrique 16', 1),
      qty('sonde_urinaire_12', 'Sonde urinaire 12', 1),
      qty('sonde_urinaire_14', 'Sonde urinaire 14', 1),
      qty('sonde_urinaire_18', 'Sonde urinaire 18', 1),
      qty('catheter_20', 'Cathéter 20', 2),
      qty('catheter_22', 'Cathéter 22', 2),
      qty('catheter_24', 'Cathéter 24', 3),
      qty('pince_epiler', 'Pince à épiler', 1),
      qty('couverture_survie', 'Couverture de survie', 3),
      qty('masque_ffp1', 'Masque FFP1', 6),
      qty('boite_aiguilles', 'Boîte à aiguilles', 1),
      qty('poubelle', 'Poubelle', 1),
      qty('casaques', 'Casaques', 3),
    ],
  },
  {
    key: 'medicaments',
    label: 'Médicaments',
    items: [
      med('serum_sale', 'Sérum salé 0,9 %', 2),
      med('ringer', 'Ringer lactate', 1),
      med('serum_glucose', 'Sérum glucosé 10 %', 1),
      med('dexamethasone', 'Dexaméthasone 4 mg inj', 4),
      med('diazepam', 'Diazépam 10 mg inj', 4),
      med('phenobarbital', 'Phénobarbital 100 mg', 2),
      med('adrenaline', 'Adrénaline', 1),
      med('paracetamol_inj', 'Paracétamol 500 mg inj', 1),
      med('atropine', 'Atropine 0,5 mg', 2),
      med('paracetamol_cp', 'Paracétamol 500 mg cp', 10, { unit: 'comprimés' }),
      med('ibuprofene', 'Ibuprofène 400 mg', 10, { unit: 'comprimés' }),
      med('ephedrine', 'Éphédrine', 1),
      med('tramadol', 'Tramadol 100 mg inj', 2),
      med('gluconate_calcium', 'Gluconate de calcium', 2),
      med('metamizole', 'Métamizole inj', 1),
      med('diclofenac', 'Diclofénac inj', 4),
      med('vogalene', 'Vogalène', 2),
    ],
  },
  {
    key: 'dsa',
    label: 'Défibrillateur (DSA)',
    items: [
      { id: 'dsa_fonctionne', label: 'DSA fonctionnel (lumière verte qui clignote)', kind: 'check', critical: true },
      qty('dsa_compresses', 'Compresses du DSA', 2),
      qty('dsa_electrodes', 'Électrodes du DSA', 1, { unit: 'paire', critical: true, expiry: true }),
    ],
  },
];

const INVENTORY_KINDS = ['qty', 'level', 'check', 'yesno'];

/** Nettoie les sections de l'inventaire reçues de l'interface. */
export function sanitizeInventorySections(sections) {
  if (!Array.isArray(sections)) return null;
  const usedKeys = new Set();
  const out = [];
  for (const s of sections.slice(0, 12)) {
    const key = slug(s?.key || s?.label);
    if (!key || usedKeys.has(key)) continue;
    usedKeys.add(key);
    const ids = new Set();
    const items = (Array.isArray(s.items) ? s.items : []).slice(0, 120).map((it, i) => {
      let id = String(it?.id || '').replace(/[^a-z0-9_]/gi, '').slice(0, 40) || `i${i + 1}`;
      while (ids.has(id)) id = `${id}_${i}`;
      ids.add(id);
      const kind = INVENTORY_KINDS.includes(it?.kind) ? it.kind : 'qty';
      const base = { id, label: String(it?.label || '').trim().slice(0, 200), kind, critical: kind === 'yesno' ? false : !!it?.critical };
      if (kind === 'qty') {
        return { ...base, required: Math.min(9999, Math.max(0, Math.round(Number(it?.required) || 0))), unit: String(it?.unit || '').trim().slice(0, 30), expiry: !!it?.expiry };
      }
      if (kind === 'level') return { ...base, ...levelOpts(it) };
      return base;
    }).filter((it) => it.label);
    out.push({ key, label: String(s.label || key).trim().slice(0, 120), items });
  }
  return out;
}

/** Jours d'inventaire (0 = dimanche … 6 = samedi). */
export function sanitizeInventoryDays(days) {
  const list = [...new Set((Array.isArray(days) ? days : []).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
  return list.length ? list : DEFAULT_INVENTORY_DAYS;
}

/**
 * Résultat d'un inventaire : réponses nettoyées, lignes relevées, manques,
 * péremptions dans le mois, anomalie critique et liste de réassort.
 */
export function evaluateInventory(sections, rawAnswers) {
  const byId = new Map((Array.isArray(rawAnswers) ? rawAnswers : []).map((a) => [String(a?.itemId), a]));
  let total = 0;
  let answered = 0;
  let shortages = 0;
  let expiring = 0;
  let critical = false;
  const answers = [];
  const restock = [];
  for (const s of sections) {
    for (const it of s.items || []) {
      if (it.kind !== 'yesno') total++;
      const a = byId.get(it.id) || {};
      const comment = String(a.comment || '').trim().slice(0, 300) || null;
      const out = { itemId: it.id, comment };
      if (it.kind === 'qty') {
        const n = Number(a.present);
        out.present = a.present === '' || a.present === null || a.present === undefined || !Number.isFinite(n) ? null : Math.min(99999, Math.max(0, Math.round(n)));
        out.expiring = !!(it.expiry && a.expiring);
        if (out.present !== null) answered++;
        const missing = out.present === null ? 0 : Math.max(0, (it.required || 0) - out.present);
        if (missing) { shortages++; if (it.critical) critical = true; }
        if (out.expiring) expiring++;
        if (missing || out.expiring) {
          restock.push({ itemId: it.id, section: s.label, label: it.label, unit: it.unit || '', required: it.required, present: out.present, missing, expiring: out.expiring });
        }
      } else if (it.kind === 'level') {
        const n = Number(a.value);
        out.value = a.value === '' || a.value === null || a.value === undefined || !Number.isFinite(n) ? null : Math.min(levelMax(it), Math.max(0, Math.round(n)));
        if (out.value !== null) {
          answered++;
          if (out.value < (it.min || 0)) {
            shortages++;
            if (it.critical) critical = true;
            restock.push({ itemId: it.id, section: s.label, label: it.label, unit: it.unit || '%', value: out.value, min: it.min, low: true });
          }
        }
      } else if (it.kind === 'check') {
        out.status = ['ok', 'ko'].includes(a.status) ? a.status : null;
        if (out.status) answered++;
        if (out.status === 'ko') {
          shortages++;
          if (it.critical) critical = true;
          restock.push({ itemId: it.id, section: s.label, label: it.label, ko: true });
        }
      } else {
        out.value = a.value === true || a.value === 'oui' ? true : a.value === false || a.value === 'non' ? false : null;
      }
      answers.push(out);
    }
  }
  return { answers, total, answered, shortages, expiring, critical, restock };
}

/** Date du jour (AAAA-MM-JJ) et jour de la semaine à Douala. */
export function doualaDay(date = new Date()) {
  const d = new Date(new Date(date).getTime() + 3600 * 1000); // UTC+1, sans heure d'été
  return { date: d.toISOString().slice(0, 10), weekday: d.getUTCDay() };
}

/** Lundi (AAAA-MM-JJ) de la semaine d'une date AAAA-MM-JJ. */
export function weekStart(dateStr) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const shift = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - shift);
  return d.toISOString().slice(0, 10);
}
