// backend/src/utils/phpExcelImport.js
// Import du classeur du Point Focal (HSJM_Gestion_v3.xlsm) dans le module PHP.
//
// L'Excel reste l'outil de saisie pendant la transition : l'import se relance
// autant de fois que nécessaire, sans doublon.
//  - Chaque ligne est repérée par sa colonne N° (excel_ref « C:123 », « H:45 »…).
//  - Les lignes importées avant cette version (script Python, sans excel_ref)
//    sont retrouvées par patient + date (+ service + diagnostic) et reçoivent
//    leur excel_ref au lieu d'être recréées.
//  - Les deux formats de la feuille Consultations sont compris : jusqu'en mars
//    2026, colonnes Devenir / Repos ; depuis avril, sous les mêmes titres,
//    n° d'ordre du jour / type de visite (CS, RDV, AUTRE) / heures d'arrivée
//    et de passage.
//  - Les noms de services sont uniformisés (GASTRO, GASTROLOGUE → GASTROENTEROLOGIE…).
// Simulation par défaut (apply=false) : rien n'est écrit, le rapport dit ce qui changerait.
import ExcelJS from 'exceljs';
import crypto from 'crypto';
import { sequelize } from '../models/index.js';
import {
  Infirmerie, Secteur, PatientPHP, BonPriseEnCharge, ConsultationPHP,
  HospitalisationPHP, OperationPHP, ReposPHP, DecesTransfertPHP,
} from '../models/index.js';

// ── Lecture des cellules ─────────────────────────────────────────────────────

function raw(v) {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'object') {
    if ('result' in v) return raw(v.result);          // formule
    if (Array.isArray(v.richText)) return v.richText.map(t => t.text).join('');
    if ('text' in v) return raw(v.text);              // lien
    return null;
  }
  return v;
}

const text = (v, max = 500) => {
  const r = raw(v);
  if (r === null || r instanceof Date) return null;
  const s = String(r).replace(/\s+/g, ' ').trim();
  return s ? s.slice(0, max) : null;
};
const upper = (v, max) => text(v, max)?.toUpperCase() ?? null;

// Date du jour (AAAA-MM-JJ) : cellule date Excel ou texte jj/mm/aaaa
export function toDay(v) {
  const r = raw(v);
  if (r instanceof Date) return Number.isNaN(r.getTime()) ? null : r.toISOString().slice(0, 10);
  if (typeof r === 'string') {
    const m = r.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
    if (m) {
      const y = m[3].length === 2 ? `20${m[3]}` : m[3];
      return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    }
  }
  return null;
}

// Heure « 07H33 », « 8H », « 08:30 » ou cellule heure Excel → « HH:MM:00 »
export function toTime(v) {
  const r = raw(v);
  if (r instanceof Date) return `${String(r.getUTCHours()).padStart(2, '0')}:${String(r.getUTCMinutes()).padStart(2, '0')}:00`;
  if (typeof r === 'number' && r > 0 && r < 1) {
    const min = Math.round(r * 24 * 60);
    return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}:00`;
  }
  const m = String(r ?? '').trim().match(/^(\d{1,2})\s*[hH:]\s*(\d{0,2})$/);
  if (!m) return null;
  const h = Number(m[1]); const mi = Number(m[2] || 0);
  if (h > 23 || mi > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}:00`;
}

const minutes = (t) => (t ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) : null);

// Matricule : nombre (100049) ou texte numérique ; le reste (« PHP », vide) est refusé
export function toMatricule(v) {
  const r = raw(v);
  if (typeof r === 'number' && Number.isFinite(r)) return String(Math.trunc(r));
  const first = String(r ?? '').trim().split(/\s+/)[0];
  return /^\d{3,}$/.test(first) ? first : null;
}

const toInt = (v) => {
  const r = raw(v);
  if (typeof r === 'number' && Number.isFinite(r)) return Math.trunc(r);
  const m = String(r ?? '').match(/\d+/);
  return m ? Number(m[0]) : null;
};

// ── Uniformisation ───────────────────────────────────────────────────────────

