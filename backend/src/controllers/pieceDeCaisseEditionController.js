// backend/src/controllers/pieceDeCaisseEditionController.js
// Modifier une Pièce de caisse déjà soumise (demande de la Comptable, 18/11/2026).
//
// Règle : tant que PERSONNE n'a validé la pièce (aucune étape du circuit en cours
// approuvée ni mise en pause, pas payée, pas archivée), la personne qui l'a créée
// (ou un administrateur) peut corriger le formulaire. Le PDF est refait, le
// circuit reste où il en est (le validateur en attente voit la version corrigée).
// Dès qu'une première validation existe, plus aucune modification : on ne change
// pas un montant sous une signature déjà apposée.
import fs from 'fs/promises';
import path from 'path';
import { Document, User, Workflow } from '../models/index.js';
import sequelize from '../config/database.js';
import { currentCycleSteps } from '../utils/workflowEngine.js';
import { resolvePieceDeCaisseChain } from '../utils/pieceDeCaisseChain.js';
import { mergePDFs, validatePDF } from '../utils/pdfMerger.js';
import { resolveStoredFileOrNull } from '../utils/storedFiles.js';
import { deleteThumbnails } from '../utils/thumbnails.js';
import { postDocumentEvent, personName } from '../utils/documentChatEvents.js';

const CATEGORY = 'Pièce de caisse';
const ETAPES_DECIDEES = new Set(['approved', 'en_pause']);

// Métadonnées posées par le serveur (fusion, circuit, paiement, signatures…) :
// jamais reprises du formulaire, toujours conservées.
const CLES_SERVEUR = ['manualSignature', 'verification_hash', 'interim', 'mergedFrom', 'paye', 'payeAt', 'payePar',
  'circuitPC', 'fusionné', 'fusionDate', 'fusionError', 'fusionAttempted', 'linkedDocumentId', 'linkedDocumentTitle',
  'linkedDocumentCategory', 'unsignedFilePath', 'modifications', 'sourceType', 'zonesParEtape', 'signaturePage'];

export const totalSorties = (meta) => (Array.isArray(meta?.lines) ? meta.lines : [])
  .reduce((acc, l) => acc + (Number(String(l?.sorties ?? '').replace(/[\s,]/g, '')) || 0), 0);

const dateFr = (d) => new Date(d).toLocaleDateString('fr-FR', { timeZone: 'Africa/Douala' });

/**
 * Peut-on modifier cette pièce ? → { modifiable, raison?, validePar?, valideLe? }
 * `steps` : étapes Workflow du document (toutes, l'appelant peut les charger sous verrou).
 */
export function etatModification(document, user, steps) {
  if (!document || document.category !== CATEGORY) return { modifiable: false, raison: 'Ce document n’est pas une pièce de caisse.' };
  if (!['admin', 'superadmin'].includes(user?.role) && document.userId !== user?.id) {
    return { modifiable: false, raison: 'Seule la personne qui a créé la pièce peut la modifier.' };
  }
  if (!Array.isArray(document.metadata?.lines)) {
    return { modifiable: false, raison: 'Pièce importée (fichier), pas créée avec le formulaire : modification impossible.' };
  }
  if (document.metadata?.paye) return { modifiable: false, raison: 'Pièce déjà payée : modification impossible.' };
  if (document.archived) return { modifiable: false, raison: 'Pièce archivée : modification impossible.' };
  const decidee = currentCycleSteps(steps).find((s) => ETAPES_DECIDEES.has(s.status));
  if (decidee || document.status === 'approved') {
    return {
      modifiable: false,
      raison: decidee?.validator
        ? `Pièce déjà validée par ${personName(decidee.validator)} le ${dateFr(decidee.validatedAt || decidee.updatedAt)} : modification impossible.`
        : 'Pièce déjà validée : modification impossible.',
      validePar: decidee?.validator ? personName(decidee.validator) : null,
      valideLe: decidee?.validatedAt || null,
    };
  }
  return { modifiable: true };
}

