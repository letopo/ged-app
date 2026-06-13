// backend/src/controllers/workflowController.js - VERSION COMPLÈTE AVEC SOCKET.IO

import { Workflow, Document, User, InvoiceFolder, NotificationPreference, WorkflowComment } from '../models/index.js';
import { sendNotificationEmail } from '../utils/mailer.js';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs/promises';
import path from 'path';
import { Op } from 'sequelize';
import { sequelize } from '../models/index.js';
import { getSignatureConfig } from '../config/documentSignatureConfig.js';
// ✅ NOUVEAU : Import du Socket Manager
import { emitNewTaskNotification, emitTaskUpdateNotification, isUserConnected } from '../utils/socketManager.js';
import { buildOrdreMissionChain, resolveOrdreMissionChain } from '../utils/ordreMissionChain.js';
import { getPosteHolders, userHasPoste } from '../utils/posteResolver.js';
import { sendNewTaskPushNotification } from '../services/pushNotificationService.js';
import { mergePDFs } from '../utils/pdfMerger.js';
import { PDFExtract } from 'pdf.js-extract';
import { computeDeadline } from '../utils/workflowAutoExpire.js';
import { generateVerificationHash, generateQRCodeBuffer, buildVerificationUrl } from '../utils/qrVerification.js';

// Helper : embarquer une image dans un PDF (tente JPG puis PNG)
async function embedImage(pdfDoc, imageBytes) {
  try {
    return await pdfDoc.embedJpg(imageBytes);
  } catch (_) {
    return await pdfDoc.embedPng(imageBytes);
  }
}

// Le comptable, le RH et le DG ne sont plus figés par email : ils sont résolus
// dynamiquement via les postes assignables (voir utils/posteResolver.js).

// ============================================
// FONCTION HELPER : Notifier un validateur
// ============================================
const notifyValidator = async (validator, document, isFirstValidator = false) => {
  if (!validator?.email) return;

  // Verifier les preferences de notification
  try {
    const prefs = await NotificationPreference.findOne({ where: { userId: validator.id } });
    if (prefs?.emailOnNewTask === false) {
      console.log(`🔕 User ${validator.id} a desactive les emails de nouvelles taches`);
      // On envoie quand meme le WebSocket/Push, mais pas l'email
    }
  } catch (e) { /* continue */ }

  const subject = 'Nouvelle tache de validation';
  const body = `Vous avez une nouvelle tache de validation pour le document "${document.title}".`;

  try {
    const isConnected = isUserConnected(validator.id);
    
    if (isConnected) {
      console.log(`🔌 User ${validator.id} connecté - WebSocket`);
      emitNewTaskNotification(validator.id, {
        taskId: document.id,
        documentId: document.id,
        documentTitle: document.title,
        documentCategory: document.category,
        submittedBy: document.uploadedBy?.firstName 
          ? `${document.uploadedBy.firstName} ${document.uploadedBy.lastName}` 
          : 'Inconnu'
      });
    } else {
      console.log(`📧 User ${validator.id} hors ligne - Email + Push`);
      
      // ✅ NOUVEAU : Envoyer notification push
      await sendNewTaskPushNotification(validator.id, {
        taskId: document.id,
        documentId: document.id,
        documentTitle: document.title,
        documentCategory: document.category,
        submittedBy: document.uploadedBy?.firstName 
          ? `${document.uploadedBy.firstName} ${document.uploadedBy.lastName}` 
          : 'Inconnu'
      });
    }
    
    // Email en backup (si preference activee)
    const emailPrefs = await NotificationPreference.findOne({ where: { userId: validator.id } }).catch(() => null);
    if (emailPrefs?.emailOnNewTask !== false) {
      await sendNotificationEmail(validator.email, subject, body, 'task');
    }

  } catch (emailError) {
    console.warn('⚠️ Erreur envoi notification:', emailError.message);
  }
};

// ============================================
// FONCTION HELPER : Notifier le soumetteur (approbation/rejet)
// ============================================
const notifySubmitter = async (document, status, validatorComment) => {
  try {
    const submitter = await User.findByPk(document.uploadedById || document.uploadedBy?.id);
    if (!submitter?.email) return;

    // Verifier les preferences de notification
    const prefs = await NotificationPreference.findOne({ where: { userId: submitter.id } });
    if (status === 'approved' && prefs?.emailOnApproval === false) return;
    if (status === 'rejected' && prefs?.emailOnRejection === false) return;

    const isApproved = status === 'approved';
    const subject = isApproved
      ? `Document approuve : ${document.title}`
      : `Document rejete : ${document.title}`;

    const commentLine = validatorComment ? `\n\nCommentaire du validateur : ${validatorComment}` : '';
    const body = isApproved
      ? `Votre document "${document.title}" a ete approuve par tous les validateurs.${commentLine}`
      : `Votre document "${document.title}" a ete rejete.${commentLine}`;

    const emailType = isApproved ? 'approved' : 'rejected';

    // WebSocket si connecte
    const isConnected = isUserConnected(submitter.id);
    if (isConnected) {
      emitTaskUpdateNotification(submitter.id, {
        documentId: document.id,
        documentTitle: document.title,
        status,
        comment: validatorComment,
      });
    }

    // Push notification
    try {
      await sendNewTaskPushNotification(submitter.id, {
        documentId: document.id,
        documentTitle: document.title,
        status,
      });
    } catch (e) { /* push non bloquant */ }

    // Email
    await sendNotificationEmail(submitter.email, subject, body, emailType);
    console.log(`📧 Notification ${status} envoyee au soumetteur ${submitter.email}`);
  } catch (err) {
    console.warn('⚠️ Erreur notifySubmitter:', err.message);
  }
};