const SERVICE_RULES = [
  [/^(MEDECINE|MEDECIN)\b/, 'MEDECINE'],
  [/^GASTR/, 'GASTROENTEROLOGIE'],
  [/^(OPH|OPT)/, 'OPHTALMOLOGIE'],
  [/^URO/, 'UROLOGIE'],
  [/^GYN/, 'GYNECOLOGIE'],
  [/^CARDIO/, 'CARDIOLOGIE'],
  [/^KINE/, 'KINESITHERAPIE'],
  [/^S\s*A\s*U$/, 'SAU'],
  [/^LABO/, 'LABORATOIRE'],
  [/^PHARMA/, 'PHARMACIE'],
  [/^RADIO/, 'RADIOLOGIE'],
  [/^(DENT|STOMATO)/, 'DENTISTE'],
  [/^CHIR/, 'CHIRURGIE'],
  [/^PEDIA/, 'PEDIATRIE'],
];
export function normalizeService(v) {
  const s = upper(v, 255);
  if (!s) return null;
  for (const [re, name] of SERVICE_RULES) if (re.test(s)) return name;
  return s;
}

// Colonne « Repos (jrs) » devenue type de visite (fautes de frappe comprises)
export function toTypeVisite(v) {
  const s = upper(v, 60);
  if (!s) return null;
  if (/^(RDV|RVD|RVDV|DRV|RENDEZ)/.test(s)) return 'RDV';
  if (/^CS\b/.test(s) || s === 'CS') return 'CS';
  if (/^AUTRE/.test(s) || /^(PHARMA|PHAMA|ECHO|PST|LABO)/.test(s)) return 'AUTRE';
  return null;
}

const DEVENIR = [
  [/^REPOS/, 'repos'], [/^HOSPI/, 'hospitalisation'], [/^OP[EÉ]R/, 'operation'],
  [/^D[EÉ]C[EÈ]S/, 'deces'], [/^TRANSF/, 'transfert'],
];
const toResultat = (v) => {
  const s = upper(v, 60);
  if (!s) return null;
  for (const [re, r] of DEVENIR) if (re.test(s)) return r;
  return null;
};

// Code infirmerie saisi à la main : « INF_PHP BAS », « INF_PHP/BAS », « INF_ NYOMBE »… → « INF_PHP_BAS »
const INFIRMERIE_ALIASES = { INF_NJOMBE: 'INF_NYOMBE', INF_PHP: 'INF_PHP_BAS' };
export function normalizeInfirmerie(v) {
  const s = upper(v, 50);
  if (!s) return null;
  const code = s.replace(/[^A-Z0-9]+/g, '_').replace(/_+/g, '_').replace(/_$/, '');
  return INFIRMERIE_ALIASES[code] || code;
}

// Date future = jour et mois inversés à la saisie (06/11 pour le 11/06) : on
// remet dans l'ordre si cela donne une date passée, sinon la ligne est ignorée.
export function fixFutureDay(day, today = new Date().toISOString().slice(0, 10)) {
  if (!day || day <= today) return { day };
  const [y, m, d] = day.split('-');
  const swapped = `${y}-${d}-${m}`;
  if (Number(d) <= 12 && !Number.isNaN(Date.parse(swapped)) && swapped <= today) return { day: swapped, fixed: true };
  return { day: null };
}

const shortHash = (...parts) => crypto.createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 16);

// ── Lecture du classeur ──────────────────────────────────────────────────────

function sheetRows(wb, name, firstRow = 4) {
  const ws = wb.getWorksheet(name);
  if (!ws) return [];
  const rows = [];
  ws.eachRow({ includeEmpty: false }, (row, n) => { if (n >= firstRow) rows.push({ n, v: row.values }); });
  return rows;
}

const isPlaceholder = (value, header) => value && header && value.toUpperCase() === header.toUpperCase();

