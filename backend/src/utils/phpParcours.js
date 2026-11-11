// backend/src/utils/phpParcours.js
// Parcours hospitalier d'un patient PHP (étape B, 11/11/2026) : une frise qui
// réunit, sur une période,
//  - la GED : consultations enregistrées dans le Module PHP ;
//  - le DME : consultations, hospitalisations, bulletins d'examens ;
//  - Sage : BL et factures, avec montants et état.
// Les comptes tiers utilisés sont ceux de l'étape A (confirmés + proposés non
// écartés). Les patients du DME sont retrouvés par ces comptes et, pour l'agent,
// par son matricule. Tout est lu en direct, LECTURE SEULE ; si Sage ou le DME ne
// répond pas, le reste du parcours s'affiche quand même.
import sql from 'mssql';
import { Op } from 'sequelize';
import { ConsultationPHP, Infirmerie, PhpPatientCompteSage, SageFactureImport, TenantIntegration } from '../models/index.js';
import { decryptSecret } from './secretBox.js';
import { SAGE_DEFAULTS } from './integrations.js';
import { openSagePool } from './sageFactureSync.js';
import { openDme } from './dmeConnection.js';
import { loadPhpTiers, comptesDuPatient, normMatricule, normCompteTiers, COLLECTIF_FAMILLE } from './phpSageComptes.js';

const DAY = 86_400_000;
export const AGENT = 'agent';
const iso = (d) => {
  if (!d) return null;
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? null : x.toISOString().slice(0, 10);
};
const short = (s, n = 160) => {
  const v = String(s ?? '').replace(/\s+/g, ' ').trim();
  return v ? (v.length > n ? `${v.slice(0, n - 1)}…` : v) : null;
};
const dayNum = (d) => Math.floor(Date.parse(`${d}T00:00:00Z`) / DAY);

// ── Sage ────────────────────────────────────────────────────────────────────
/**
 * Lignes de BL et de factures des comptes, sur la période. Un BL non facturé est
 * une pièce de type 3 ; facturé, ses lignes sont dans la facture (6/7) avec son
 * numéro dans DL_PieceBL. Filtrer F_DOCLIGNE par CT_Num est trop lent (> 20 s) :
 * on lit d'abord les entêtes du tiers (index DO_Tiers), puis les lignes par
 * numéro de pièce (index cbDO_Piece), comme la page BL PHP.
 */
export async function fetchSageLines(pool, comptes, from, to) {
  if (!comptes.length) return [];
  const hr = pool.request().input('from', sql.Date, from);
  comptes.forEach((c, i) => hr.input(`t${i}`, sql.VarChar, c));
  const heads = (await hr.query(`
    SELECT DO_Type, DO_Piece, DO_Date, DO_Ref FROM F_DOCENTETE
    WHERE DO_Domaine = 0 AND DO_Type IN (3, 6, 7) AND DO_Tiers IN (${comptes.map((_, i) => `@t${i}`).join(', ')})
      AND DO_Date >= @from`)).recordset;
  const head = new Map(heads.map((h) => [String(h.DO_Piece).trim(), h]));
  const pieces = [...head.keys()];
  const out = [];
  for (let i = 0; i < pieces.length; i += 200) {
    const chunk = pieces.slice(i, i + 200);
    const lr = pool.request().input('from', sql.Date, from).input('to', sql.Date, to);
    chunk.forEach((p, j) => lr.input(`p${j}`, sql.VarChar, p));
    const r = await lr.query(`
      SELECT DO_Type, DO_Piece, DL_PieceBL, DL_DateBL, CT_Num, DL_Design, DL_MontantTTC FROM F_DOCLIGNE
      WHERE DO_Domaine = 0 AND DO_Type IN (3, 6, 7)
        AND cbDO_Piece IN (${chunk.map((_, j) => `CONVERT(varbinary(13), @p${j})`).join(', ')})
        AND DL_DateBL >= @from AND DL_DateBL <= @to`);
    for (const l of r.recordset) {
      const h = head.get(String(l.DO_Piece).trim());
      out.push({ ...l, DO_Date: h?.DO_Date, DO_Ref: h?.DO_Ref });
    }
  }
  return out;
}

