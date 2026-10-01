// backend/src/utils/tenantSettings.js
// Réglages généraux d'un tenant (Paramètres › Délais et session), avec leurs
// valeurs par défaut et bornes. Lus souvent (chaque envoi de fichier, chaque
// étape de validation) : gardés 60 s en mémoire, vidés à l'enregistrement.
import { tenantNamespace } from '../config/database.js';
import { TenantSettings } from '../models/index.js';

// Valeur par défaut = comportement historique de l'application.
// Taille des fichiers : plafonnée à 200 Mo par nginx (client_max_body_size)
// et multer (middleware/upload.js).
export const TENANT_SETTINGS = {
  workflowDeadlineDays: { default: 7,  min: 1, max: 90 },
  lateDays:             { default: 2,  min: 1, max: 30 },
  sessionIdleMinutes:   { default: 30, min: 5, max: 480 },
  sessionMaxDays:       { default: 7,  min: 1, max: 30 },
  maxUploadMb:          { default: 50, min: 1, max: 200 },
  // Cachet apposé à sa taille réelle (mm) ; false = ancien calcul (ajusté au cadre)
  stampRealSize:        { default: true, boolean: true },
};
export const UPLOAD_CEILING_MB = TENANT_SETTINGS.maxUploadMb.max;

const DEFAULTS = Object.fromEntries(Object.entries(TENANT_SETTINGS).map(([k, v]) => [k, v.default]));
const TTL_MS = 60_000;
const cache = new Map(); // tenantId -> { value, at }

export async function getTenantSettings(tenantId = tenantNamespace.get('tenantId')) {
  if (!tenantId) return { ...DEFAULTS };
  const hit = cache.get(tenantId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  let value = { ...DEFAULTS };
  try {
    const row = await TenantSettings.findOne({ where: { tenantId } });
    if (row) for (const k of Object.keys(DEFAULTS)) value[k] = row[k] ?? DEFAULTS[k];
  } catch (err) {
    console.warn('Réglages du tenant illisibles, valeurs par défaut :', err.message);
  }
  cache.set(tenantId, { value, at: Date.now() });
  return value;
}

export const invalidateTenantSettings = (tenantId) => cache.delete(tenantId);
