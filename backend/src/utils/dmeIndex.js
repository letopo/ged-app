// backend/src/utils/dmeIndex.js
// Accès commun au DME pour le Module PHP : connexion (si le module et les
// réglages le permettent) et index en mémoire des fiches patients du DME
// (~11 000), relu au plus toutes les 60 s par établissement.
import { TenantIntegration } from '../models/index.js';
import { decryptSecret } from './secretBox.js';
import { openDme } from './dmeConnection.js';
import { indexerDme } from './dmePatientSearch.js';
import { isModuleActive } from './tenantModules.js';

/** Raison pour laquelle le DME n'est pas utilisable, ou null. */
export async function dmeIndisponible(tenantId) {
  if (!(await isModuleActive(tenantId, 'dme'))) return 'Module « Liaison DME » non activé.';
  const row = await TenantIntegration.findOne({ where: { tenantId, kind: 'dme' } });
  if (!row?.secretEncrypted || !row.config?.host || row.enabled === false) return 'Connexion au DME non réglée (Paramètres › Intégrations › DME).';
  return null;
}

export async function ouvrirDmeTenant(tenantId) {
  const row = await TenantIntegration.findOne({ where: { tenantId, kind: 'dme' } });
  return openDme(row.config, decryptSecret(row.secretEncrypted));
}

const CACHE_MS = 60_000;
const cache = new Map();
export async function indexDuTenant(tenantId, conn) {
  const hit = cache.get(tenantId);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.index;
  const [rows] = await conn.query(`
    SELECT id, dossier_numero, nom, prenom, date_naissance, type_client, matricule_agent, numero_compte_sage
    FROM patients WHERE actif IS NULL OR actif <> 0`);
  const index = indexerDme(rows);
  cache.set(tenantId, { at: Date.now(), index });
  return index;
}
