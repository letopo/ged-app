// backend/src/utils/dmeMatch.js
// Rapprochement des BL PHP de Sage avec les patients du DME (étape 2 de la
// liasse PHP, 11/11/2026). Clé : le compte tiers Sage du BL (DO_Tiers / CT_Num)
// = patients.numero_compte_sage dans le DME. Plusieurs patients du DME peuvent
// avoir le même compte (familles, doublons de dossier) : on départage alors par
// le nom du client Sage (CT_Intitule). LECTURE SEULE des deux côtés.
import sql from 'mssql';
import { PHP_COMPTES_COLLECTIFS, phpBeneficiaryType } from './integrations.js';

export const MAX_DAYS = 31;
const COLLECTIFS = Object.keys(PHP_COMPTES_COLLECTIFS);

/** Compte tiers comparable : le DME contient parfois des espaces (« 418 123 456 »). */
export const normCompte = (s) => String(s || '').replace(/\s+/g, '').toUpperCase();

// Mots d'un nom, sans accents ni ponctuation ; on ignore les mots d'une lettre
// et les mentions courantes (épouse, née…)
const STOP = new Set(['EPSE', 'EPOUSE', 'EP', 'NEE', 'NE', 'VVE', 'VEUVE', 'DE', 'DU', 'LA', 'LE', 'MME', 'MLLE', 'MR', 'M', 'BB', 'BEBE']);
export const nameTokens = (s) => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  .split(/[^A-Z0-9]+/).filter((w) => w.length > 1 && !STOP.has(w));

/** Nombre de mots communs entre le nom Sage et le nom + prénom du patient DME. */
export function nameScore(sageName, patient) {
  const a = new Set(nameTokens(sageName));
  return nameTokens(`${patient.nom || ''} ${patient.prenom || ''}`).filter((w) => a.has(w)).length;
}

/**
 * BL PHP d'une période, facturés ou non. Un BL non facturé est une pièce de
 * type 3 (ses lignes n'ont pas de DL_PieceBL) ; une fois facturé, ses lignes
 * passent dans la facture (type 6/7) et gardent son numéro dans DL_PieceBL.
 * Pas de jointure sur F_DOCLIGNE (trop lente) : les tiers PHP sont lus à part.
 */
export async function fetchPhpBl(pool, from, to) {
  const tiersReq = pool.request();
  COLLECTIFS.forEach((c, i) => tiersReq.input(`c${i}`, sql.VarChar, c));
  const tiers = await tiersReq.query(`
    SELECT CT_Num, CT_Intitule, CG_NumPrinc, [MATRICULE] AS matricule FROM F_COMPTET
    WHERE CT_Type = 0 AND CG_NumPrinc IN (${COLLECTIFS.map((_, i) => `@c${i}`).join(', ')})`);
  const byTiers = new Map(tiers.recordset.map((t) => [t.CT_Num.trim(), t]));

  const r = await pool.request().input('from', sql.Date, from).input('to', sql.Date, to).query(`
    SELECT CASE WHEN DO_Type = 3 THEN DO_Piece ELSE DL_PieceBL END AS bl,
           CT_Num, MIN(DL_DateBL) AS dateBl, MAX(DO_Type) AS docType,
           MAX(CASE WHEN DO_Type IN (6, 7) THEN DO_Piece END) AS facture,
           SUM(DL_MontantTTC) AS montant, COUNT(*) AS actes
    FROM F_DOCLIGNE
    WHERE DO_Domaine = 0 AND DO_Type IN (3, 6, 7) AND DL_DateBL >= @from AND DL_DateBL <= @to
    GROUP BY CASE WHEN DO_Type = 3 THEN DO_Piece ELSE DL_PieceBL END, CT_Num`);

  return r.recordset
    .filter((x) => (x.bl || '').trim() && byTiers.has((x.CT_Num || '').trim()))
    .map((x) => {
      const t = byTiers.get(x.CT_Num.trim());
      return {
        bl: x.bl.trim(),
        date: new Date(x.dateBl).toISOString().slice(0, 10),
        compte: x.CT_Num.trim(),
        nomSage: (t.CT_Intitule || '').trim(),
        matricule: (t.matricule || '').trim() || null,
        type: phpBeneficiaryType(t.CG_NumPrinc),
        facture: (x.facture || '').trim() || null,
        comptabilisee: x.docType === 7,
        montant: Number(x.montant) || 0,
        actes: x.actes,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.bl.localeCompare(b.bl));
}

/** Patients du DME ayant un compte Sage, indexés par compte normalisé. */
export async function fetchDmePatientsByCompte(conn) {
  const [rows] = await conn.query(`
    SELECT id, dossier_numero, nom, prenom, date_naissance, sexe, type_client, circuit, matricule_agent, numero_compte_sage, actif
    FROM patients WHERE numero_compte_sage IS NOT NULL AND numero_compte_sage <> ''`);
  const map = new Map();
  for (const p of rows) {
    const k = normCompte(p.numero_compte_sage);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(p);
  }
  return map;
}

const publicPatient = (p, score) => ({
  id: p.id, dossier: p.dossier_numero, nom: p.nom, prenom: p.prenom, naissance: p.date_naissance,
  sexe: p.sexe, typeClient: p.type_client, actif: p.actif !== 0, score,
});

/**
 * Statut de chaque BL :
 *  trouve        un seul patient sur ce compte, le nom concorde
 *  trouve_nom    plusieurs patients sur ce compte, départagés par le nom
 *  nom_different un seul patient sur ce compte mais son nom ne ressemble pas au nom Sage (à vérifier)
 *  plusieurs     plusieurs patients sur ce compte, le nom ne suffit pas
 *  absent        aucun patient du DME avec ce compte
 */
export function matchBl(bls, patientsByCompte) {
  return bls.map((b) => {
    const cands = patientsByCompte.get(normCompte(b.compte)) || [];
    if (!cands.length) return { ...b, statut: 'absent', patient: null, candidats: [] };
    const scored = cands.map((p) => ({ p, s: nameScore(b.nomSage, p) })).sort((x, y) => y.s - x.s);
    if (cands.length === 1) {
      const { p, s } = scored[0];
      return { ...b, statut: s > 0 ? 'trouve' : 'nom_different', patient: publicPatient(p, s), candidats: [] };
    }
    const best = scored[0];
    const unique = best.s > 0 && (scored[1]?.s ?? 0) < best.s;
    return {
      ...b,
      statut: unique ? 'trouve_nom' : 'plusieurs',
      patient: unique ? publicPatient(best.p, best.s) : null,
      candidats: scored.map(({ p, s }) => publicPatient(p, s)),
    };
  });
}

export const STATUTS = ['trouve', 'trouve_nom', 'nom_different', 'plusieurs', 'absent'];

export function summarizeMatch(rows) {
  const count = Object.fromEntries(STATUTS.map((s) => [s, 0]));
  rows.forEach((r) => { count[r.statut] += 1; });
  const rapproches = count.trouve + count.trouve_nom;
  return { total: rows.length, ...count, rapproches, taux: rows.length ? Math.round((rapproches / rows.length) * 100) : 0 };
}