/** Regroupe les lignes en BL et en factures. */
export function groupSageLines(lines) {
  const bls = new Map();
  const factures = new Map();
  for (const l of lines) {
    const isBl = l.DO_Type === 3;
    const piece = String((isBl ? l.DO_Piece : l.DL_PieceBL) || '').trim();
    const compte = String(l.CT_Num || '').trim();
    const montant = Number(l.DL_MontantTTC) || 0;
    if (piece) {
      const k = `${compte}|${piece}`;
      const b = bls.get(k) || { piece, compte, date: iso(l.DL_DateBL), service: null, montant: 0, actes: [], facture: null, comptabilisee: false };
      b.montant += montant;
      if (!b.service && String(l.DO_Ref || '').trim() && isBl) b.service = String(l.DO_Ref).trim();
      const design = String(l.DL_Design || '').trim();
      if (design && b.actes.length < 40) b.actes.push(design);
      if (!isBl) { b.facture = String(l.DO_Piece).trim(); b.comptabilisee = l.DO_Type === 7; }
      bls.set(k, b);
    }
    if (!isBl) {
      const fp = String(l.DO_Piece || '').trim();
      const f = factures.get(fp) || { piece: fp, compte, date: iso(l.DO_Date), montant: 0, comptabilisee: l.DO_Type === 7, bls: new Set() };
      f.montant += montant;
      if (piece) f.bls.add(piece);
      factures.set(fp, f);
    }
  }
  return {
    bls: [...bls.values()],
    factures: [...factures.values()].map((f) => ({ ...f, bls: [...f.bls] })),
  };
}

// ── DME ─────────────────────────────────────────────────────────────────────
async function fetchDme(conn, { comptes, matricule, from, to }) {
  const comptesNorm = comptes.map(normCompteTiers);
  const where = [];
  const params = [];
  if (comptesNorm.length) { where.push(`REPLACE(UPPER(numero_compte_sage), ' ', '') IN (${comptesNorm.map(() => '?').join(', ')})`); params.push(...comptesNorm); }
  if (matricule) { where.push(`REPLACE(matricule_agent, ' ', '') LIKE ?`); params.push(`%${matricule}%`); }
  if (!where.length) return { patients: [], consultations: [], hospitalisations: [], bulletins: [] };
  const [rows] = await conn.query(`
    SELECT id, dossier_numero, nom, prenom, date_naissance, sexe, type_client, matricule_agent, numero_compte_sage
    FROM patients WHERE ${where.join(' OR ')}`, params);
  // matricule : comparaison exacte une fois normalisé (le LIKE ne sert qu'à filtrer)
  const patients = rows.filter((p) => comptesNorm.includes(normCompteTiers(p.numero_compte_sage)) || (matricule && normMatricule(p.matricule_agent) === matricule));
  if (!patients.length) return { patients, consultations: [], hospitalisations: [], bulletins: [] };
  const ids = patients.map((p) => p.id);
  const inIds = ids.map(() => '?').join(', ');
  const [[services], [consultations], [hospitalisations], [bulletins]] = await Promise.all([
    conn.query('SELECT id, nom_service FROM services'),
    conn.query(`
      SELECT id, patient_id, date_consultation, type_consultation, statut, motif_consultation, diagnostic_libelle, diagnostic_principal, service_id, devenir
      FROM consultations WHERE patient_id IN (${inIds}) AND date_consultation >= ? AND date_consultation < DATE_ADD(?, INTERVAL 1 DAY)`, [...ids, from, to]),
    conn.query(`
      SELECT id, patient_id, date_admission, date_sortie_effective, statut, service_id, motif_hospitalisation, diagnostic_entree_libelle, diagnostic_sortie_libelle, type_sortie, insolvable
      FROM hospitalisations WHERE patient_id IN (${inIds}) AND date_admission < DATE_ADD(?, INTERVAL 1 DAY)
        AND (date_sortie_effective IS NULL OR date_sortie_effective >= ?)`, [...ids, to, from]),
    conn.query(`
      SELECT id, patient_id, date_creation, type, examens, signe, statut, service
      FROM bulletins_examens WHERE patient_id IN (${inIds}) AND date_creation >= ? AND date_creation < DATE_ADD(?, INTERVAL 1 DAY)`, [...ids, from, to]),
  ]);
  const serviceNames = new Map(services.map((s) => [s.id, s.nom_service]));
  return { patients, consultations, hospitalisations, bulletins, serviceNames };
}

