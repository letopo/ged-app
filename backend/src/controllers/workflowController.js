// backend/src/controllers/workflowController.js - VERSION COMPLÈTE AVEC SOCKET.IO

import { Workflow, Document, User, InvoiceFolder } from '../models/index.js'; // ✅ AJOUT DE InvoiceFolder
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
import { sendNewTaskPushNotification } from '../services/pushNotificationService.js';
import { mergePDFs } from '../utils/pdfMerger.js';
import { PDFExtract } from 'pdf.js-extract';


// ✅ NOUVEAU : Email du comptable
const COMPTABLE_EMAIL = 'raoulwouapi2017@yahoo.com';

// ✅ NOUVEAU : Email du DG qui peut signer + cacheter en une seule fois
const DG_EMAIL = 'hopitalcameroun@ordredemaltefrance.org';

// ============================================
// FONCTION HELPER : Notifier un validateur
// ============================================
const notifyValidator = async (validator, document, isFirstValidator = false) => {
  if (!validator?.email) return;

  const subject = isFirstValidator 
    ? 'Nouvelle tâche de validation' 
    : 'Nouvelle tâche de validation';
  
  const body = `Vous avez une nouvelle tâche de validation pour le document "${document.title}".`;

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
    
    // Email en backup
    await sendNotificationEmail(validator.email, subject, body);
    
  } catch (emailError) {
    console.warn('⚠️ Erreur envoi notification:', emailError.message);
  }
};

// Créer un workflow avec ajout automatique du comptable pour Ordre de mission
export const createWorkflow = async (req, res) => {
  try {
    const { documentId, validatorIds } = req.body;
    if (!documentId || !validatorIds || !Array.isArray(validatorIds) || validatorIds.length === 0) {
      return res.status(400).json({ success: false, message: 'documentId et validatorIds (array) sont requis.' });
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

    // ✅ NOUVEAU : Si c'est un Ordre de mission, ajouter automatiquement le comptable
    let finalValidatorIds = [...validatorIds];
    let comptableAdded = false;
    
    if (document.category === 'Ordre de mission') {
      // Trouver le comptable par email
      const comptable = await User.findOne({ 
        where: { email: COMPTABLE_EMAIL }
      });
      
      if (comptable) {
        // Vérifier que le comptable n'est pas déjà dans la liste
        if (!finalValidatorIds.includes(comptable.id)) {
          finalValidatorIds.push(comptable.id);
          comptableAdded = true;
          console.log(`✅ Comptable ${COMPTABLE_EMAIL} ajouté automatiquement à l'Ordre de Mission`);
        }
      } else {
        console.warn(`⚠️ Comptable introuvable - email: ${COMPTABLE_EMAIL}`);
      }
    }
    
    const workflows = await Promise.all(
      finalValidatorIds.map((validatorId, index) =>
        Workflow.create({
          documentId,
          validatorId,
          step: index + 1,
          status: index === 0 ? 'pending' : 'queued',
          assignedAt: index === 0 ? new Date() : null,
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

// Récupérer les tâches d'un utilisateur
export const getMyTasks = async (req, res) => {
  try {
    const { status } = req.query;
    const userId = req.user.id;
    const whereClause = { validatorId: userId };
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    const tasks = await Workflow.findAll({
      where: whereClause,
      include: [
        {
          model: Document,
          as: 'document',
          include: [
            { model: User, as: 'uploadedBy', attributes: ['id', 'firstName', 'lastName'] },
            {
              model: Workflow,
              as: 'workflows',
              include: [{ model: User, as: 'validator', attributes: ['id', 'firstName', 'lastName'] }],
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, tasks });
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
        assignedAt: new Date()
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
              await fs.writeFile(pdfPath, await pdfDoc.save());
          } catch (error) {
              console.error('⚠️ Erreur écriture remplaçant:', error.message);
          }
      }

      // ----------------------------------------------------------------
      // GESTION DES SIGNATURES
      // ----------------------------------------------------------------
      const allWorkflows = await Workflow.findAll({ where: { documentId: document.id }, include: [{ model: User, as: 'validator', attributes: ['email'] }], order: [['step', 'ASC']], transaction: t });
      const totalSteps = allWorkflows.length;
      const lastWorkflow = allWorkflows[allWorkflows.length - 1];
      const isLastWorkflowComptable = lastWorkflow.validator.email === COMPTABLE_EMAIL;
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

        // 1. DATER (RH)
        if (validationType === 'dater' && validator.email === 'hsjm.rh@gmail.com') {
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
          const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
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
          const stampImage = await pdfDoc.embedPng(stampImageBytes);
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
        await fs.writeFile(newFilePath, await pdfDoc.save());
        
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
            await nextTask.update({ status: 'pending', assignedAt: new Date() }, { transaction: t });
            await document.update({ status: 'in_progress' }, { transaction: t });
            
            const nextValidator = await User.findByPk(nextTask.validatorId, { transaction: t });
            if (nextValidator) notifyValidator(nextValidator, document);
            
            console.log(`✅ Tâche ${task.id} validée. Suivante : ${nextTask.id} (User ${nextTask.validatorId})`);
          } else {
            // FIN DU WORKFLOW
            await document.update({ status: 'approved' }, { transaction: t });
            if (['Demande de besoin', "Fiche de suivi d'équipements"].includes(document.category)) {
              await reactivateLinkedWorkRequest(document, t);
            }
            console.log(`🎉 Workflow terminé pour document ${document.id}`);
          }
        } else if (effectiveStatus === 'rejected') {
          await document.update({ status: 'rejected' }, { transaction: t });
          await Workflow.update({ status: 'rejected' }, { where: { documentId: document.id, status: 'queued' }, transaction: t });
        }
      } else {
          console.warn(`⚠️ Attention: Validation appelée sans statut effectif pour la tâche ${taskId}`);
      }

      await t.commit();
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
              const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
              
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
              await fs.writeFile(newFilePath, await pdfDoc.save());
              
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
              assignedAt: new Date()
            }, { transaction: t });
            await document.update({ status: 'in_progress' }, { transaction: t });
            
            const nextValidator = await User.findByPk(nextTask.validatorId, { transaction: t });
            if (nextValidator?.email) {
              const emailSubject = nextValidator.email === COMPTABLE_EMAIL 
                ? '💰 Ordre de mission validé - Créer Pièce de caisse'
                : 'Nouvelle tâche de validation';
              
              const emailBody = nextValidator.email === COMPTABLE_EMAIL
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
            await document.update({ status: 'approved' }, { transaction: t });
          }
        } else if (status === 'rejected') {
          await document.update({ status: 'rejected' }, { transaction: t });
          await Workflow.update(
            { status: 'rejected' }, 
            { where: { documentId: document.id, status: 'queued' }, transaction: t }
          );
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

export default {
  createWorkflow,
  getMyTasks,
  validateTask,
  getDocumentWorkflow,
  getValidators,
  bulkValidateTask
};