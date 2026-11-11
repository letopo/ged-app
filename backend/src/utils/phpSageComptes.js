// backend/src/utils/phpSageComptes.js
// Comptes tiers Sage d'un patient PHP (agent), étape A du lien Patient PHP ↔
// Sage ↔ DME (11/11/2026). Dans Sage, la fiche client a un champ « MATRICULE » :
//  - comptes au collectif 4127000 (Employé PHP) avec le matricule de l'agent :
//    ses propres comptes (souvent plusieurs, créés au fil des venues) ;
//  - comptes au collectif 4122000 (Famille PHP) avec ce matricule : sa famille.
// La GED PROPOSE ces comptes ; une personne du module PHP confirme ou écarte, et
// peut ajouter un compte à la main (matricule mal saisi dans Sage). Lecture seule de Sage.
import sql from 'mssql';
import { TenantIntegration } from '../models/index.js';
import { decryptSecret } from './secretBox.js';
import { SAGE_DEFAULTS, PHP_COMPTES_COLLECTIFS, phpBeneficiaryType } from './integrations.js';
import { openSagePool } from './sageFactureSync.js';

export const COLLECTIF_EMPLOYE = '4127000';
export const COLLECTIF_FAMILLE = '4122000';
const COLLECTIFS = Object.keys(PHP_COMPTES_COLLECTIFS);
const CACHE_MS = 5 * 60_000;
const cache = new Map(); // tenantId → { at, tiers }

/**
 * Matricule comparable : Sage contient « 123456 », « 123 456 », « 123456/ABCD1234 »…
 * On garde les chiffres du premier bloc, sans zéros en tête. Moins de 3 chiffres = inutilisable.
 */
export function normMatricule(v) {
  const first = String(v ?? '').split('/')[0].replace(/\s+/g, '');
  const digits = first.replace(/\D/g, '').replace(/^0+/, '');
  return digits.length >= 3 ? digits : '';
}

export const normCompteTiers = (v) => String(v ?? '').replace(/\s+/g, '').toUpperCase();

async function sageConnection(tenantId) {
  const row = await TenantIntegration.findOne({ where: { tenantId, kind: 'sage' } });
  if (!row?.secretEncrypted) {
    const e = new Error('Connexion Sage non réglée (Paramètres › Intégrations).'); e.status = 400; throw e;
  }
  return { config: { ...SAGE_DEFAULTS, ...row.config }, password: decryptSecret(row.secretEncrypted) };
}

/** Comptes tiers PHP de Sage (≈ 10 000 lignes, lecture rapide), gardés 5 minutes. */
export async function loadPhpTiers(tenantId, { refresh = false } = {}) {
  const hit = cache.get(tenantId);
  if (hit && !refresh && Date.now() - hit.at < CACHE_MS) return hit.tiers;
  const { config, password } = await sageConnection(tenantId);
  const pool = await openSagePool(config, password);
  try {
    const request = pool.request();
    COLLECTIFS.forEach((c, i) => request.input(`c${i}`, sql.VarChar, c));
    const r = await request.query(`
      SELECT CT_Num, CT_Intitule, CG_NumPrinc, [MATRICULE] AS matricule, [NOM ASSURE] AS nomAssure,
             [SECTEUR] AS secteur, [Date Entrée du Malade] AS dateEntree, CT_Sommeil
      FROM F_COMPTET WHERE CT_Type = 0 AND CG_NumPrinc IN (${COLLECTIFS.map((_, i) => `@c${i}`).join(', ')})`);
    const tiers = r.recordset.map(toTiers);
    cache.set(tenantId, { at: Date.now(), tiers });
    return tiers;
  } finally {
    await pool.close().catch(() => {});
  }
}

const dateOnly = (d) => {
  if (!d) return null;
  const x = new Date(d);
  return Number.isNaN(x.getTime()) || x.getUTCFullYear() < 1990 ? null : x.toISOString().slice(0, 10);
};

export function toTiers(x) {
  const collectif = String(x.CG_NumPrinc || '').trim();
  return {
    compte: String(x.CT_Num || '').trim(),
    intitule: String(x.CT_Intitule || '').trim(),
    collectif,
    type: phpBeneficiaryType(collectif),
    matricule: String(x.matricule || '').trim() || null,
    matriculeNorm: normMatricule(x.matricule),
    nomAssure: String(x.nomAssure || '').trim() || null,
    secteur: String(x.secteur || '').trim() || null,
    dateEntree: dateOnly(x.dateEntree),
    enSommeil: x.CT_Sommeil === 1,
  };
}

/**
 * Comptes d'un patient : propositions par matricule + décisions enregistrées.
 * @param {string} matricule  matricule de l'agent (GED)
 * @param {Array}  tiers      résultat de loadPhpTiers
 * @param {Array}  decisions  lignes PhpPatientCompteSage du patient
 * @returns {{ employe: Array, famille: Array }} chaque compte : { ...tiers, etat: confirme|propose|ecarte, source }
 */
export function comptesDuPatient(matricule, tiers, decisions = []) {
  const mat = normMatricule(matricule);
  const byCompte = new Map(tiers.map((t) => [normCompteTiers(t.compte), t]));
  const decided = new Map(decisions.map((d) => [normCompteTiers(d.compteTiers), d]));
  const out = new Map();

  if (mat) {
    for (const t of tiers) {
      if (t.matriculeNorm === mat) out.set(normCompteTiers(t.compte), { ...t, source: 'auto' });
    }
  }
  // Comptes ajoutés à la main (ou proposés autrefois) : toujours affichés
  for (const [k, d] of decided) {
    if (!out.has(k)) {
      const t = byCompte.get(k);
      out.set(k, t ? { ...t, source: d.source } : { compte: d.compteTiers, intitule: null, collectif: null, type: null, introuvable: true, source: d.source });
    }
  }

  const rows = [...out.entries()].map(([k, t]) => {
    const d = decided.get(k);
    return {
      ...t,
      matriculeNorm: undefined,
      etat: d ? d.statut : 'propose',
      source: d?.source || t.source,
      decidePar: d?.decidedByName || null,
      decideLe: d?.updatedAt || null,
    };
  });
  const order = { confirme: 0, propose: 1, ecarte: 2 };
  const sort = (a, b) => order[a.etat] - order[b.etat] || String(b.dateEntree || '').localeCompare(String(a.dateEntree || '')) || a.compte.localeCompare(b.compte);
  return {
    employe: rows.filter((r) => r.collectif !== COLLECTIF_FAMILLE).sort(sort),
    famille: rows.filter((r) => r.collectif === COLLECTIF_FAMILLE).sort(sort),
  };
}

/** Compte tiers PHP existant dans Sage (ajout manuel), sinon null. */
export async function findPhpTiers(tenantId, compte) {
  const k = normCompteTiers(compte);
  const tiers = await loadPhpTiers(tenantId);
  return tiers.find((t) => normCompteTiers(t.compte) === k) || null;
}