// ── Assemblage ──────────────────────────────────────────────────────────────
const TYPE_CONSULT = { interne: 'interne', externe: 'externe', infirmiere: 'infirmière', urgence: 'urgence', gyneco: 'gynécologie', pediatrie: 'pédiatrie', specialiste: 'spécialiste' };

/**
 * Contrôles croisés (même personne) :
 *  - BL sans aucun passage dans le DME du jour d'avant au jour d'après ;
 *  - passage dans le DME (consultation, hospitalisation) sans BL dans les 3 jours.
 * Seulement si la personne a été retrouvée dans le DME (sinon rien à comparer).
 */
export function controlesCroises(events, personnesDme) {
  const dme = events.filter((e) => e.source === 'dme' && e.kind !== 'bulletin' && !e.annule);
  const bls = events.filter((e) => e.kind === 'bl');
  const covers = (e, d) => {
    const start = dayNum(e.date);
    const end = e.fin ? dayNum(e.fin) : (e.kind === 'hospitalisation' ? start + 3650 : start);
    return d >= start - 1 && d <= end + 1;
  };
  for (const b of bls) {
    if (!personnesDme.has(b.personne)) continue;
    const d = dayNum(b.date);
    if (!dme.some((e) => e.personne === b.personne && covers(e, d))) b.controle = 'sans_dme';
  }
  for (const e of dme) {
    const start = dayNum(e.date);
    const end = e.kind === 'hospitalisation' ? (e.fin ? dayNum(e.fin) : start + 3650) : start;
    if (!bls.some((b) => b.personne === e.personne && dayNum(b.date) >= start - 1 && dayNum(b.date) <= end + 3)) e.controle = 'sans_bl';
  }
  return events;
}