/** Lit le classeur et renvoie des enregistrements normalisés + avertissements. */
export async function parsePhpWorkbook(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  if (!wb.getWorksheet('Consultations')) throw new Error('Feuille « Consultations » introuvable : ce n\'est pas le classeur du Point Focal.');
  const skipped = {};
  const corrected = [];
  const skip = (sheet, reason) => { skipped[sheet] ??= {}; skipped[sheet][reason] = (skipped[sheet][reason] || 0) + 1; };

  const infirmeries = sheetRows(wb, 'DB_Infirmeries')
    .map(({ v }) => ({ code: normalizeInfirmerie(v[2]), localisation: text(v[3], 255) }))
    .filter(r => r.code);
  const secteurs = sheetRows(wb, 'DB_Secteurs')
    .map(({ v }) => ({ nom: upper(v[2], 255), infirmerie: normalizeInfirmerie(v[3]) }))
    .filter(r => r.nom);
  const patients = [];
  for (const { v } of sheetRows(wb, 'DB_Patients')) {
    const matricule = toMatricule(v[1]);
    const nom = upper(v[2], 255);
    if (!matricule || !nom) { if (v[1] || v[2]) skip('Patients', 'matricule ou nom absent'); continue; }
    patients.push({ matricule, nomComplet: nom, secteur: upper(v[3], 255), infirmerie: normalizeInfirmerie(v[4]) });
  }

  const consultations = [];
  for (const { n, v } of sheetRows(wb, 'Consultations')) {
    const lu = toDay(v[2]);
    const matricule = toMatricule(v[3]);
    if (!lu && !matricule && !text(v[4])) continue; // ligne vide
    const { day, fixed } = fixFutureDay(lu);
    if (!day) { skip('Consultations', lu ? 'date dans le futur' : 'date absente'); continue; }
    if (fixed) corrected.push({ feuille: 'Consultations', n: toInt(v[1]), lu, corrige: day });
    if (!matricule) { skip('Consultations', 'matricule absent ou non numérique'); continue; }
    const num = toInt(v[1]);
    const service = normalizeService(v[8]);
    const diagnostic = upper(v[7], 2000);
    const type = toTypeVisite(v[10]);
    const iCol = raw(v[9]);
    // Format depuis avril 2026 : I = n° d'ordre, J = type, K = arrivée, L = passage
    const numeroOrdre = type && typeof iCol === 'number' ? Math.trunc(iCol) : (type ? toInt(iCol) : null);
    const heureArrivee = toTime(v[11]);
    const heurePassage = toTime(v[12]);
    const attente = heureArrivee && heurePassage ? minutes(heurePassage) - minutes(heureArrivee) : null;
    consultations.push({
      ref: Number.isInteger(num) && /^\s*\d+\s*$/.test(String(raw(v[1]))) ? `C:${num}` : `C:h${shortHash(day, matricule, service, diagnostic, n)}`,
      num, day, matricule,
      nomComplet: upper(v[4], 255), secteur: upper(v[5], 255), infirmerie: normalizeInfirmerie(v[6]),
      diagnostic, service, serviceBrut: upper(v[8], 255),
      typeVisite: type,
      numeroOrdre,
      resultat: (!type && toResultat(iCol)) || 'retour_travail',
      heureArrivee, heurePassage,
      dureeAttenteMinutes: attente !== null && attente >= 0 ? attente : null,
    });
  }

  const hospitalisations = [];
  for (const { v } of sheetRows(wb, 'Hospitalisations')) {
    const num = toInt(v[1]); const day = toDay(v[2]); const matricule = toMatricule(v[3]);
    if (!day && !matricule) continue;
    if (!day || !matricule || num === null) { skip('Hospitalisations', 'date, matricule ou N° absent'); continue; }
    const sortie = toDay(v[10]);
    const chambre = text(v[8], 50); const repos = text(v[11]);
    hospitalisations.push({
      ref: `H:${num}`, day, matricule, nomComplet: upper(v[4], 255), secteur: upper(v[5], 255), infirmerie: normalizeInfirmerie(v[6]),
      service: normalizeService(v[7]) || 'HOSPITALISATION',
      chambre: isPlaceholder(chambre, 'Chambre/Lit') ? null : chambre,
      diagnostic: upper(v[9], 2000), sortie,
      reposJours: isPlaceholder(repos, 'Nombre de jours de repos') ? null : toInt(v[11]),
    });
  }

  const operations = [];
  for (const { v } of sheetRows(wb, 'Operations')) {
    const num = toInt(v[1]); const day = toDay(v[2]); const matricule = toMatricule(v[3]);
    if (!day && !matricule) continue;
    if (!day || !matricule || num === null) { skip('Opérations', 'date, matricule ou N° absent'); continue; }
    operations.push({
      ref: `O:${num}`, day, matricule, nomComplet: upper(v[4], 255), secteur: upper(v[5], 255), infirmerie: normalizeInfirmerie(v[6]),
      service: normalizeService(v[7]) || 'CHIRURGIE', diagnostic: upper(v[8], 2000),
      sortie: toDay(v[9]), reposJours: toInt(v[10]), notes: text(v[11], 2000),
    });
  }

  const repos = [];
  for (const { v } of sheetRows(wb, 'Repos')) {
    const num = toInt(v[1]); const debut = toDay(v[9]); const matricule = toMatricule(v[3]);
    if (!debut && !matricule) continue;
    if (!debut || !matricule || num === null) { skip('Repos', 'date de début, matricule ou N° absent'); continue; }
    const jours = toInt(v[10]) || 0;
    const fin = toDay(v[11]) || new Date(Date.parse(debut) + jours * 86400000).toISOString().slice(0, 10);
    const statut = upper(v[13], 20);
    const historique = text(v[16], 2000);
    repos.push({
      ref: `R:${num}`, consultationRef: toInt(v[2]) !== null ? `C:${toInt(v[2])}` : null,
      day: debut, fin, matricule, nomComplet: upper(v[4], 255), secteur: upper(v[5], 255), infirmerie: normalizeInfirmerie(v[6]),
      dureeJours: toInt(v[15]) || jours,
      status: statut === 'CLOTURE' ? 'termine' : statut === 'PROLONGE' || (toInt(v[14]) || 0) > 0 ? 'prolonge' : 'en_cours',
      prolongations: historique ? historique.split(/[;|]/).map(p => p.trim()).filter(Boolean).map(periode => ({ periode })) : [],
      motif: upper(v[8], 2000), service: normalizeService(v[7]),
    });
  }

  const deces = [];
  for (const { v } of sheetRows(wb, 'DecesTransferts')) {
    const num = toInt(v[1]); const day = toDay(v[2]); const matricule = toMatricule(v[3]);
    if (!day && !matricule) continue;
    if (!day || !matricule || num === null) { skip('Décès / transferts', 'date, matricule ou N° absent'); continue; }
    const type = /TRANSF/.test(upper(v[8], 30) || '') ? 'transfert' : 'deces';
    deces.push({
      ref: `D:${num}`, day, matricule, nomComplet: upper(v[4], 255), secteur: upper(v[5], 255), infirmerie: normalizeInfirmerie(v[6]),
      type, diagnostic: upper(v[9], 2000), destination: text(v[10], 500), motif: text(v[11], 2000), notes: text(v[12], 2000),
    });
  }

  return { infirmeries, secteurs, patients, consultations, hospitalisations, operations, repos, deces, skipped, corrected };
}

