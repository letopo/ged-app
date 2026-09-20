// backend/src/utils/sageFactureSync.js — Import automatique des factures
// patient PHP depuis Sage (SQL Server, base HSJM) vers la GED.
//
// Suit le même pattern que phpAutoClose.js : setTimeout auto-replanifié, pas
// de dépendance cron. Ne fait jamais planter le serveur si Sage est
// injoignable (try/catch englobant + log clair).
//
// ⚠️ LECTURE SEULE : ce module n'exécute jamais d'INSERT/UPDATE/DELETE contre
// Sage — uniquement des SELECT.
//
// ⚠️ Le filtre SQL identifiant précisément un client/pièce "PHP" est encore à
// confirmer avec l'utilisateur (voir plan). En attendant, SAGE_PHP_FILTER_SQL
// ci-dessous doit être ajusté — sans ce filtre, AUCUNE pièce n'est importée
// (mieux vaut ne rien importer que d'importer les mauvaises factures).

import sql from 'mssql';
import fs from 'fs/promises';
import path from 'path';
import { sageConnectionConfig, isSageConfigured } from '../config/sageConnection.js';
import { Document, SageFactureImport, User, WorkflowTemplate } from '../models/index.js';
import { createWorkflowFromTemplate } from './workflowEngine.js';
import { buildFacturePhpPdf } from './facturePhpPdfBuilder.js';

const HSJM_TENANT_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5';
const DOCUMENT_CATEGORY = 'Facture PHP Sage';
const WORKFLOW_TEMPLATE_NAME = 'Circuit Facture PHP';

// ⚠️ À COMPLÉTER : critère SQL identifiant une pièce "facture PHP" qualifiante.
// DO_Type=7 / DO_Domaine=0 = facture de vente (confirmé sur ce jeu de données),
// mais ne filtre pas encore sur le client/la mutuelle PHP.
const SAGE_PHP_FILTER_SQL = `
  E.DO_Type = 7
  AND E.DO_Domaine = 0
  -- TODO: ajouter ici le critère client/mutuelle PHP une fois confirmé
  -- (ex: AND C.CT_Intitule LIKE '%PHP%', ou AND C.N_CatTarif = X)
  AND 1 = 0 -- garde-fou : désactive l'import tant que le filtre n'est pas complété
`;

async function fetchQualifyingFactures(pool) {
  const result = await pool.request().query(`
    SELECT TOP 200
      E.DO_Piece, E.DO_Date, E.DO_Tiers, C.CT_Intitule,
      E.DO_TotalHT, E.DO_TotalTTC
    FROM F_DOCENTETE E
    LEFT JOIN F_COMPTET C ON C.CT_Num = E.DO_Tiers
    WHERE ${SAGE_PHP_FILTER_SQL}
    ORDER BY E.DO_Date DESC
  `);
  return result.recordset;
}

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

async function getSystemUploaderId() {
  const admin = await User.findOne({ where: { role: 'superadmin' }, attributes: ['id'] })
    || await User.findOne({ where: { role: 'admin' }, attributes: ['id'] });
  return admin?.id || null;
}

export async function runSageFactureSync() {
  if (!isSageConfigured()) {
    console.log('[Sage Sync] ℹ️  Non configuré (variables SAGE_* absentes) — job ignoré.');
    return;
  }

  const template = await WorkflowTemplate.findOne({ where: { name: WORKFLOW_TEMPLATE_NAME, tenantId: HSJM_TENANT_ID } });
  if (!template) {
    console.warn(`[Sage Sync] ⚠️  Modèle de workflow "${WORKFLOW_TEMPLATE_NAME}" introuvable — créez-le dans Paramètres > Modèles de workflow avant d'activer l'import.`);
    return;
  }

  const uploaderId = await getSystemUploaderId();
  if (!uploaderId) {
    console.warn('[Sage Sync] ⚠️  Aucun utilisateur admin/superadmin trouvé pour rattacher les documents importés — job ignoré.');
    return;
  }

  let pool;
  try {
    pool = await sql.connect(sageConnectionConfig);
  } catch (err) {
    console.error('[Sage Sync] ❌ Connexion Sage impossible :', err.message);
    return;
  }

  try {
    const candidates = await fetchQualifyingFactures(pool);
    let nbImportees = 0;

    for (const row of candidates) {
      const docPiece = row.DO_Piece;

      const alreadyImported = await SageFactureImport.findOne({ where: { sageDocPiece: docPiece } });
      if (alreadyImported) continue;

      const lignes = await fetchLignes(pool, docPiece);

      const { buffer, signatureZones } = await buildFacturePhpPdf({
        docPiece,
        patientNom: row.CT_Intitule,
        dateFacture: row.DO_Date instanceof Date ? row.DO_Date.toISOString().slice(0, 10) : row.DO_Date,
        lignes,
        totalHT: row.DO_TotalHT,
        totalTTC: row.DO_TotalTTC,
      });

      const fileName = `facture-php-sage-${docPiece}-${Date.now()}.pdf`;
      await fs.writeFile(path.resolve(process.cwd(), 'uploads', fileName), buffer);

      const document = await Document.create({
        title: `Facture PHP - ${row.CT_Intitule || 'Patient'} - ${docPiece}`,
        fileName,
        originalName: fileName,
        filePath: `uploads/${fileName}`,
        fileSize: buffer.length,
        fileType: 'application/pdf',
        userId: uploaderId,
        category: DOCUMENT_CATEGORY,
        status: 'pending_validation',
        metadata: { signatureZones, sageDocPiece: docPiece },
        tenantId: HSJM_TENANT_ID,
      });

      await createWorkflowFromTemplate(document, template.id, HSJM_TENANT_ID);

      await SageFactureImport.create({
        sageDocPiece: docPiece,
        sageClientNum: row.DO_Tiers,
        patientNom: row.CT_Intitule,
        montantHT: row.DO_TotalHT,
        montantTTC: row.DO_TotalTTC,
        documentId: document.id,
        rawSnapshot: { entete: row, lignes },
        tenantId: HSJM_TENANT_ID,
      });

      nbImportees++;
    }

    if (nbImportees > 0) {
      console.log(`[Sage Sync] ✅ ${nbImportees} facture(s) PHP importée(s) depuis Sage.`);
    } else {
      console.log('[Sage Sync] ℹ️  Aucune nouvelle facture PHP à importer.');
    }
  } catch (err) {
    console.error('[Sage Sync] ❌ Erreur pendant la synchronisation :', err.message);
  } finally {
    try { await pool.close(); } catch { /* déjà fermé */ }
  }
}

// ─── Planificateur sans cron (pattern identique à phpAutoClose.js) ──────────
export function startSageFactureSync() {
  const intervalMinutes = Number(process.env.SAGE_SYNC_INTERVAL_MINUTES) || 15;
  const ms = intervalMinutes * 60 * 1000;

  console.log(`[Sage Sync] ⏰ Synchronisation planifiée toutes les ${intervalMinutes} min.`);

  const tick = async () => {
    await runSageFactureSync().catch(err => console.error('[Sage Sync] ❌ Erreur non interceptée :', err.message));
    setTimeout(tick, ms);
  };

  setTimeout(tick, ms);
}