export async function buildParcours({ tenantId, patient, from, to }) {
  const erreurs = {};
  const matricule = normMatricule(patient.matricule);
  const agentNom = `${patient.nom || ''} ${patient.prenom || ''}`.trim();

  // 1. Comptes tiers (étape A) : confirmés + proposés non écartés
  let comptes = [];
  try {
    const [tiers, decisions] = await Promise.all([loadPhpTiers(tenantId), PhpPatientCompteSage.findAll({ where: { patientId: patient.id } })]);
    const { employe, famille } = comptesDuPatient(patient.matricule, tiers, decisions);
    comptes = [...employe, ...famille].filter((c) => c.etat !== 'ecarte' && !c.introuvable);
  } catch (err) {
    erreurs.sage = err.message;
  }
  const personneDuCompte = (compte) => {
    const c = comptes.find((x) => normCompteTiers(x.compte) === normCompteTiers(compte));
    return c && c.collectif === COLLECTIF_FAMILLE ? normCompteTiers(c.compte) : AGENT;
  };
  const personnes = { [AGENT]: { nom: agentNom, role: 'agent' } };
  comptes.filter((c) => c.collectif === COLLECTIF_FAMILLE).forEach((c) => { personnes[normCompteTiers(c.compte)] = { nom: c.intitule || c.compte, role: 'famille' }; });

  const events = [];

  // 2. GED : consultations du Module PHP
  const consults = await ConsultationPHP.findAll({
    where: { patientId: patient.id, dateConsultation: { [Op.between]: [from, to] } },
    attributes: ['id', 'dateConsultation', 'serviceName', 'motif', 'diagnostic', 'resultat', 'typeVisite', 'infirmerieId', 'medecinNom'],
    order: [['dateConsultation', 'DESC']],
  });
  const infIds = [...new Set(consults.map((c) => c.infirmerieId).filter(Boolean))];
  const infs = infIds.length ? await Infirmerie.findAll({ where: { id: infIds }, attributes: ['id', 'nom'] }) : [];
  const infNom = new Map(infs.map((i) => [i.id, i.nom]));
  for (const c of consults) {
    events.push({
      id: `ged-${c.id}`, source: 'ged', kind: 'consultation_php', date: iso(c.dateConsultation), personne: AGENT,
      titre: `Consultation${c.serviceName ? ` · ${c.serviceName}` : ''}`,
      detail: short([c.motif, c.diagnostic && `Diagnostic : ${c.diagnostic}`].filter(Boolean).join(' — ')),
      lieu: infNom.get(c.infirmerieId) || null, medecin: c.medecinNom || null, issue: c.resultat || null,
    });
  }

  // 3. Sage : BL et factures
  if (comptes.length && !erreurs.sage) {
    try {
      const row = await TenantIntegration.findOne({ where: { tenantId, kind: 'sage' } });
      const pool = await openSagePool({ ...SAGE_DEFAULTS, ...row.config }, decryptSecret(row.secretEncrypted));
      let lines;
      try { lines = await fetchSageLines(pool, comptes.map((c) => c.compte), from, to); } finally { await pool.close().catch(() => {}); }
      const { bls, factures } = groupSageLines(lines);
      const imports = factures.length ? await SageFactureImport.findAll({ where: { tenantId, sageDocPiece: factures.map((f) => f.piece) }, attributes: ['sageDocPiece', 'documentId'] }) : [];
      const docOf = new Map(imports.map((i) => [i.sageDocPiece, i.documentId]));
      for (const b of bls) {
        events.push({
          id: `bl-${b.compte}-${b.piece}`, source: 'sage', kind: 'bl', date: b.date, personne: personneDuCompte(b.compte),
          titre: `BL ${b.piece}${b.service ? ` · ${b.service}` : ''}`, detail: short(b.actes.join(', '), 220),
          montant: Math.round(b.montant), compte: b.compte, facture: b.facture, comptabilisee: b.comptabilisee,
        });
      }
      for (const f of factures) {
        events.push({
          id: `fa-${f.piece}`, source: 'sage', kind: 'facture', date: f.date, personne: personneDuCompte(f.compte),
          titre: `Facture ${f.piece}`, detail: f.bls.length ? `BL : ${f.bls.join(', ')}` : null,
          montant: Math.round(f.montant), compte: f.compte, comptabilisee: f.comptabilisee, documentId: docOf.get(f.piece) || null,
        });
      }
    } catch (err) {
      erreurs.sage = err.message;
    }
  }

  // 4. DME : consultations, hospitalisations, bulletins
  const personnesDme = new Set();
  const dmePatients = [];
  const dmeRow = await TenantIntegration.findOne({ where: { tenantId, kind: 'dme' } });
  if (dmeRow?.secretEncrypted && dmeRow.config?.host) {
    try {
      const conn = await openDme(dmeRow.config, decryptSecret(dmeRow.secretEncrypted));
      let dme;
      try { dme = await fetchDme(conn, { comptes: comptes.map((c) => c.compte), matricule, from, to }); } finally { await conn.end().catch(() => {}); }
      const personneDme = new Map();
      for (const p of dme.patients) {
        const k = normCompteTiers(p.numero_compte_sage);
        const fam = comptes.find((c) => c.collectif === COLLECTIF_FAMILLE && normCompteTiers(c.compte) === k);
        const personne = fam ? k : AGENT;
        personneDme.set(p.id, personne);
        personnesDme.add(personne);
        dmePatients.push({ id: p.id, dossier: p.dossier_numero, nom: p.nom, prenom: p.prenom, naissance: iso(p.date_naissance), typeClient: p.type_client, personne });
      }
      const svc = (id) => dme.serviceNames?.get(id) || null;
      for (const c of dme.consultations) {
        events.push({
          id: `dme-c-${c.id}`, source: 'dme', kind: 'consultation_dme', date: iso(c.date_consultation), personne: personneDme.get(c.patient_id),
          titre: `Consultation ${TYPE_CONSULT[c.type_consultation] || c.type_consultation || ''}`.trim() + (svc(c.service_id) ? ` · ${svc(c.service_id)}` : ''),
          detail: short([c.motif_consultation, (c.diagnostic_libelle || c.diagnostic_principal) && `Diagnostic : ${c.diagnostic_libelle || c.diagnostic_principal}`].filter(Boolean).join(' — ')),
          statut: c.statut, annule: c.statut === 'annulee', dmePatientId: c.patient_id,
        });
      }
      for (const h of dme.hospitalisations) {
        events.push({
          id: `dme-h-${h.id}`, source: 'dme', kind: 'hospitalisation', date: iso(h.date_admission), fin: iso(h.date_sortie_effective), personne: personneDme.get(h.patient_id),
          titre: `Hospitalisation${svc(h.service_id) ? ` · ${svc(h.service_id)}` : ''}`,
          detail: short([h.motif_hospitalisation, h.diagnostic_sortie_libelle ? `Sortie : ${h.diagnostic_sortie_libelle}` : h.diagnostic_entree_libelle && `Entrée : ${h.diagnostic_entree_libelle}`].filter(Boolean).join(' — ')),
          statut: h.statut, typeSortie: h.type_sortie, insolvable: !!h.insolvable, dmePatientId: h.patient_id,
        });
      }
      for (const b of dme.bulletins) {
        events.push({
          id: `dme-b-${b.id}`, source: 'dme', kind: 'bulletin', date: iso(b.date_creation), personne: personneDme.get(b.patient_id),
          titre: `Bulletin ${b.type === 'imagerie' ? 'd’imagerie' : 'de laboratoire'}${b.service ? ` · ${b.service}` : ''}`,
          detail: short(b.examens, 200), signe: !!b.signe, statut: b.statut, dmePatientId: b.patient_id,
        });
      }
    } catch (err) {
      erreurs.dme = err.message;
    }
  } else {
    erreurs.dme = 'Connexion au DME non réglée (Paramètres › Intégrations › DME).';
  }

  controlesCroises(events, personnesDme);
  events.sort((a, b) => String(b.date).localeCompare(String(a.date)) || a.source.localeCompare(b.source));

  const of = (k) => events.filter((e) => e.kind === k);
  const blList = of('bl');
  const totaux = {
    consultationsPhp: of('consultation_php').length,
    consultationsDme: of('consultation_dme').filter((e) => !e.annule).length,
    hospitalisations: of('hospitalisation').length,
    bulletins: of('bulletin').length,
    bl: blList.length,
    montantBl: blList.reduce((s, b) => s + b.montant, 0),
    montantNonFacture: blList.filter((b) => !b.facture).reduce((s, b) => s + b.montant, 0),
    blNonFactures: blList.filter((b) => !b.facture).length,
    factures: of('facture').length,
    aVerifier: events.filter((e) => e.controle).length,
  };

  return {
    periode: { from, to },
    personnes,
    comptes: comptes.map((c) => ({ compte: c.compte, intitule: c.intitule, type: c.type, etat: c.etat, personne: personneDuCompte(c.compte) })),
    dmePatients,
    totaux,
    events,
    erreurs,
  };
}
