// backend/src/utils/sageFactureSync.js — Import automatique des factures
// patient PHP depuis Sage (SQL Server) vers la GED, pour chaque tenant qui a
// activé l'intégration Sage (Paramètres › Intégrations, utils/integrations.js).
//
// Planificateur sans cron : une vérification par minute, chaque tenant est
// synchronisé à son propre rythme (syncIntervalMinutes). Ne fait jamais planter
// le serveur si Sage est injoignable (try/catch + résultat enregistré, visible
// à l'écran).
//
// ⚠️ LECTURE SEULE : ce module n'exécute jamais d'INSERT/UPDATE/DELETE contre
// Sage — uniquement des SELECT.
//
// ⚠️ Sans critère client (« facture PHP ») réglé à l'écran, AUCUNE pièce n'est
// importée : mieux vaut ne rien importer que d'importer les mauvaises factures.

import sql from 'mssql';
import fs from 'fs/promises';
import path from 'path';
import { tenantNamespace } from '../config/database.js';
import { Document, SageFactureImport, User, WorkflowTemplate, TenantIntegration } from '../models/index.js';
import { createWorkflowFromTemplate } from './workflowEngine.js';
import { buildFacturePhpPdf } from './facturePhpPdfBuilder.js';
import { decryptSecret } from './secretBox.js';
import { SAGE_DEFAULTS, sageConnectionConfig, fetchSageFactures, describeSageError, phpBeneficiaryType } from './integrations.js';

async function fetchLignes(pool, docPiece) {
  const result = await pool.request()
    .input('piece', sql.VarChar, docPiece)
    .query(`
      SELECT DL_Design, DL_Qte, DL_PrixUnitaire, DL_MontantHT
      FROM F_DOCLIGNE
      WHERE DO_Type = 7 AND DO_Piece = @piece
      ORDER BY DL_Ligne ASC
    `);
  return result.recordset.map(r => ({
    designation: r.DL_Design,
    quantite: r.DL_Qte,
    prixUnitaire: r.DL_PrixUnitaire,
    montant: r.DL_MontantHT,
  }));
}

// Compte auquel rattacher les documents importés : un administrateur du tenant
async function getSystemUploaderId(tenantId) {
  const admin = await User.findOne({ where: { role: 'superadmin', tenantId }, attributes: ['id'] })
    || await User.findOne({ where: { role: 'admin', tenantId }, attributes: ['id'] });
  return admin?.id || null;
}

// Ouvre une connexion Sage avec les réglages donnés (mot de passe en clair)
export async function openSagePool(config, password) {
  const pool = new sql.ConnectionPool(sageConnectionConfig(config, password));
  try {
    return await pool.connect();
  } catch (err) {
    const e = new Error(describeSageError(err));
    e.raw = err.message;
    throw e;
  }
}

/**
 * Synchronise un tenant. Renvoie { ok, message, imported }.
 * Ne lève pas d'erreur : le résultat est aussi enregistré sur l'intégration.
 */