// ── Application ──────────────────────────────────────────────────────────────

const splitName = (full) => {
  const [nom, ...rest] = (full || '').split(' ');
  return { nom: nom || full, prenom: rest.join(' ') || null };
};
const secteurCode = (nom) => `SEC_${nom.replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '')}`.slice(0, 100);
const titleCase = (s) => (s || '').toLowerCase().replace(/(^|[\s-])\S/g, c => c.toUpperCase());

function emptyStats() { return { created: 0, updated: 0, unchanged: 0 }; }

// Champs modifiés entre l'existant et la nouvelle version (comparaison texte)
function changes(existing, next) {
  const out = {};
  for (const [k, v] of Object.entries(next)) {
    const before = existing[k] instanceof Date ? existing[k].toISOString() : existing[k];
    const a = before === undefined || before === null ? null : JSON.stringify(before);
    const b = v === undefined || v === null ? null : JSON.stringify(v);
    if (a !== b) out[k] = v;
  }
  return out;
}

/**
 * @param {Buffer} buffer contenu du fichier .xlsm / .xlsx
 * @param {{ apply?: boolean, userId: string, tenantId: string }} options
 */
export async function importPhpExcel(buffer, { apply = false, userId, tenantId }) {
  const data = await parsePhpWorkbook(buffer);
  const report = {
    apply,
    lu: {
      patients: data.patients.length, consultations: data.consultations.length,
      hospitalisations: data.hospitalisations.length, operations: data.operations.length,
      repos: data.repos.length, deces: data.deces.length,
    },
    infirmeries: emptyStats(), secteurs: emptyStats(), patients: emptyStats(),
    consultations: emptyStats(), hospitalisations: emptyStats(), operations: emptyStats(),
    repos: emptyStats(), deces: emptyStats(),
    ignores: data.skipped,
    datesCorrigees: data.corrected,
    periode: null,
  };
  const days = data.consultations.map(c => c.day).sort();
  if (days.length) report.periode = { du: days[0], au: days.at(-1) };

  const t = await sequelize.transaction();
  try {
    const opts = { transaction: t };

    // Infirmeries
    const infByCode = new Map((await Infirmerie.findAll(opts)).map(i => [i.code.toUpperCase(), i]));
    // Seules les infirmeries de la feuille DB_Infirmeries sont créées ; un code
    // inconnu dans une ligne est remplacé par l'infirmerie de son secteur.
    for (const code of new Set(data.infirmeries.map(i => i.code))) {
      if (infByCode.has(code)) { report.infirmeries.unchanged++; continue; }
      report.infirmeries.created++;
      const loc = data.infirmeries.find(i => i.code === code)?.localisation || code.replace(/^INF_/, '').replace(/_/g, ' ');
      const inf = apply
        ? await Infirmerie.create({ code, nom: `Infirmerie ${titleCase(loc)}`, localisation: loc, isActive: true, tenantId }, opts)
        : { id: null, code };
      infByCode.set(code, inf);
    }

    // Secteurs (DB_Secteurs, puis ceux rencontrés dans les lignes)
    // Un secteur est reconnu par son code uniformisé (« PHP BAS », « PHP/BAS » → SEC_PHP_BAS)
    const secteurs = await Secteur.findAll(opts);
    const secByCode = new Map(secteurs.map(s => [s.code.toUpperCase(), s]));
    for (const s of secteurs) if (!secByCode.has(secteurCode(s.nom.toUpperCase()))) secByCode.set(secteurCode(s.nom.toUpperCase()), s);
    const secteurInfirmerie = new Map(data.secteurs.map(s => [secteurCode(s.nom), [s.nom, s.infirmerie]]));
    for (const p of [...data.patients, ...data.consultations]) {
      if (p.secteur && p.infirmerie && !secteurInfirmerie.has(secteurCode(p.secteur))) secteurInfirmerie.set(secteurCode(p.secteur), [p.secteur, p.infirmerie]);
    }
    for (const [code, [nom, infCode]] of secteurInfirmerie) {
      if (secByCode.has(code)) { report.secteurs.unchanged++; continue; }
      const inf = infByCode.get(infCode);
      if (!inf) continue;
      report.secteurs.created++;
      const sec = apply
        ? await Secteur.create({ code, nom, infirmerieId: inf.id, isActive: true, tenantId }, opts)
        : { id: null, nom, infirmerieId: inf.id };
      secByCode.set(code, sec);
    }
    const placeOf = (r) => {
      const sec = r.secteur ? secByCode.get(secteurCode(r.secteur)) : null;
      const inf = r.infirmerie ? infByCode.get(r.infirmerie) : null;
      return { secteurId: sec?.id ?? null, infirmerieId: inf?.id ?? sec?.infirmerieId ?? null };
    };

    // Patients : DB_Patients, complétés par les lignes des autres feuilles
    const patientsIn = new Map(data.patients.map(p => [p.matricule, p]));
    for (const r of [...data.consultations, ...data.hospitalisations, ...data.operations, ...data.repos, ...data.deces]) {
      if (!patientsIn.has(r.matricule) && r.nomComplet) patientsIn.set(r.matricule, { matricule: r.matricule, nomComplet: r.nomComplet, secteur: r.secteur, infirmerie: r.infirmerie });
    }
    const existingPatients = new Map((await PatientPHP.findAll({ ...opts, attributes: ['id', 'matricule', 'nom', 'prenom', 'secteurId', 'infirmerieId'] })).map(p => [p.matricule, p]));
    const patientId = new Map([...existingPatients].map(([m, p]) => [m, p.id]));
    const newPatients = [];
    for (const p of patientsIn.values()) {
      const { nom, prenom } = splitName(p.nomComplet);
      const place = placeOf(p);
      const fields = { nom, prenom, ...(place.secteurId ? { secteurId: place.secteurId } : {}), ...(place.infirmerieId ? { infirmerieId: place.infirmerieId } : {}) };
      const ex = existingPatients.get(p.matricule);
      if (ex) {
        const diff = changes(ex.get(), fields);
        if (Object.keys(diff).length) { report.patients.updated++; if (apply) await ex.update(diff, opts); } else report.patients.unchanged++;
      } else {
        const id = crypto.randomUUID();
        newPatients.push({ id, matricule: p.matricule, ...fields, status: 'actif', createdByUserId: userId, tenantId });
        patientId.set(p.matricule, id);
        report.patients.created++;
      }
    }
    if (apply && newPatients.length) await PatientPHP.bulkCreate(newPatients, opts);

    // Lignes déjà en base : par excel_ref, sinon (ancien import) par clé métier
    async function upsertRows({ model, rows, key, legacyKey, build, stats, after }) {
      const existing = await model.findAll(opts);
      const byRef = new Map(existing.filter(e => e.excelRef).map(e => [e.excelRef, e]));
      const legacy = new Map();
      for (const e of existing.filter(x => !x.excelRef)) {
        const k = legacyKey(e);
        if (!legacy.has(k)) legacy.set(k, []);
        legacy.get(k).push(e);
      }
      const toCreate = [];
      for (const r of rows) {
        const pid = patientId.get(r.matricule);
        if (!pid) { stats.ignored = (stats.ignored || 0) + 1; continue; }
        const fields = { ...build(r, pid), excelRef: r.ref };
        const ex = byRef.get(r.ref) || legacy.get(key(r, pid))?.shift();
        if (ex) {
          const diff = changes(ex.get(), fields);
          if (Object.keys(diff).length) { stats.updated++; if (apply) await ex.update(diff, opts); } else stats.unchanged++;
          after?.(r, ex.id);
        } else {
          const id = crypto.randomUUID();
          toCreate.push({ id, ...fields });
          stats.created++;
          after?.(r, id);
        }
      }
      if (apply) for (let i = 0; i < toCreate.length; i += 500) await model.bulkCreate(toCreate.slice(i, i + 500), opts);
      return toCreate;
    }

    // Consultations (+ bon de prise en charge pour les nouvelles : les statistiques comptent les bons)
    const consultIdByRef = new Map();
    const created = await upsertRows({
      model: ConsultationPHP,
      rows: data.consultations,
      stats: report.consultations,
      key: (r, pid) => `${pid}|${r.day}|${r.serviceBrut || ''}|${r.diagnostic || ''}`,
      // L'ancien import gardait les doubles espaces : comparaison sur le texte uniformisé
      legacyKey: (e) => `${e.patientId}|${e.dateConsultation}|${upper(e.serviceName) || ''}|${upper(e.diagnostic) || ''}`,
      build: (r, pid) => ({
        patientId: pid, dateConsultation: r.day, serviceName: r.service, diagnostic: r.diagnostic,
        typeVisite: r.typeVisite, numeroOrdre: r.numeroOrdre,
        heureArrivee: r.heureArrivee, heureDebutConsultation: r.heurePassage, dureeAttenteMinutes: r.dureeAttenteMinutes,
        resultat: r.resultat,
      }),
      after: (r, id) => consultIdByRef.set(r.ref, id),
    });
    if (apply && created.length) {
      const bons = created.map(c => ({
        id: crypto.randomUUID(),
        numeroBon: `XL-${c.excelRef.replace(/^C:/, '')}`.slice(0, 50),
        patientId: c.patientId, dateEmission: c.dateConsultation, heureEmission: c.heureArrivee || null,
        serviceDestination: c.serviceName, agentEmetteurId: userId, status: 'utilise',
      }));
      for (let i = 0; i < bons.length; i += 500) await BonPriseEnCharge.bulkCreate(bons.slice(i, i + 500), { ...opts, ignoreDuplicates: true });
      for (let i = 0; i < bons.length; i += 500) {
        const chunk = bons.slice(i, i + 500);
        await sequelize.query(`
          UPDATE php_consultations c SET bon_prise_en_charge_id = b.id
          FROM php_bons_prise_en_charge b
          WHERE b.id IN (:ids) AND c.bon_prise_en_charge_id IS NULL
            AND c.excel_ref = 'C:' || substring(b.numero_bon FROM 4)
        `, { ...opts, replacements: { ids: chunk.map(b => b.id) } });
      }
    }

    await upsertRows({
      model: HospitalisationPHP, rows: data.hospitalisations, stats: report.hospitalisations,
      key: (r, pid) => `${pid}|${r.day}`,
      legacyKey: (e) => `${e.patientId}|${e.dateEntree}`,
      build: (r, pid) => ({
        patientId: pid, serviceHospitalisation: r.service, numeroChambre: r.chambre, dateEntree: r.day,
        dateSortie: r.sortie, dureeSejour: r.sortie ? Math.round((Date.parse(r.sortie) - Date.parse(r.day)) / 86400000) : null,
        status: r.sortie ? 'sorti' : 'en_cours', diagnostic: r.diagnostic,
      }),
    });

    await upsertRows({
      model: OperationPHP, rows: data.operations, stats: report.operations,
      key: (r, pid) => `${pid}|${r.day}`,
      legacyKey: (e) => `${e.patientId}|${e.dateOperation}`,
      build: (r, pid) => ({
        patientId: pid, typeOperation: r.service, dateOperation: r.day, status: 'realisee', diagnostic: r.diagnostic,
        notes: [r.reposJours ? `Repos : ${r.reposJours} j` : null, r.sortie ? `Sortie : ${r.sortie}` : null, r.notes].filter(Boolean).join(' — ') || null,
      }),
    });

    await upsertRows({
      model: ReposPHP, rows: data.repos, stats: report.repos,
      key: (r, pid) => `${pid}|${r.day}`,
      legacyKey: (e) => `${e.patientId}|${e.dateDebut}`,
      build: (r, pid) => ({
        patientId: pid, consultationId: (r.consultationRef && consultIdByRef.get(r.consultationRef)) || null,
        dateDebut: r.day, dateFin: r.fin, dureeJours: r.dureeJours, status: r.status,
        prolongations: r.prolongations, motif: r.motif,
      }),
    });

    await upsertRows({
      model: DecesTransfertPHP, rows: data.deces, stats: report.deces,
      key: (r, pid) => `${pid}|${r.day}|${r.type}`,
      legacyKey: (e) => `${e.patientId}|${e.date}|${e.type}`,
      build: (r, pid) => ({
        patientId: pid, type: r.type, date: r.day, motif: r.motif || r.diagnostic,
        destination: r.destination, causesDeces: r.type === 'deces' ? r.diagnostic : null, notes: r.notes, enregistreParId: userId,
      }),
    });

    if (apply) await t.commit(); else await t.rollback();
    return report;
  } catch (err) {
    await t.rollback();
    throw err;
  }
}
