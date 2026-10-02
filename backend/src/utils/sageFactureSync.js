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
import { loadSageFacture } from './sageFactureData.js';
import { decryptSecret } from './secretBox.js';
import { SAGE_DEFAULTS, sageConnectionConfig, fetchSageFactures, describeSageError, isIsoDate } from './integrations.js';

// Libellés des cadres de signature = étapes du modèle de workflow (même ordre),
// sinon réglage Sage (signatureLabels)
export function signatureLabelsFor(template, config) {
  // Nom de l'étape (ex. « Directeur Général ») ; `label` vaut le nom de la personne pour une étape « personne précise »
  const steps = [...(Array.isArray(template?.validators) ? template.validators : [])].sort((a, b) => (a.order ?? a.step ?? 0) - (b.order ?? b.step ?? 0));
  const fromTemplate = steps.map(v => (v?.name || v?.label || '').trim()).filter(Boolean);
  return fromTemplate.length ? fromTemplate : (config.signatureLabels || SAGE_DEFAULTS.signatureLabels);
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

    // Sécurité : jamais d'import sans date de début (sinon tout l'historique Sage)
    if (!isIsoDate(config.importFromDate)) return finish(false, 'Date de début de l’import non réglée : enregistrez les réglages Sage.');

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

        // Facture complète (patient, lignes avec leur BL d'origine) → liasse PDF :
        // facture + bordereaux de cession des BL en annexe
        const facture = await loadSageFacture(pool, docPiece);
        if (!facture) continue;
        const beneficiaireType = facture.patient.type;
        const { buffer, signatureZones, signaturePage } = await buildFacturePhpPdf(facture, { signatureLabels: signatureLabelsFor(template, config) });

        const fileName = `facture-php-sage-${docPiece}-${Date.now()}.pdf`;
        await fs.writeFile(path.resolve(process.cwd(), 'uploads', fileName), buffer);

        const document = await Document.create({
          title: `Facture PHP - ${facture.patient.nom || 'Patient'}${beneficiaireType ? ` (${beneficiaireType})` : ''} - ${docPiece}`,
          fileName,
          originalName: fileName,
          filePath: `uploads/${fileName}`,
          fileSize: buffer.length,
          fileType: 'application/pdf',
          userId: uploaderId,
          category: config.documentCategory,
          status: 'pending_validation',
          metadata: {
            signatureZones, signaturePage, sageDocPiece: docPiece, sageCompteCollectif: facture.patient.compteCollectif || null,
            beneficiaireType, sageComptabilisee: facture.comptabilisee, sageBl: facture.bl.map(x => x.piece),
            patientMatricule: facture.patient.matricule, patientSecteur: facture.patient.secteur,
          },
          tenantId,
        });

        try {
          await createWorkflowFromTemplate(document, template.id, tenantId);
        } catch (err) {
          // Circuit impossible (ex. poste sans titulaire) : on retire le document,
          // sinon il serait recréé à chaque synchronisation (pas encore marqué importé)
          await document.destroy({ force: true }).catch(() => {});
          await fs.unlink(path.resolve(process.cwd(), 'uploads', fileName)).catch(() => {});
          throw err;
        }

        await SageFactureImport.create({
          sageDocPiece: docPiece,
          sageClientNum: facture.patient.compteTiers,
          patientNom: facture.patient.nom,
          montantHT: facture.totalHT,
          montantTTC: facture.totalTTC,
          documentId: document.id,
          rawSnapshot: facture,
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