// Créer un workflow avec ajout automatique du comptable pour Ordre de mission
export const createWorkflow = async (req, res) => {
  try {
    const { documentId, validatorIds, posteSelections } = req.body;
    // validatorIds n'est requis que pour les documents hors « Ordre de mission » :
    // pour un OM, le circuit est construit côté serveur depuis le type + les postes.
    if (!documentId) {
      return res.status(400).json({ success: false, message: 'documentId requis.' });
    }
    
    const document = await Document.findByPk(documentId, {
      include: [
        { model: User, as: 'uploadedBy', attributes: ['id', 'firstName', 'lastName'] },
        // ✅ AJOUT DE CE BLOC pour récupérer le dossier et son parent
        { 
          model: InvoiceFolder, 
          as: 'folder', 
          include: [{ model: InvoiceFolder, as: 'parent' }] 
        }
      ]
    });
    
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document introuvable.' });
    }

    // =========================================================================
    // ✅ DÉBUT DU BLOC AJOUTÉ : RENOMMAGE AUTOMATIQUE
    // =========================================================================
    if (document.folder) {
        let prefix = '';
        
        // Cas 1 : C'est un sous-dossier (ex: FAMILLE PHP qui est dans PHP)
        if (document.folder.parent) {
            // On prend les 3 premières lettres du Parent (ex: PHP)
            const parentCode = document.folder.parent.name.substring(0, 3).toUpperCase(); 
            // On prend les 3 premières lettres de l'enfant (ex: FAM)
            const childCode = document.folder.name.substring(0, 3).toUpperCase(); 
            
            prefix = `${parentCode} - ${childCode}`; // Résultat : PHP - FAM
        } 
        // Cas 2 : C'est un dossier racine simple (ex: TISSERIN)
        else {
            const folderCode = document.folder.name.substring(0, 3).toUpperCase();
            // On ne renomme pas si c'est juste dans la "Boîte de réception"
            if (document.folder.type !== 'inbox') {
                prefix = folderCode;
            }
        }

        // Si on a un préfixe et que le titre ne commence pas déjà par ça, on renomme
        if (prefix && !document.title.startsWith(prefix)) {
            const newTitle = `${prefix} - ${document.title}`;
            await document.update({ title: newTitle });
            console.log(`📝 Document renommé automatiquement : ${newTitle}`);
        }
    }
    // =========================================================================
    // ✅ FIN DU BLOC AJOUTÉ
    // =========================================================================

    // La suite du code (Si c'est un Ordre de mission...) reste inchangée

    // Construction du circuit de validation
    let finalValidatorIds;
    let comptableAdded = false;

    if (document.category === 'Ordre de mission') {
      // Circuit construit côté serveur : chef du service demandeur → chaîne du
      // type (postes) → comptable si frais. Plus aucun email figé.
      const built = await buildOrdreMissionChain(document, posteSelections || {});
      if (built.error) {
        return res.status(400).json({ success: false, message: built.error });
      }
      finalValidatorIds = built.validatorIds;
      comptableAdded = built.comptableAdded;
    } else {
      // Autres documents : validateurs choisis par l'utilisateur
      if (!Array.isArray(validatorIds) || validatorIds.length === 0) {
        return res.status(400).json({ success: false, message: 'validatorIds (array) requis.' });
      }
      finalValidatorIds = [...validatorIds];
    }
    
    const now = new Date();
    const workflows = await Promise.all(
      finalValidatorIds.map((validatorId, index) =>
        Workflow.create({
          documentId,
          validatorId,
          step: index + 1,
          status: index === 0 ? 'pending' : 'queued',
          assignedAt: index === 0 ? now : null,
          deadlineAt: index === 0 ? computeDeadline(now) : null,
        })
      )
    );
    
    await document.update({ status: 'pending_validation' });
    
    // ✅ NOUVEAU : Notifier le premier validateur avec WebSocket + Email
    const firstValidator = await User.findByPk(finalValidatorIds[0]);
    await notifyValidator(firstValidator, document, true);
    
    const workflowsWithValidators = await Workflow.findAll({
      where: { documentId },
      include: [{ model: User, as: 'validator', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      order: [['step', 'ASC']],
    });
    
    res.status(201).json({ 
      success: true, 
      data: workflowsWithValidators, 
      message: comptableAdded 
        ? 'Workflow créé avec succès. Le comptable a été ajouté automatiquement pour la création de la Pièce de caisse.' 
        : 'Workflow créé avec succès.' 
    });
  } catch (error) {
    console.error('❌ Erreur création workflow:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// Aperçu du circuit d'un ordre de mission : étapes, titulaires possibles par poste,
// et postes nécessitant un choix (plusieurs titulaires). Sert à l'écran de soumission.
export const getOrdreMissionPreview = async (req, res) => {
  try {
    const { documentId } = req.params;
    const document = await Document.findByPk(documentId);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document introuvable.' });
    }
    const result = await resolveOrdreMissionChain(document, {});
    if (result.error) {
      return res.status(400).json({ success: false, message: result.error });
    }
    res.json({ success: true, steps: result.steps });
  } catch (error) {
    console.error('❌ Erreur aperçu OM:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// Récupérer les tâches d'un utilisateur (avec pagination)
export const getMyTasks = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const userId = req.user.id;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = { validatorId: userId };
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    const { count, rows } = await Workflow.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Document,
          as: 'document',
          // Pas de workflows imbriqués ici — on les calcule séparément ci-dessous
          include: [
            { model: User, as: 'uploadedBy', attributes: ['id', 'firstName', 'lastName'] },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    // Pour les tâches "queued" : charger uniquement l'étape précédente en attente
    // (nécessaire pour la logique de bypass côté frontend)
    // Une seule requête groupée au lieu d'un join N+1 pour chaque tâche
    const queuedDocumentIds = rows
      .filter(t => t.status === 'queued')
      .map(t => t.documentId);

    let bypassMap = {}; // documentId → étape précédente pending
    if (queuedDocumentIds.length > 0) {
      const prevSteps = await Workflow.findAll({
        where: {
          documentId: queuedDocumentIds,
          status: 'pending',
        },
        attributes: ['id', 'documentId', 'step', 'status', 'assignedAt', 'deadlineAt'],
        order: [['step', 'ASC']],
      });
      // Garder l'étape pending la plus basse par document
      for (const w of prevSteps) {
        const docId = w.documentId;
        if (!bypassMap[docId] || w.step < bypassMap[docId].step) {
          bypassMap[docId] = {
            step: w.step,
            status: w.status,
            assignedAt: w.assignedAt,
            deadlineAt: w.deadlineAt,
          };
        }
      }
    }

    // Tâches en retard (deadline dépassée) en premier, puis par date décroissante
    const now = new Date();
    const tasks = [...rows]
      .map(t => {
        const plain = t.toJSON();
        // Attacher bypassInfo uniquement si utile (queued + étape précédente en retard)
        if (plain.status === 'queued' && bypassMap[plain.documentId]) {
          plain.bypassInfo = bypassMap[plain.documentId];
        }
        return plain;
      })
      .sort((a, b) => {
        const aOverdue = a.status === 'pending' && a.deadlineAt && now > new Date(a.deadlineAt) ? 0 : 1;
        const bOverdue = b.status === 'pending' && b.deadlineAt && now > new Date(b.deadlineAt) ? 0 : 1;
        if (aOverdue !== bOverdue) return aOverdue - bOverdue;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

    res.json({
      success: true,
      tasks,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('❌ Erreur récupération tâches:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// Fonction helper pour réactiver une demande de travaux ET FUSIONNER LE DOCUMENT
// Fonction helper pour réactiver une demande de travaux ET FUSIONNER LE DOCUMENT
async function reactivateLinkedWorkRequest(originDocument, transaction) {
  try {
    const linkedWorkRequestId = originDocument.metadata?.linkedWorkRequestId;
    if (!linkedWorkRequestId) {
        console.log(`⚠️ Pas de DT liée trouvée pour le document ${originDocument.id}`);
        return;
    }

    // 1. Récupérer la DT Parente
    const workRequest = await Document.findByPk(linkedWorkRequestId, { transaction });
    if (!workRequest) {
        console.log(`⚠️ DT liée introuvable (ID: ${linkedWorkRequestId})`);
        return;
    }

    // =========================================================================
    // 🆕 LOGIQUE DE FUSION : Pour "Fiche de suivi" OU "Demande de besoin"
    // =========================================================================
    const CATEGORIES_A_FUSIONNER = ["Fiche de suivi d'équipements", "Demande de besoin"];

    if (CATEGORIES_A_FUSIONNER.includes(originDocument.category)) {
        try {
            console.log(`🔄 Fusion automatique : Ajout de "${originDocument.category}" #${originDocument.id} à la DT #${workRequest.id}`);
            
            const dtPath = path.resolve(process.cwd(), workRequest.filePath);
            const childPath = path.resolve(process.cwd(), originDocument.filePath);
            
            // Fusion : DT (Page 1) + Document Enfant (Page 2)
            const mergedPdfBytes = await mergePDFs(dtPath, childPath);
            
            // Écraser la DT originale avec le fichier fusionné
            await fs.writeFile(dtPath, mergedPdfBytes);
            
            // Préparer les flags de métadonnées selon le type de document
            const metadataUpdates = {};
            if (originDocument.category === "Fiche de suivi d'équipements") {
                metadataUpdates.has_fiche_suivi = true;
                metadataUpdates.fiche_suivi_id = originDocument.id;
            } else if (originDocument.category === "Demande de besoin") {
                metadataUpdates.has_demande_besoin = true;
                metadataUpdates.demande_besoin_id = originDocument.id;
            }

            // Mettre à jour les métadonnées pour trace
            const newMetadata = {
                ...workRequest.metadata,
                ...metadataUpdates,
                last_merged_at: new Date(),
                merged_document_category: originDocument.category
            };
            
            await workRequest.update({ metadata: newMetadata }, { transaction });
            console.log('✅ Fusion PDF réussie et sauvegardée sur la DT.');
            
        } catch (mergeError) {
            console.error('❌ Erreur critique lors de la fusion PDF:', mergeError);
        }
    }
    // =========================================================================

    // 2. Reprise du Workflow Parente
    const pausedWorkflow = await Workflow.findOne({ 
      where: { documentId: workRequest.id, status: 'en_pause' }, 
      transaction 
    });
    
    if (pausedWorkflow) {
      const reason = `${originDocument.category} validée`;
      
      await pausedWorkflow.update({
        status: 'pending',
        comment: `${reason}. Document joint automatiquement. Reprise du processus.`,
        assignedAt: new Date(),
        deadlineAt: computeDeadline(),
      }, { transaction });
      
      await workRequest.update({ status: 'in_progress' }, { transaction });
      
      const nextValidator = await User.findByPk(pausedWorkflow.validatorId, { transaction });
      if (nextValidator?.email) {
        // Notification Socket
        const isConnected = isUserConnected(nextValidator.id);
        if (isConnected) {
          emitNewTaskNotification(nextValidator.id, {
            taskId: pausedWorkflow.id,
            documentId: workRequest.id,
            documentTitle: workRequest.title,
            documentCategory: workRequest.category,
            submittedBy: 'Système'
          });
        }
        
        try {
          await sendNotificationEmail(
            nextValidator.email,
            'Demande de Travaux à reprendre',
            `La ${originDocument.category} a été validée et fusionnée au dossier. Vous pouvez maintenant continuer la validation de "${workRequest.title}".`
          );
        } catch (emailError) {
          console.warn('⚠️ Erreur envoi email:', emailError.message);
        }
      }
      console.log(`✅ DT ${workRequest.id} réactivée suite à la validation de ${originDocument.category} ${originDocument.id}`);
    }
  } catch (error) {
    console.error('❌ Erreur réactivation DT:', error);
  }
}

  // ============================================
  // 4. VALIDER UNE TÂCHE (CORRIGÉE : FORCE LE PASSAGE À L'ÉTAPE SUIVANTE)
  // ============================================
  export const validateTask = async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { taskId } = req.params;
      // On récupère les données
      const { status, comment, validationType, remplacantName } = req.body; 
      const userId = req.user.id;

      // ✅ CORRECTION CRITIQUE : On détermine un statut effectif
      // Si pas de statut fourni mais qu'on signe/cachette, on considère que c'est 'approved'
      let effectiveStatus = status;
      if (!effectiveStatus && ['approve_sign_stamp', 'signature', 'stamp', 'dater'].includes(validationType)) {
          effectiveStatus = 'approved';
      }

      const task = await Workflow.findByPk(taskId, { 
        include: [{ model: Document, as: 'document', include: [{ model: User, as: 'uploadedBy' }] }], 
        transaction: t 
      });
      
      if (!task) {
        await t.rollback();
        return res.status(404).json({ success: false, message: 'Tâche introuvable.' });
      }
      
      if (task.validatorId !== userId) {
        await t.rollback();
        return res.status(403).json({ success: false, message: 'Non autorisé.' });
      }

      const document = task.document;
      const validator = await User.findByPk(userId, { transaction: t });

      // --- LOGIQUE REMPLAÇANT POUR PERMISSION ---
      if (document.category === 'Demande de permission' && remplacantName && (effectiveStatus === 'approved')) {
          try {
              const pdfPath = path.resolve(process.cwd(), document.filePath);
              const pdfDoc = await PDFDocument.load(await fs.readFile(pdfPath));
              const page = pdfDoc.getPages()[0];
              const { height: pageHeight } = page.getSize();
              const pdfExtract = new PDFExtract();
              const data = await pdfExtract.extract(pdfPath, {});
              const pageContent = data.pages[0].content;
              const anchor = pageContent.find(item => item.str && item.str.includes('Intérim assuré par :'));
              
              if (anchor) {
                  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
                  page.drawText(remplacantName, {
                      x: anchor.x + anchor.width + 10,
                      y: pageHeight - anchor.y + 2,
                      size: 11,
                      font: font,
                      color: rgb(0, 0, 0),
                  });
              }
              await fs.writeFile(pdfPath, await pdfDoc.save({ useObjectStreams: false }));
          } catch (error) {
              console.error('⚠️ Erreur écriture remplaçant:', error.message);
          }
      }

      // ----------------------------------------------------------------
      // GESTION DES SIGNATURES
      // ----------------------------------------------------------------
      const allWorkflows = await Workflow.findAll({ where: { documentId: document.id }, include: [{ model: User, as: 'validator', attributes: ['id', 'email'] }], order: [['step', 'ASC']], transaction: t });
      const totalSteps = allWorkflows.length;
      const lastWorkflow = allWorkflows[allWorkflows.length - 1];
      // Le dernier validateur est-il le comptable ? (résolu par poste, plus par email)
      const comptableHolderIds = (await getPosteHolders('comptable')).map(u => u.id);
      const isLastWorkflowComptable = comptableHolderIds.includes(lastWorkflow.validatorId);
      const totalStepsWithoutComptable = isLastWorkflowComptable ? totalSteps - 1 : totalSteps;
      
      let signatureConfig = getSignatureConfig(document.category);
      // Pour le Bon de commande interne, respecter le nombre de signataires choisi par l'utilisateur
      const metadataNbSig = document.metadata?.nbSignataires ? parseInt(document.metadata.nbSignataires) : null;
      const numberOfSignatures = (metadataNbSig && metadataNbSig >= 1 && metadataNbSig <= signatureConfig.numberOfSignatures)
        ? metadataNbSig
        : signatureConfig.numberOfSignatures;

      // Vérification de la zone de signature
      const isInSignatureRange = task.step > (totalStepsWithoutComptable - numberOfSignatures);

      // Si on essaie de signer hors zone, on bloque (sauf pour dater)
      if ((validationType === 'approve_sign_stamp' || ['signature', 'stamp'].includes(validationType)) && !isInSignatureRange) {
          await t.rollback();
          return res.status(400).json({ success: false, message: 'Hors zone de signature.' });
      }

      // --- MISE EN PAUSE ---
      if (validationType === 'pause') {
        await task.update({ status: 'en_pause', comment, validatedAt: new Date() }, { transaction: t });
        await document.update({ status: 'en_attente_dependance' }, { transaction: t });
        await t.commit();
        return res.json({ success: true, message: 'Tâche mise en pause.' });
      }

      // --- APPLICATION SIGNATURE / CACHET SUR LE PDF ---
      if (['approve_sign_stamp', 'signature', 'stamp', 'dater'].includes(validationType) && document.fileType === 'application/pdf') {
        const pdfPath = path.resolve(process.cwd(), document.filePath);
        const pdfDoc = await PDFDocument.load(await fs.readFile(pdfPath));
        pdfDoc.registerFontkit(fontkit);
        
        const pages = pdfDoc.getPages();
        
        // Choix de la page
        let pageIndexToSign = pages.length - 1; 
        if (document.category === 'Demande de travaux') pageIndexToSign = 0;
        if (document.category === 'Demande de permutation') pageIndexToSign = 0;
        if (pageIndexToSign >= pages.length) pageIndexToSign = pages.length - 1;
        
        const targetPage = pages[pageIndexToSign];
        const { width, height } = targetPage.getSize();

        // CALCUL POSITION
        let positionInSignatureGroup = task.step - (totalStepsWithoutComptable - numberOfSignatures);
        // Utiliser le nombre de signataires effectif pour le calcul des positions X
        const effectiveConfig = { ...signatureConfig, numberOfSignatures };
        let baseX = calculateSignatureX(positionInSignatureGroup, effectiveConfig, width);
        let baseY = signatureConfig.signatureY;

        // ── ZONES D'ANCRAGE (système de coordonnées dynamiques) ─────────────
        // Si le document contient des zones pré-calculées depuis le DOM HTML,
        // on les utilise à la place des coordonnées statiques du config.
        // Cela garantit que la signature tombe toujours dans le bon cadre,
        // quelle que soit la hauteur du contenu (nombre de lignes, etc.).
        const preCalcZones = Array.isArray(document.metadata?.signatureZones)
          ? document.metadata.signatureZones
          : null;
        const activeZone = preCalcZones
          ? (preCalcZones.find(z => z.index === positionInSignatureGroup) || preCalcZones[positionInSignatureGroup - 1])
          : null;

        if (activeZone) {
          baseX = activeZone.x;
          baseY = activeZone.y;
          // Tous les templates : cachet dans la moitié HAUTE, signature dans la moitié BASSE
          const halfH = activeZone.height / 2;
          signatureConfig = {
            ...signatureConfig,
            blockWidth:      activeZone.width,
            signatureWidth:  activeZone.width * 0.90,
            signatureHeight: halfH            * 0.85,
            stampWidth:      activeZone.width * 0.90,
            stampHeight:     halfH            * 0.85,
            stampY:          activeZone.y,
          };
        }
        // ────────────────────────────────────────────────────────────────────

        // LOGIQUE SPÉCIALE : DEMANDE DE PERMUTATION
        if (document.category === 'Demande de permutation') {
            if (task.step === 1) {
                baseX = 50; 
                baseY = 210; 
            } else if (task.step === 2) {
                baseX = 350; 
                baseY = 210;
            } else {
                const bottomRowPosition = task.step - 2; 
                const configForBottom = { ...signatureConfig, numberOfSignatures: 3 }; 
                baseX = calculateSignatureX(bottomRowPosition, configForBottom, width);
                baseY = 100;
            }
        }

        // 1. DATER (RH) — le validateur est-il titulaire du poste RH ?
        if (validationType === 'dater' && await userHasPoste(validator.id, 'rh')) {
          const dateText = `Reçu le : ${new Date().toLocaleDateString('fr-FR')}`;
          try {
            const specialEliteFontPath = path.resolve(process.cwd(), 'fonts/SpecialElite-Regular.ttf');
            const customFont = await pdfDoc.embedFont(await fs.readFile(specialEliteFontPath));
            targetPage.drawText(dateText, { x: 420, y: height - 100, size: 13, font: customFont, color: rgb(0.8, 0, 0) });
          } catch (e) {
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            targetPage.drawText(dateText, { x: 420, y: height - 100, size: 13, font, color: rgb(0.8, 0, 0) });
          }
        }

        // 2. SIGNATURE
        if ((validationType === 'signature' || validationType === 'approve_sign_stamp') && validator.signaturePath) {
          const signatureImagePath = path.resolve(process.cwd(), validator.signaturePath);
          const signatureImageBytes = await fs.readFile(signatureImagePath);
          const signatureImage = await embedImage(pdfDoc, signatureImageBytes);
          const signatureDims = signatureImage.scaleToFit(signatureConfig.signatureWidth, signatureConfig.signatureHeight);

          // Ancrage : signature dans la moitié BASSE (tous les templates)
          const sigY = activeZone
            ? activeZone.y + (activeZone.height / 2 - signatureDims.height) / 2
            : baseY;

          targetPage.drawImage(signatureImage, {
            x: baseX + (signatureConfig.blockWidth / 2) - (signatureDims.width / 2),
            y: sigY,
            width: signatureDims.width,
            height: signatureDims.height
          });
        }

        // 3. CACHET
        if ((validationType === 'stamp' || validationType === 'approve_sign_stamp') && validator.stampPath) {
          const stampImagePath = path.resolve(process.cwd(), validator.stampPath);
          const stampImageBytes = await fs.readFile(stampImagePath);
          const stampImage = await embedImage(pdfDoc, stampImageBytes);
          const stampDims = stampImage.scaleToFit(signatureConfig.stampWidth, signatureConfig.stampHeight);

          // Ancrage : cachet dans la moitié HAUTE (tous les templates)
          const stampYAdjusted = activeZone
            ? activeZone.y + activeZone.height / 2 + (activeZone.height / 2 - stampDims.height) / 2
            : (document.category === 'Demande de permutation' && task.step <= 2)
              ? baseY - 10
              : signatureConfig.stampY;

          targetPage.drawImage(stampImage, {
            x: baseX + (signatureConfig.blockWidth / 2) - (stampDims.width / 2),
            y: stampYAdjusted,
            width: stampDims.width,
            height: stampDims.height
          });
        }

        // Sauvegarde du fichier modifié
        const newFileName = `${path.basename(document.fileName, path.extname(document.fileName)).replace(/_v\d+$/, '')}_v${Date.now()}${path.extname(document.fileName)}`;
        const newFilePath = path.resolve(process.cwd(), `uploads/${newFileName}`);
        await fs.writeFile(newFilePath, await pdfDoc.save({ useObjectStreams: false }));
        
        await document.update({
          filePath: `uploads/${newFileName}`,
          fileName: newFileName,
          metadata: { 
              ...document.metadata, 
              has_signature: true,
              has_stamp: (validationType === 'approve_sign_stamp' || validationType === 'stamp') 
          },
        }, { transaction: t });
      }

      // --- MISE À JOUR STATUS WORKFLOW (CRUCIAL) ---
      // ✅ Utilisation de effectiveStatus au lieu de status
      if (effectiveStatus) {
        await task.update({ status: effectiveStatus, comment, validatedAt: new Date() }, { transaction: t });
        
        if (effectiveStatus === 'approved') {
          const nextTask = await Workflow.findOne({ where: { documentId: document.id, status: 'queued' }, order: [['step', 'ASC']], transaction: t });
          
          if (nextTask) {
            // ACTIVATION TÂCHE SUIVANTE
            await nextTask.update({ status: 'pending', assignedAt: new Date(), deadlineAt: computeDeadline() }, { transaction: t });
            await document.update({ status: 'in_progress' }, { transaction: t });

            const nextValidator = await User.findByPk(nextTask.validatorId, { transaction: t });
            if (nextValidator) notifyValidator(nextValidator, document);
            
            console.log(`✅ Tâche ${task.id} validée. Suivante : ${nextTask.id} (User ${nextTask.validatorId})`);
          } else {
            // FIN DU WORKFLOW - Ajouter QR code de verification
            const verificationHash = generateVerificationHash(document.id, task.step, task.validatorId);
            const verificationUrl = buildVerificationUrl(verificationHash);

            try {
              const currentFilePath = path.resolve(process.cwd(), document.filePath);
              const currentPdfBytes = await fs.readFile(currentFilePath);
              const qrPdfDoc = await PDFDocument.load(currentPdfBytes);
              const qrBuffer = await generateQRCodeBuffer(verificationUrl);
              const qrImage = await qrPdfDoc.embedPng(qrBuffer);

              // Ajouter le QR en bas a droite de la derniere page
              const lastPage = qrPdfDoc.getPage(qrPdfDoc.getPageCount() - 1);
              const { width: pageW } = lastPage.getSize();
              const qrSize = 55;
              const qrMargin = 15;

              lastPage.drawImage(qrImage, {
                x: pageW - qrSize - qrMargin,
                y: qrMargin,
                width: qrSize,
                height: qrSize,
              });

              // Texte sous le QR
              const font = await qrPdfDoc.embedFont(StandardFonts.Helvetica);
              lastPage.drawText('Verifier:', {
                x: pageW - qrSize - qrMargin,
                y: qrMargin + qrSize + 3,
                size: 5,
                font,
                color: rgb(0.4, 0.4, 0.4),
              });
              lastPage.drawText(verificationHash, {
                x: pageW - qrSize - qrMargin,
                y: qrMargin - 7,
                size: 4.5,
                font,
                color: rgb(0.5, 0.5, 0.5),
              });

              const qrFileName = `${path.basename(document.fileName, path.extname(document.fileName)).replace(/_v\d+$/, '')}_v${Date.now()}${path.extname(document.fileName)}`;
              const qrFilePath = path.resolve(process.cwd(), `uploads/${qrFileName}`);
              await fs.writeFile(qrFilePath, await qrPdfDoc.save({ useObjectStreams: false }));

              await document.update({
                status: 'approved',
                filePath: `uploads/${qrFileName}`,
                fileName: qrFileName,
                metadata: {
                  ...document.metadata,
                  verification_hash: verificationHash,
                  verification_url: verificationUrl,
                  verified_at: new Date().toISOString(),
                },
              }, { transaction: t });

              console.log(`🔐 QR de verification ajoute: ${verificationHash}`);
            } catch (qrErr) {
              console.warn('⚠️ Erreur ajout QR (non bloquant):', qrErr.message);
              // Continuer sans QR si erreur
              await document.update({
                status: 'approved',
                metadata: {
                  ...document.metadata,
                  verification_hash: verificationHash,
                },
              }, { transaction: t });
            }

            if (['Demande de besoin', "Fiche de suivi d'équipements"].includes(document.category)) {
              await reactivateLinkedWorkRequest(document, t);
            }
            console.log(`🎉 Workflow terminé pour document ${document.id}`);
            // Notifier le soumetteur de l'approbation
            notifySubmitter(document, 'approved', comment);
          }
        } else if (effectiveStatus === 'rejected') {
          await document.update({ status: 'rejected' }, { transaction: t });
          await Workflow.update({ status: 'rejected' }, { where: { documentId: document.id, status: 'queued' }, transaction: t });
          // Notifier le soumetteur du rejet
          notifySubmitter(document, 'rejected', comment);
        }
      } else {
          console.warn(`⚠️ Attention: Validation appelée sans statut effectif pour la tâche ${taskId}`);
      }

      await t.commit();

      // Audit validation
      const { AuditLog } = await import('../models/index.js');
      AuditLog.log(req, effectiveStatus === 'approved' ? 'APPROVE' : 'REJECT', 'workflow', taskId, {
        documentId: document.id,
        documentTitle: document.title,
        comment,
      });

      const updatedTask = await Workflow.findByPk(taskId, { include: [{ model: Document, as: 'document', include: [{ model: User, as: 'uploadedBy' }] }] });
      res.json({ success: true, data: updatedTask, message: `Action '${validationType || effectiveStatus}' effectuée.` });

    } catch (error) {
      if (t && !t.finished) await t.rollback();
      console.error('❌ Erreur validation tâche:', error);
      res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
  };

// Récupérer le workflow d'un document
export const getDocumentWorkflow = async (req, res) => {
  try {
    const { documentId } = req.params;
    const workflows = await Workflow.findAll({
      where: { documentId },
      include: [{ model: User, as: 'validator', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      order: [['step', 'ASC']],
    });
    if (workflows.length === 0) {
      return res.status(404).json({ success: false, message: 'Aucun workflow trouvé pour ce document.' });
    }
    res.json({ success: true, data: workflows });
  } catch (error) {
    console.error('❌ Erreur récupération workflow:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// Récupérer tous les validateurs disponibles
export const getValidators = async (req, res) => {
  try {
    const validators = await User.findAll({
      where: { role: ['validator', 'admin', 'director'] },
      attributes: ['id', 'firstName', 'lastName', 'email', 'position'],
      order: [['firstName', 'ASC']],
    });
    res.json({ success: true, data: validators });
  } catch (error) {
    console.error('❌ Erreur récupération validateurs:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// Validation en masse
export const bulkValidateTask = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { taskIds, action, comment, applySignature } = req.body;
    const userId = req.user.id;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      await t.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'taskIds (array) est requis.' 
      });
    }

    if (taskIds.length > 20) {
      await t.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Vous ne pouvez valider que 20 documents maximum à la fois.' 
      });
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      await t.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'action doit être "approve" ou "reject".' 
      });
    }

    const tasks = await Workflow.findAll({
      where: { 
        id: taskIds,
        validatorId: userId 
      },
      include: [{ 
        model: Document, 
        as: 'document',
        include: [{ 
          model: Workflow, 
          as: 'workflows',
          include: [{ 
            model: User, 
            as: 'validator', 
            attributes: ['id', 'firstName', 'lastName'] 
          }]
        }]
      }],
      transaction: t
    });

    if (tasks.length === 0) {
      await t.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'Aucune tâche trouvée ou non autorisé.' 
      });
    }

    const results = [];
    const errors = [];

    for (const task of tasks) {
      try {
        if (!['pending', 'queued'].includes(task.status)) {
          errors.push({
            taskId: task.id,
            documentTitle: task.document.title,
            error: 'Tâche déjà traitée'
          });
          continue;
        }

        const document = task.document;
        const validator = await User.findByPk(userId, { transaction: t });

        if (action === 'approve' && applySignature && validator.signaturePath && 
            document.fileType === 'application/pdf') {
          try {
            const pdfPath = path.resolve(process.cwd(), document.filePath);
            const pdfDoc = await PDFDocument.load(await fs.readFile(pdfPath));
            pdfDoc.registerFontkit(fontkit);
            
            const pages = pdfDoc.getPages();
            const lastPage = pages[pages.length - 1];
            const { width } = lastPage.getSize();
            
            const totalSteps = await Workflow.count({ 
              where: { documentId: document.id }, 
              transaction: t 
            });
            
            const documentsNeeding4Signatures = ['Ordre de mission'];
            const numberOfSignatures = documentsNeeding4Signatures.includes(document.category) ? 4 : 3;
            const isInSignatureRange = task.step > (totalSteps - numberOfSignatures);
            
            if (isInSignatureRange) {
              const signatureImagePath = path.resolve(process.cwd(), validator.signaturePath);
              const signatureImageBytes = await fs.readFile(signatureImagePath);
              const signatureImage = await embedImage(pdfDoc, signatureImageBytes);
              
              const signatureBlockWidth = 150;
              const margin = 40;
              const positionInSignatureGroup = task.step - (totalSteps - numberOfSignatures);
              let x;
              
              if (numberOfSignatures === 4) {
                const totalWidth = width - (2 * margin);
                const spacing = totalWidth / 4;
                if (positionInSignatureGroup === 1) x = margin;
                else if (positionInSignatureGroup === 2) x = margin + spacing;
                else if (positionInSignatureGroup === 3) x = margin + (spacing * 2);
                else x = margin + (spacing * 3);
              } else {
                if (positionInSignatureGroup === 1) x = margin;
                else if (positionInSignatureGroup === 2) x = (width / 2) - (signatureBlockWidth / 2);
                else x = width - signatureBlockWidth - margin;
              }
              
              const signatureDims = signatureImage.scaleToFit(130, 65);
              const signatureX = x + (signatureBlockWidth / 2) - (signatureDims.width / 2);
              const signatureY = 88;
              
              lastPage.drawImage(signatureImage, { 
                x: signatureX, 
                y: signatureY, 
                width: signatureDims.width, 
                height: signatureDims.height 
              });

              const newFileName = `${path.basename(document.fileName, path.extname(document.fileName)).replace(/_v\d+$/, '')}_v${Date.now()}${path.extname(document.fileName)}`;
              const newFilePath = path.resolve(process.cwd(), `uploads/${newFileName}`);
              await fs.writeFile(newFilePath, await pdfDoc.save({ useObjectStreams: false }));
              
              await document.update({
                filePath: `uploads/${newFileName}`,
                fileName: newFileName,
                metadata: { ...document.metadata, has_signature: true },
              }, { transaction: t });
            }
          } catch (pdfError) {
            console.error('Erreur signature PDF:', pdfError);
          }
        }

        const status = action === 'approve' ? 'approved' : 'rejected';
        const bulkComment = comment ? `[VALIDATION EN MASSE] ${comment}` : '[VALIDATION EN MASSE]';
        
        await task.update({ 
          status, 
          comment: bulkComment, 
          validatedAt: new Date() 
        }, { transaction: t });

        if (status === 'approved') {
          const nextTask = await Workflow.findOne({
            where: { documentId: document.id, status: 'queued' },
            order: [['step', 'ASC']],
            transaction: t
          });
          
          if (nextTask) {
            await nextTask.update({
              status: 'pending',
              assignedAt: new Date(),
              deadlineAt: computeDeadline(),
            }, { transaction: t });
            await document.update({ status: 'in_progress' }, { transaction: t });
            
            const nextValidator = await User.findByPk(nextTask.validatorId, { transaction: t });
            if (nextValidator?.email) {
              const nextIsComptable = await userHasPoste(nextValidator.id, 'comptable');
              const emailSubject = nextIsComptable
                ? '💰 Ordre de mission validé - Créer Pièce de caisse'
                : 'Nouvelle tâche de validation';

              const emailBody = nextIsComptable
                ? `L'Ordre de mission "${document.title}" a été validé. Vous devez créer la Pièce de caisse.`
                : `Le document "${document.title}" nécessite votre validation.`;
              
              // ✅ NOUVEAU : WebSocket + Email
              const isConnected = isUserConnected(nextValidator.id);
              
              if (isConnected) {
                emitNewTaskNotification(nextValidator.id, {
                  taskId: nextTask.id,
                  documentId: document.id,
                  documentTitle: document.title,
                  documentCategory: document.category,
                  submittedBy: 'Validation en masse'
                });
              }
              
              try {
                await sendNotificationEmail(nextValidator.email, emailSubject, emailBody);
              } catch (e) { 
                console.warn("Email error:", e.message); 
              }
            }
          } else {
            // FIN DU WORKFLOW (bulk) - Ajouter QR code
            const vHash = generateVerificationHash(document.id, task.step, task.validatorId);
            const vUrl = buildVerificationUrl(vHash);
            try {
              const curPath = path.resolve(process.cwd(), document.filePath);
              const curBytes = await fs.readFile(curPath);
              const qrDoc = await PDFDocument.load(curBytes);
              const qrBuf = await generateQRCodeBuffer(vUrl);
              const qrImg = await qrDoc.embedPng(qrBuf);
              const lp = qrDoc.getPage(qrDoc.getPageCount() - 1);
              const { width: pw } = lp.getSize();
              lp.drawImage(qrImg, { x: pw - 70, y: 15, width: 55, height: 55 });
              const font = await qrDoc.embedFont(StandardFonts.Helvetica);
              lp.drawText(vHash, { x: pw - 70, y: 8, size: 4.5, font, color: rgb(0.5, 0.5, 0.5) });
              const qrFn = `${path.basename(document.fileName, path.extname(document.fileName)).replace(/_v\d+$/, '')}_v${Date.now()}${path.extname(document.fileName)}`;
              await fs.writeFile(path.resolve(process.cwd(), `uploads/${qrFn}`), await qrDoc.save({ useObjectStreams: false }));
              await document.update({
                status: 'approved',
                filePath: `uploads/${qrFn}`, fileName: qrFn,
                metadata: { ...document.metadata, verification_hash: vHash, verification_url: vUrl, verified_at: new Date().toISOString() },
              }, { transaction: t });
            } catch (qrE) {
              console.warn('⚠️ QR bulk error:', qrE.message);
              await document.update({ status: 'approved', metadata: { ...document.metadata, verification_hash: vHash } }, { transaction: t });
            }
            notifySubmitter(document, 'approved', bulkComment);
          }
        } else if (status === 'rejected') {
          await document.update({ status: 'rejected' }, { transaction: t });
          await Workflow.update(
            { status: 'rejected' },
            { where: { documentId: document.id, status: 'queued' }, transaction: t }
          );
          notifySubmitter(document, 'rejected', bulkComment);
        }

        results.push({
          taskId: task.id,
          documentTitle: task.document.title,
          success: true
        });

      } catch (taskError) {
        console.error(`Erreur traitement tâche ${task.id}:`, taskError);
        errors.push({
          taskId: task.id,
          documentTitle: task.document.title,
          error: taskError.message
        });
      }
    }

    await t.commit();

    res.json({ 
      success: true, 
      message: `${results.length} document(s) traité(s) avec succès.`,
      results,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: taskIds.length,
        succeeded: results.length,
        failed: errors.length
      }
    });

  } catch (error) {
    if (t && !t.finished) await t.rollback();
    console.error('❌ Erreur validation en masse:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de la validation en masse.' 
    });
  }
};

// --- À AJOUTER TOUT EN BAS DU FICHIER (HORS DES AUTRES FONCTIONS) ---

function calculateSignatureX(position, config, pageWidth) {
  let x = 0;
  const numSigs = config.numberOfSignatures;
  
  if (numSigs === 4) {
    const pageUsableWidth = pageWidth - (2 * config.margin);
    const totalBlocksWidth = 4 * config.blockWidth;
    const totalSpacingWidth = pageUsableWidth - totalBlocksWidth;
    const space = totalSpacingWidth / 3;
    if (position === 1) x = config.margin;
    else if (position === 2) x = config.margin + config.blockWidth + space;
    else if (position === 3) x = config.margin + (2 * config.blockWidth) + (2 * space);
    else x = config.margin + (3 * config.blockWidth) + (3 * space);
  } else if (numSigs === 3) {
    if (position === 1) x = config.margin;
    else if (position === 2) x = (pageWidth / 2) - (config.blockWidth / 2);
    else x = pageWidth - config.blockWidth - config.margin;
  } else if (numSigs === 2) {
    if (position === 1) x = (pageWidth / 3) - (config.blockWidth / 2);
    else x = (2 * pageWidth / 3) - (config.blockWidth / 2);
  }
  return x;
}

// ─── Réaffectation d'une tâche de validation (admin seulement) ───────────────
export const reassignTask = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Réservé aux administrateurs.' });
    }
    const { taskId } = req.params;
    const { newValidatorId } = req.body;

    if (!newValidatorId) {
      return res.status(400).json({ success: false, message: 'newValidatorId requis.' });
    }

    const task = await Workflow.findByPk(taskId, {
      include: [{ model: Document, as: 'document' }],
    });
    if (!task) return res.status(404).json({ success: false, message: 'Tâche introuvable.' });

    if (!['pending', 'queued'].includes(task.status)) {
      return res.status(400).json({ success: false, message: 'Seules les tâches en attente ou en file peuvent être réaffectées.' });
    }

    const newValidator = await User.findByPk(newValidatorId, {
      attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
    });
    if (!newValidator) return res.status(404).json({ success: false, message: 'Nouveau validateur introuvable.' });

    const oldValidatorId = task.validatorId;
    await task.update({ validatorId: newValidatorId });

    // Notifier le nouveau validateur s'il est sur une tâche pending (active)
    if (task.status === 'pending') {
      notifyValidator(newValidator, task.document);
    }

    // Audit
    const { AuditLog } = await import('../models/index.js');
    AuditLog.log(req, 'REASSIGN', 'workflow', taskId, {
      documentId: task.documentId,
      documentTitle: task.document?.title,
      oldValidatorId,
      newValidatorId,
      newValidatorName: `${newValidator.firstName} ${newValidator.lastName}`,
    });

    const updated = await Workflow.findByPk(taskId, {
      include: [{ model: User, as: 'validator', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] }],
    });
    res.json({ success: true, data: updated, message: `Tâche réaffectée à ${newValidator.firstName} ${newValidator.lastName}.` });
  } catch (error) {
    console.error('❌ Erreur réaffectation:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ============================================
// COMMENTAIRES SUR DOCUMENT REJETÉ
// ============================================

export const getWorkflowComments = async (req, res) => {
  try {
    const { documentId } = req.params;
    const document = await Document.findByPk(documentId);
    if (!document) return res.status(404).json({ success: false, message: 'Document introuvable.' });

    // Vérifier que l'utilisateur est soumetteur ou validateur du document
    const workflows = await Workflow.findAll({ where: { documentId } });
    const validatorIds = workflows.map(w => w.validatorId);
    const isParticipant = document.userId === req.user.id || validatorIds.includes(req.user.id) || req.user.role === 'admin';
    if (!isParticipant) return res.status(403).json({ success: false, message: 'Accès refusé.' });

    const comments = await WorkflowComment.findAll({
      where: { documentId },
      include: [{ model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'role'] }],
      order: [['createdAt', 'ASC']],
    });
    res.json({ success: true, data: comments });
  } catch (error) {
    console.error('❌ Erreur getWorkflowComments:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

export const addWorkflowComment = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ success: false, message: 'Le commentaire ne peut pas être vide.' });

    const document = await Document.findByPk(documentId);
    if (!document) return res.status(404).json({ success: false, message: 'Document introuvable.' });

    // Vérifier participation au workflow
    const workflows = await Workflow.findAll({ where: { documentId } });
    const validatorIds = workflows.map(w => w.validatorId);
    const isParticipant = document.userId === req.user.id || validatorIds.includes(req.user.id) || req.user.role === 'admin';
    if (!isParticipant) return res.status(403).json({ success: false, message: 'Seuls les participants du workflow peuvent commenter.' });

    const comment = await WorkflowComment.create({ documentId, userId: req.user.id, text: text.trim() });
    const full = await WorkflowComment.findByPk(comment.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'role'] }],
    });

    // Notifier les autres participants via socket
    const { getIO } = await import('../utils/socketManager.js');
    try {
      const io = getIO();
      const recipients = [document.userId, ...validatorIds].filter(id => id && id !== req.user.id);
      recipients.forEach(uid => io.to(`user_${uid}`).emit('workflow_comment', { documentId, comment: full }));
    } catch (_) {}

    res.status(201).json({ success: true, data: full });
  } catch (error) {
    console.error('❌ Erreur addWorkflowComment:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ============================================
// RELANCER LA VALIDATION
// ============================================

export const relancerValidation = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { motif } = req.body;

    const document = await Document.findByPk(documentId, {
      include: [{ model: User, as: 'uploadedBy', attributes: ['id', 'firstName', 'lastName', 'email'] }],
    });
    if (!document) return res.status(404).json({ success: false, message: 'Document introuvable.' });
    if (document.status !== 'rejected') return res.status(400).json({ success: false, message: 'Seuls les documents rejetés peuvent être relancés.' });

    // Seul le soumetteur ou un admin peut relancer
    const isOwner = document.userId === req.user.id;
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Seul le soumetteur ou un administrateur peut relancer la validation.' });
    }

    await sequelize.transaction(async (t) => {
      // Remettre l'étape rejetée en pending, les suivantes en queued
      const allSteps = await Workflow.findAll({ where: { documentId }, order: [['step', 'ASC']], transaction: t });
      const rejectedStep = allSteps.find(s => s.status === 'rejected');
      if (!rejectedStep) throw new Error('Aucune étape rejetée trouvée.');

      await rejectedStep.update({
        status: 'pending',
        comment: null,
        validatedAt: null,
        assignedAt: new Date(),
        deadlineAt: computeDeadline(),
      }, { transaction: t });

      // Les étapes après le rejet repassent en queued
      const stepsAfter = allSteps.filter(s => s.step > rejectedStep.step);
      for (const step of stepsAfter) {
        await step.update({ status: 'queued', comment: null, validatedAt: null, assignedAt: null, deadlineAt: null }, { transaction: t });
      }

      await document.update({ status: 'pending_validation' }, { transaction: t });
    });

    // Ajouter un commentaire système pour tracer la relance
    await WorkflowComment.create({
      documentId,
      userId: req.user.id,
      text: `🔄 Validation relancée${motif ? ` — ${motif}` : ''}`,
    });

    // Notifier le validateur concerné
    const rejectedWorkflow = await Workflow.findOne({ where: { documentId, status: 'pending' }, include: [{ model: User, as: 'validator' }] });
    if (rejectedWorkflow?.validator) {
      notifyValidator(rejectedWorkflow.validator, document);
    }

    const { AuditLog } = await import('../models/index.js');
    AuditLog.log(req, 'RELAUNCH', 'workflow', documentId, { documentTitle: document.title, motif });

    const updatedWorkflows = await Workflow.findAll({
      where: { documentId },
      include: [{ model: User, as: 'validator', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] }],
      order: [['step', 'ASC']],
    });
    res.json({ success: true, message: 'Validation relancée avec succès.', data: updatedWorkflows });
  } catch (error) {
    console.error('❌ Erreur relancerValidation:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

export default {
  createWorkflow,
  getMyTasks,
  validateTask,
  getDocumentWorkflow,
  getValidators,
  bulkValidateTask,
  reassignTask,
  getWorkflowComments,
  addWorkflowComment,
  relancerValidation,
};