export async function runSageSyncForTenant(integration) {
  const tenantId = integration.tenantId;
  const config = { ...SAGE_DEFAULTS, ...integration.config };
  const record = (ok, message) => TenantIntegration.update(
    { lastRunAt: new Date(), lastRunOk: ok, lastRunMessage: message },
    { where: { id: integration.id }, silent: true },
  ).catch(() => {});
  const finish = async (ok, message, imported = 0) => {
    console.log(`[Sage Sync] ${ok ? 'ℹ️ ' : '⚠️ '} tenant ${tenantId} : ${message}`);
    await record(ok, message);
    return { ok, message, imported };
  };

  // Hors requête HTTP : on fixe le tenant pour les hooks (tenantId automatique)
  return tenantNamespace.runPromise(async () => {
    tenantNamespace.set('tenantId', tenantId);

    const template = await WorkflowTemplate.findOne({ where: { name: config.workflowTemplateName, tenantId } });
    if (!template) return finish(false, `Modèle de workflow « ${config.workflowTemplateName} » introuvable : créez-le dans Modèles de workflow.`);
    const uploaderId = await getSystemUploaderId(tenantId);
    if (!uploaderId) return finish(false, 'Aucun administrateur trouvé pour rattacher les documents importés.');
    const password = decryptSecret(integration.secretEncrypted);
    if (config.username && !password) return finish(false, 'Mot de passe Sage absent ou illisible : ressaisissez-le.');

    let pool;
    try {
      pool = await openSagePool(config, password);
    } catch (err) {
      return finish(false, `Connexion impossible : ${err.message}`);
    }

    try {
      const candidates = await fetchSageFactures(pool, config);
      if (candidates === null) return await finish(false, 'Aucun critère « facture PHP » réglé : rien n’est importé.');
      let imported = 0;

      for (const row of candidates) {
        const docPiece = row.DO_Piece;
        const alreadyImported = await SageFactureImport.findOne({ where: { sageDocPiece: docPiece, tenantId } });
        if (alreadyImported) continue;

        const lignes = await fetchLignes(pool, docPiece);
        // Employé PHP (4127000) ou famille d'employé (4122000), d'après le compte collectif
        const beneficiaireType = phpBeneficiaryType(row.CG_NumPrinc);
        const { buffer, signatureZones } = await buildFacturePhpPdf({
          docPiece,
          beneficiaireType,
          patientNom: row.CT_Intitule,
          dateFacture: row.DO_Date instanceof Date ? row.DO_Date.toISOString().slice(0, 10) : row.DO_Date,
          lignes,
          totalHT: row.DO_TotalHT,
          totalTTC: row.DO_TotalTTC,
        });

        const fileName = `facture-php-sage-${docPiece}-${Date.now()}.pdf`;
        await fs.writeFile(path.resolve(process.cwd(), 'uploads', fileName), buffer);

        const document = await Document.create({
          title: `Facture PHP - ${row.CT_Intitule || 'Patient'}${beneficiaireType ? ` (${beneficiaireType})` : ''} - ${docPiece}`,
          fileName,
          originalName: fileName,
          filePath: `uploads/${fileName}`,
          fileSize: buffer.length,
          fileType: 'application/pdf',
          userId: uploaderId,
          category: config.documentCategory,
          status: 'pending_validation',
          metadata: { signatureZones, sageDocPiece: docPiece, sageCompteCollectif: row.CG_NumPrinc || null, beneficiaireType },
          tenantId,
        });

        await createWorkflowFromTemplate(document, template.id, tenantId);

        await SageFactureImport.create({
          sageDocPiece: docPiece,
          sageClientNum: row.DO_Tiers,
          patientNom: row.CT_Intitule,
          montantHT: row.DO_TotalHT,
          montantTTC: row.DO_TotalTTC,
          documentId: document.id,
          rawSnapshot: { entete: row, lignes },
          tenantId,
        });
        imported++;
      }

      return await finish(true, imported > 0
        ? `${imported} facture(s) PHP importée(s).`
        : 'Aucune nouvelle facture PHP à importer.', imported);
    } catch (err) {
      return await finish(false, `Erreur pendant la synchronisation : ${describeSageError(err)}`);
    } finally {
      try { await pool.close(); } catch { /* déjà fermé */ }
    }
  });
}

// ─── Planificateur ──────────────────────────────────────────────────────────
const running = new Set();

async function tick() {
  let integrations;
  try {
    integrations = await TenantIntegration.findAll({ where: { kind: 'sage', enabled: true } });
  } catch (err) {
    console.error('[Sage Sync] ❌ Lecture des intégrations :', err.message);
    return;
  }
  const now = Date.now();
  for (const integration of integrations) {
    const every = Math.max(5, Number(integration.config?.syncIntervalMinutes) || SAGE_DEFAULTS.syncIntervalMinutes) * 60_000;
    const due = !integration.lastRunAt || now - new Date(integration.lastRunAt).getTime() >= every;
    if (!due || running.has(integration.tenantId)) continue;
    running.add(integration.tenantId);
    runSageSyncForTenant(integration)
      .catch(err => console.error('[Sage Sync] ❌ Erreur non interceptée :', err.message))
      .finally(() => running.delete(integration.tenantId));
  }
}

// Synchronisation manuelle (bouton « Synchroniser maintenant »)
export async function runSageSyncNow(integration) {
  if (running.has(integration.tenantId)) return { ok: false, message: 'Une synchronisation est déjà en cours.' };
  running.add(integration.tenantId);
  try {
    return await runSageSyncForTenant(integration);
  } finally {
    running.delete(integration.tenantId);
  }
}

export function startSageFactureSync() {
  console.log('[Sage Sync] ⏰ Vérification chaque minute des intégrations Sage activées (Paramètres › Intégrations).');
  setInterval(() => { tick(); }, 60_000);
}