const chargerEtapes = (documentId, options = {}) => Workflow.findAll({
  where: { documentId },
  include: [{ model: User, as: 'validator', attributes: ['id', 'firstName', 'lastName', 'email'] }],
  order: [['step', 'ASC']],
  ...options,
});

// GET /api/documents/:id/piece-de-caisse/modification
export const getEtatModification = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) return res.status(404).json({ success: false, message: 'Document non trouvé.' });
    if (document.category !== CATEGORY) return res.json({ success: true, data: { modifiable: false } });
    res.json({ success: true, data: etatModification(document, req.user, await chargerEtapes(document.id)) });
  } catch (error) {
    console.error('❌ État de modification PC :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// Le bénéficiaire a changé : son étape du circuit suit (ajoutée, remplacée ou
// retirée). Les étapes ne sont pas encore décidées, on les met simplement à jour.
async function ajusterEtapeBeneficiaire(document, etapes, transaction) {
  if (document.metadata?.circuitPC === 'pharmacie') return;
  const cycle = currentCycleSteps(etapes);
  if (!cycle.length) return;
  // Mêmes titulaires qu'à la soumission pour les postes à plusieurs titulaires
  const selections = { dg: cycle[0]?.validatorId, comptable: cycle[1]?.validatorId, caissier: cycle[cycle.length - 1]?.validatorId };
  const { steps, error } = await resolvePieceDeCaisseChain(document, selections);
  if (error || steps.some((s) => s.needsSelection)) return;
  const seen = new Set();
  const voulus = steps.map((s) => s.chosenId).filter((id) => id && !seen.has(id) && seen.add(id));
  if (voulus.length === cycle.length && voulus.every((id, i) => id === cycle[i].validatorId)) return;

  for (let i = 0; i < Math.max(voulus.length, cycle.length); i++) {
    const etape = cycle[i];
    const validatorId = voulus[i];
    if (etape && validatorId) {
      if (etape.validatorId !== validatorId) await etape.update({ validatorId }, { transaction });
    } else if (etape && !validatorId) {
      await etape.destroy({ transaction });
    } else if (!etape && validatorId) {
      await Workflow.create({ documentId: document.id, validatorId, tenantId: document.tenantId, step: i + 1, status: 'queued' }, { transaction });
    }
  }
}

// PUT /api/documents/:id/piece-de-caisse (multipart : file, metadata, title)
export const modifierPieceDeCaisse = async (req, res) => {
  const fichierRecu = req.file ? path.resolve(process.cwd(), `uploads/${req.file.filename}`) : null;
  const jeter = async (p) => { if (p) await fs.unlink(p).catch(() => {}); };
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier fourni.' });
    if (req.file.mimetype !== 'application/pdf') {
      await jeter(fichierRecu);
      return res.status(400).json({ success: false, message: 'La pièce de caisse doit être un PDF.' });
    }
    let formulaire = {};
    try { formulaire = typeof req.body.metadata === 'string' ? JSON.parse(req.body.metadata) : (req.body.metadata || {}); } catch { formulaire = null; }
    if (!formulaire || typeof formulaire !== 'object' || Array.isArray(formulaire) || !Array.isArray(formulaire.lines)) {
      await jeter(fichierRecu);
      return res.status(400).json({ success: false, message: 'Formulaire de la pièce invalide.' });
    }

    const resultat = await sequelize.transaction(async (transaction) => {
      const document = await Document.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!document) return { status: 404, message: 'Document non trouvé.' };
      // Les étapes sont verrouillées : une validation en cours attend la fin de la modification
      const etapes = await Workflow.findAll({ where: { documentId: document.id }, order: [['step', 'ASC']], transaction, lock: transaction.LOCK.UPDATE });
      const validateurs = await User.findAll({ where: { id: [...new Set(etapes.map((e) => e.validatorId))] }, attributes: ['id', 'firstName', 'lastName', 'email'], transaction });
      for (const e of etapes) e.validator = validateurs.find((u) => u.id === e.validatorId) || null;
      const proprietaire = ['admin', 'superadmin'].includes(req.user.role) || document.userId === req.user.id;
      const etat = etatModification(document, req.user, etapes);
      if (!etat.modifiable) return { status: proprietaire ? 409 : 403, message: etat.raison };

      // Liasse : la pièce justificative (OM, bon…) reste en tête du PDF
      let nouveauChemin = `uploads/${req.file.filename}`;
      let taille = req.file.size;
      const ancien = document.metadata || {};
      if (ancien.fusionné && document.linkedDocumentId) {
        const lie = await Document.findByPk(document.linkedDocumentId, { transaction });
        const lieChemin = lie?.fileType === 'application/pdf' ? resolveStoredFileOrNull(lie.filePath) : null;
        if (!lieChemin || !(await validatePDF(lieChemin)) || !(await validatePDF(fichierRecu))) {
          return { status: 422, message: 'Impossible de refaire la liasse : la pièce justificative liée est introuvable ou illisible.' };
        }
        const octets = await mergePDFs(lieChemin, fichierRecu);
        nouveauChemin = `uploads/PC_${(lie.category || 'document').replace(/\s/g, '_')}_fusionné_${Date.now()}.pdf`;
        await fs.writeFile(path.resolve(process.cwd(), nouveauChemin), octets);
        await jeter(fichierRecu);
        taille = octets.length;
      }

      const metadata = { ...formulaire };
      for (const k of CLES_SERVEUR) {
        delete metadata[k];
        if (ancien[k] !== undefined) metadata[k] = ancien[k];
      }
      delete metadata.linkedOrdreMissionId;
      // Zones de signature remesurées sur le nouveau formulaire (sinon on garde les anciennes)
      if (!(Array.isArray(formulaire.signatureZones) && formulaire.signatureZones.length) && ancien.signatureZones) {
        metadata.signatureZones = ancien.signatureZones;
      }
      const trace = {
        at: new Date().toISOString(),
        par: req.user.id,
        parNom: personName(req.user),
        ancienTotal: totalSorties(ancien),
        nouveauTotal: totalSorties(metadata),
        ancienFichier: document.filePath,
      };
      metadata.modifications = [...(Array.isArray(ancien.modifications) ? ancien.modifications : []), trace];

      const ancienFichier = document.filePath;
      const titre = typeof req.body.title === 'string' && req.body.title.trim() ? req.body.title.trim().slice(0, 255) : document.title;
      await document.update({
        filePath: nouveauChemin,
        fileName: path.basename(nouveauChemin),
        originalName: req.file.originalname,
        fileSize: taille,
        title: titre,
        metadata,
      }, { transaction });

      await ajusterEtapeBeneficiaire(document, etapes, transaction);
      return { status: 200, document, trace, ancienFichier };
    });

    if (resultat.status !== 200) {
      await jeter(fichierRecu);
      return res.status(resultat.status).json({ success: false, message: resultat.message });
    }
    deleteThumbnails(resultat.document.id);
    // L'ancien PDF reste sur le disque (trace : metadata.modifications[].ancienFichier)

    const { AuditLog } = await import('../models/index.js');
    AuditLog.log(req, 'UPDATE', 'document', resultat.document.id, {
      action: 'modification_piece_de_caisse', ancienTotal: resultat.trace.ancienTotal, nouveauTotal: resultat.trace.nouveauTotal,
    });
    const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n);
    postDocumentEvent(resultat.document.id, `✏️ ${personName(req.user)} a modifié la pièce de caisse avant validation (total ${fmt(resultat.trace.ancienTotal)} → ${fmt(resultat.trace.nouveauTotal)} FCFA).`);

    const data = await Document.findByPk(resultat.document.id, { include: [{ model: User, as: 'uploadedBy', attributes: ['id', 'firstName', 'lastName'] }] });
    res.json({ success: true, data, message: 'Pièce de caisse modifiée.' });
  } catch (error) {
    console.error('❌ Modification PC :', error);
    await jeter(fichierRecu);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};
