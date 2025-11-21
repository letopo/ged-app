// backend/src/controllers/workflowController.js - VERSION COMPLÈTE AVEC SOCKET.IO

import { Workflow, Document, User } from '../models/index.js';
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
      include: [{ model: User, as: 'uploadedBy', attributes: ['id', 'firstName', 'lastName'] }]
    });
    
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document introuvable.' });
    }

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

// Fonction helper pour réactiver une demande de travaux
async function reactivateLinkedWorkRequest(originDocument, transaction) {
  try {
    const linkedWorkRequestId = originDocument.metadata?.linkedWorkRequestId;
    if (!linkedWorkRequestId) {
        console.log(`⚠️ Pas de DT liée trouvée pour le document ${originDocument.id}`);
        return;
    }

    const workRequest = await Document.findByPk(linkedWorkRequestId, { transaction });
    if (!workRequest) {
        console.log(`⚠️ DT liée introuvable (ID: ${linkedWorkRequestId})`);
        return;
    }

    const pausedWorkflow = await Workflow.findOne({ 
      where: { documentId: workRequest.id, status: 'en_pause' }, 
      transaction 
    });
    
    if (pausedWorkflow) {
      const reason = originDocument.category === 'Demande de besoin' 
        ? 'Demande de Besoin validée' 
        : 'Fiche de Suivi validée';
      
      await pausedWorkflow.update({ 
        status: 'pending', 
        comment: `${reason}. Reprise du processus.`,
        assignedAt: new Date()
      }, { transaction });
      
      await workRequest.update({ status: 'in_progress' }, { transaction });
      
      const nextValidator = await User.findByPk(pausedWorkflow.validatorId, { transaction });
      if (nextValidator?.email) {
        // ✅ NOUVEAU : WebSocket + Email
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
            `La ${reason} a été validée. Vous pouvez maintenant continuer la validation de "${workRequest.title}".`
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

// Valider une tâche
export const validateTask = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { taskId } = req.params;
    const { status, comment, validationType } = req.body;
    const userId = req.user.id;

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

    // ✅ Validation combinée
    if (validationType === 'approve_sign_stamp') {
      const ROLES_FOR_COMBINED_ACTION = ['admin', 'director', 'validator'];
      const isAuthorizedForCombinedAction = validator.role && ROLES_FOR_COMBINED_ACTION.includes(validator.role);

      if (!isAuthorizedForCombinedAction) {
        await t.rollback();
        return res.status(403).json({ 
          success: false, 
          message: 'Cette action est réservée aux Administrateurs, Directeurs et Validateurs.' 
        });
      }

      console.log(`🎯 Validation combinée (Approuver + Signer + Cacheter) par un utilisateur autorisé.`);

      if (document.fileType !== 'application/pdf') {
        await t.rollback();
        return res.status(400).json({ 
          success: false, 
          message: 'Cette action n\'est disponible que pour les documents PDF.' 
        });
      }

      if (!validator.signaturePath || !validator.stampPath) {
        await t.rollback();
        return res.status(400).json({ 
          success: false, 
          message: 'Vous devez avoir une signature et un cachet enregistrés pour utiliser cette action.' 
        });
      }

      const pdfPath = path.resolve(process.cwd(), document.filePath);
      const pdfDoc = await PDFDocument.load(await fs.readFile(pdfPath));
      pdfDoc.registerFontkit(fontkit);
      
      const pages = pdfDoc.getPages();
      const lastPage = pages[pages.length - 1];
      const { width, height } = lastPage.getSize();

      const allWorkflows = await Workflow.findAll({
        where: { documentId: document.id },
        include: [{ model: User, as: 'validator', attributes: ['email'] }],
        order: [['step', 'ASC']],
        transaction: t
      });
      
      const totalSteps = allWorkflows.length;
      const lastWorkflow = allWorkflows[allWorkflows.length - 1];
      const isLastWorkflowComptable = lastWorkflow.validator.email === COMPTABLE_EMAIL;
      const totalStepsWithoutComptable = isLastWorkflowComptable ? totalSteps - 1 : totalSteps;
      
      const signatureConfig = getSignatureConfig(document.category);
      const isInSignatureRange = task.step > (totalStepsWithoutComptable - signatureConfig.numberOfSignatures);

      if (!isInSignatureRange) {
        await t.rollback();
        return res.status(400).json({ 
          success: false, 
          message: 'Votre étape ne fait pas partie des étapes de signature pour ce document.' 
        });
      }

      console.log(`📝 Configuration DG pour "${document.category}":`, signatureConfig);

      // 1️⃣ APPLIQUER LA SIGNATURE
      const signatureImagePath = path.resolve(process.cwd(), validator.signaturePath);
      const signatureImageBytes = await fs.readFile(signatureImagePath);
      const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
      
      const positionInSignatureGroup = task.step - (totalStepsWithoutComptable - signatureConfig.numberOfSignatures);
      let x;
      
      if (signatureConfig.numberOfSignatures === 4) {
        const pageUsableWidth = width - (2 * signatureConfig.margin);
        const totalBlocksWidth = 4 * signatureConfig.blockWidth;
        const totalSpacingWidth = pageUsableWidth - totalBlocksWidth;
        const spaceBetweenSignatures = totalSpacingWidth / 3;
        
        if (positionInSignatureGroup === 1) {
          x = signatureConfig.margin;
        } else if (positionInSignatureGroup === 2) {
          x = signatureConfig.margin + signatureConfig.blockWidth + spaceBetweenSignatures;
        } else if (positionInSignatureGroup === 3) {
          x = signatureConfig.margin + (2 * signatureConfig.blockWidth) + (2 * spaceBetweenSignatures);
        } else {
          x = signatureConfig.margin + (3 * signatureConfig.blockWidth) + (3 * spaceBetweenSignatures);
        }
      } else if (signatureConfig.numberOfSignatures === 3) {
        if (positionInSignatureGroup === 1) {
          x = signatureConfig.margin;
        } else if (positionInSignatureGroup === 2) {
          x = (width / 2) - (signatureConfig.blockWidth / 2);
        } else {
          x = width - signatureConfig.blockWidth - signatureConfig.margin;
        }
      } else if (signatureConfig.numberOfSignatures === 2) {
        if (positionInSignatureGroup === 1) {
          x = (width / 3) - (signatureConfig.blockWidth / 2);
        } else {
          x = (2 * width / 3) - (signatureConfig.blockWidth / 2);
        }
      }
      
      const signatureDims = signatureImage.scaleToFit(signatureConfig.signatureWidth, signatureConfig.signatureHeight);
      const signatureX = x + (signatureConfig.blockWidth / 2) - (signatureDims.width / 2);
      const signatureY = signatureConfig.signatureY;
      
      lastPage.drawImage(signatureImage, { 
        x: signatureX, 
        y: signatureY, 
        width: signatureDims.width, 
        height: signatureDims.height 
      });
      
      console.log(`✅ Signature DG appliquée à x=${signatureX.toFixed(2)}, y=${signatureY}`);

      // 2️⃣ APPLIQUER LE CACHET
      const stampImagePath = path.resolve(process.cwd(), validator.stampPath);
      const stampImageBytes = await fs.readFile(stampImagePath);
      const stampImage = await pdfDoc.embedPng(stampImageBytes);
      
      const stampDims = stampImage.scaleToFit(signatureConfig.stampWidth, signatureConfig.stampHeight);
      const stampX = x + (signatureConfig.blockWidth / 2) - (stampDims.width / 2);
      const stampY = signatureConfig.stampY;
      
      lastPage.drawImage(stampImage, { 
        x: stampX, 
        y: stampY, 
        width: stampDims.width, 
        height: stampDims.height 
      });
      
      console.log(`✅ Cachet DG apposé à x=${stampX.toFixed(2)}, y=${stampY}`);

      const newFileName = `${path.basename(document.fileName, path.extname(document.fileName)).replace(/_v\d+$/, '')}_v${Date.now()}${path.extname(document.fileName)}`;
      const newFilePath = path.resolve(process.cwd(), `uploads/${newFileName}`);
      await fs.writeFile(newFilePath, await pdfDoc.save());
      
      await document.update({
        filePath: `uploads/${newFileName}`,
        fileName: newFileName,
        metadata: { 
          ...document.metadata, 
          has_signature: true,
          has_stamp: true
        },
      }, { transaction: t });

      await task.update({ 
        status: 'approved', 
        comment: comment || 'Approuvé, signé et cacheté par le DG', 
        validatedAt: new Date() 
      }, { transaction: t });

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
          const emailSubject = nextValidator.email === COMPTABLE_EMAIL && document.category === 'Ordre de mission'
            ? '💰 Ordre de mission validé - Créer Pièce de caisse'
            : 'Nouvelle tâche de validation';
          
          const emailBody = nextValidator.email === COMPTABLE_EMAIL && document.category === 'Ordre de mission'
            ? `L'Ordre de mission "${document.title}" a été validé par le DG. Vous devez maintenant créer la Pièce de caisse correspondante.`
            : `Le document "${document.title}" nécessite votre validation.`;
          
          // ✅ NOUVEAU : WebSocket + Email
          const isConnected = isUserConnected(nextValidator.id);
          
          if (isConnected) {
            console.log(`🔌 Prochain validateur ${nextValidator.id} connecté - WebSocket`);
            emitNewTaskNotification(nextValidator.id, {
              taskId: nextTask.id,
              documentId: document.id,
              documentTitle: document.title,
              documentCategory: document.category,
              submittedBy: validator.firstName 
                ? `${validator.firstName} ${validator.lastName}` 
                : 'Inconnu'
            });
          }
          
          try {
            await sendNotificationEmail(nextValidator.email, emailSubject, emailBody);
          } catch(e) { 
            console.warn("Email error:", e.message); 
          }
        }
      } else {
        await document.update({ status: 'approved' }, { transaction: t });
        
        if (document.category === 'Demande de besoin' || 
            document.category === "Fiche de suivi d'équipements") {
          await reactivateLinkedWorkRequest(document, t);
        }
      }

      await t.commit();

      const updatedTask = await Workflow.findByPk(taskId, {
        include: [
          {
            model: Document,
            as: 'document',
            include: [
              { model: User, as: 'uploadedBy', attributes: ['id', 'firstName', 'lastName'] },
              { 
                model: Workflow, 
                as: 'workflows', 
                include: [{ model: User, as: 'validator', attributes: ['id', 'firstName', 'lastName', 'email'] }] 
              }
            ]
          }
        ]
      });

      return res.json({ 
        success: true, 
        data: updatedTask, 
        message: 'Document approuvé, signé et cacheté avec succès par le DG' 
      });
    }
    
    // Récupérer TOUS les workflows pour ce document
    const allWorkflows = await Workflow.findAll({
      where: { documentId: document.id },
      include: [{ model: User, as: 'validator', attributes: ['email'] }],
      order: [['step', 'ASC']],
      transaction: t
    });
    
    const totalSteps = allWorkflows.length;
    const lastWorkflow = allWorkflows[allWorkflows.length - 1];
    const isLastWorkflowComptable = lastWorkflow.validator.email === COMPTABLE_EMAIL;
    const totalStepsWithoutComptable = isLastWorkflowComptable ? totalSteps - 1 : totalSteps;
    
    console.log(`📄 Document: ${document.category}`);
    console.log(`👥 Total d'étapes: ${totalSteps}`);
    console.log(`💼 Le comptable est la dernière étape: ${isLastWorkflowComptable}`);
    console.log(`📊 Étapes SANS comptable: ${totalStepsWithoutComptable}`);
    console.log(`📍 Étape actuelle: ${task.step}`);
    
    const signatureConfig = getSignatureConfig(document.category);
    const numberOfSignatures = signatureConfig.numberOfSignatures;
    
    console.log(`✏️ Nombre de signatures requises: ${numberOfSignatures}`);
    console.log(`📝 Configuration pour "${document.category}":`, signatureConfig);

    if (validationType === 'pause') {
      await task.update({ 
        status: 'en_pause', 
        comment, 
        validatedAt: new Date() 
      }, { transaction: t });
      
      await document.update({ status: 'en_attente_dependance' }, { transaction: t });
      await t.commit();
      
      const updatedTask = await Workflow.findByPk(taskId, { 
        include: [{ model: Document, as: 'document' }] 
      });
      
      return res.json({ 
        success: true, 
        data: updatedTask, 
        message: 'Tâche mise en pause.' 
      });
    }

    const isComptableTask = validator.email === COMPTABLE_EMAIL;
    const isOrderMission = document.category === 'Ordre de mission';
    
    if (isComptableTask && isOrderMission) {
      console.log(`💰 Tâche du comptable sur Ordre de mission - Pas de signature/cachet autorisé`);
      
      if (['signature', 'stamp', 'dater'].includes(validationType)) {
        await t.rollback();
        return res.status(400).json({ 
          success: false, 
          message: 'Le comptable ne peut pas apposer de signature ou cachet sur un Ordre de mission. Veuillez créer la Pièce de caisse.' 
        });
      }
    }

    if (['signature', 'stamp', 'dater'].includes(validationType) && 
        document.fileType === 'application/pdf' &&
        !(isComptableTask && isOrderMission)) {
      
      console.log(`🔧 Application de ${validationType} sur le PDF...`);
      
      const pdfPath = path.resolve(process.cwd(), document.filePath);
      const pdfDoc = await PDFDocument.load(await fs.readFile(pdfPath));
      pdfDoc.registerFontkit(fontkit);
      
      const pages = pdfDoc.getPages();
      const lastPage = pages[pages.length - 1];
      const { width, height } = lastPage.getSize();
      
      const isInSignatureRange = task.step > (totalStepsWithoutComptable - numberOfSignatures);

      console.log(`🎯 Dans la plage de signature? ${isInSignatureRange}`);
      console.log(`   Calcul: étape ${task.step} > ${totalStepsWithoutComptable} - ${numberOfSignatures} = ${totalStepsWithoutComptable - numberOfSignatures}`);

      if (validationType === 'dater' && validator.email === 'hsjm.rh@gmail.com') {
        const specialEliteFontPath = path.resolve(process.cwd(), 'fonts/SpecialElite-Regular.ttf');
        try {
          const specialEliteFontBytes = await fs.readFile(specialEliteFontPath);
          const customFont = await pdfDoc.embedFont(specialEliteFontBytes);
          const dateText = `Reçu le : ${new Date().toLocaleDateString('fr-FR')}`;
          lastPage.drawText(dateText, { 
            x: 420, 
            y: height - 100, 
            size: 13, 
            font: customFont, 
            color: rgb(0.8, 0, 0) 
          });
        } catch (fontError) {
          const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
          const dateText = `Reçu le : ${new Date().toLocaleDateString('fr-FR')}`;
          lastPage.drawText(dateText, { 
            x: 420, 
            y: height - 100, 
            size: 13, 
            font, 
            color: rgb(0.8, 0, 0) 
          });
        }
      }

      if (validationType === 'signature' && validator.signaturePath && isInSignatureRange) {
        const signatureImagePath = path.resolve(process.cwd(), validator.signaturePath);
        const signatureImageBytes = await fs.readFile(signatureImagePath);
        const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
        
        let x;
        const positionInSignatureGroup = task.step - (totalStepsWithoutComptable - numberOfSignatures);
        
        console.log(`📝 Position dans le groupe de ${numberOfSignatures} signatures: ${positionInSignatureGroup}/${numberOfSignatures}`);
        
        if (numberOfSignatures === 4) {
          const pageUsableWidth = width - (2 * signatureConfig.margin);
          const totalBlocksWidth = 4 * signatureConfig.blockWidth;
          const totalSpacingWidth = pageUsableWidth - totalBlocksWidth;
          const spaceBetweenSignatures = totalSpacingWidth / 3;
          
          if (positionInSignatureGroup === 1) {
            x = signatureConfig.margin;
          } else if (positionInSignatureGroup === 2) {
            x = signatureConfig.margin + signatureConfig.blockWidth + spaceBetweenSignatures;
          } else if (positionInSignatureGroup === 3) {
            x = signatureConfig.margin + (2 * signatureConfig.blockWidth) + (2 * spaceBetweenSignatures);
          } else {
            x = signatureConfig.margin + (3 * signatureConfig.blockWidth) + (3 * spaceBetweenSignatures);
          }
        } else if (numberOfSignatures === 3) {
          const pageUsableWidth = width - (2 * signatureConfig.margin);
          const totalBlocksWidth = 3 * signatureConfig.blockWidth;
          const totalSpacingWidth = pageUsableWidth - totalBlocksWidth;
          const spaceBetweenSignatures = totalSpacingWidth / 2;
          
          if (positionInSignatureGroup === 1) {
            x = signatureConfig.margin;
          } else if (positionInSignatureGroup === 2) {
            x = signatureConfig.margin + signatureConfig.blockWidth + spaceBetweenSignatures;
          } else {
            x = signatureConfig.margin + (2 * signatureConfig.blockWidth) + (2 * spaceBetweenSignatures);
          }
        } else if (numberOfSignatures === 2) {
          if (positionInSignatureGroup === 1) {
            x = (width / 3) - (signatureConfig.blockWidth / 2);
          } else {
            x = (2 * width / 3) - (signatureConfig.blockWidth / 2);
          }
        }
        
        const signatureDims = signatureImage.scaleToFit(signatureConfig.signatureWidth, signatureConfig.signatureHeight);
        const signatureX = x + (signatureConfig.blockWidth / 2) - (signatureDims.width / 2);
        const signatureY = signatureConfig.signatureY;
        
        lastPage.drawImage(signatureImage, { 
          x: signatureX, 
          y: signatureY, 
          width: signatureDims.width, 
          height: signatureDims.height 
        });
        
        console.log(`✅ Signature ${positionInSignatureGroup}/${numberOfSignatures} appliquée à x=${signatureX.toFixed(2)}, y=${signatureY}`);
      }

      if (validationType === 'stamp' && isInSignatureRange && validator.stampPath) {
        const stampImagePath = path.resolve(process.cwd(), validator.stampPath);
        const stampImageBytes = await fs.readFile(stampImagePath);
        const stampImage = await pdfDoc.embedPng(stampImageBytes);
        
        const stampDims = stampImage.scaleToFit(signatureConfig.stampWidth, signatureConfig.stampHeight);
        const positionInSignatureGroup = task.step - (totalStepsWithoutComptable - numberOfSignatures);
        let stampBaseX;
        
        if (numberOfSignatures === 4) {
          const pageUsableWidth = width - (2 * signatureConfig.margin);
          const totalBlocksWidth = 4 * signatureConfig.blockWidth;
          const totalSpacingWidth = pageUsableWidth - totalBlocksWidth;
          const spaceBetweenSignatures = totalSpacingWidth / 3;
          
          if (positionInSignatureGroup === 1) {
            stampBaseX = signatureConfig.margin;
          } else if (positionInSignatureGroup === 2) {
            stampBaseX = signatureConfig.margin + signatureConfig.blockWidth + spaceBetweenSignatures;
          } else if (positionInSignatureGroup === 3) {
            stampBaseX = signatureConfig.margin + (2 * signatureConfig.blockWidth) + (2 * spaceBetweenSignatures);
          } else {
            stampBaseX = signatureConfig.margin + (3 * signatureConfig.blockWidth) + (3 * spaceBetweenSignatures);
          }
        } else if (numberOfSignatures === 3) {
          const pageUsableWidth = width - (2 * signatureConfig.margin);
          const totalBlocksWidth = 3 * signatureConfig.blockWidth;
          const totalSpacingWidth = pageUsableWidth - totalBlocksWidth;
          const spaceBetweenSignatures = totalSpacingWidth / 2;
          
          if (positionInSignatureGroup === 1) {
            stampBaseX = signatureConfig.margin;
          } else if (positionInSignatureGroup === 2) {
            stampBaseX = signatureConfig.margin + signatureConfig.blockWidth + spaceBetweenSignatures;
          } else {
            stampBaseX = signatureConfig.margin + (2 * signatureConfig.blockWidth) + (2 * spaceBetweenSignatures);
          }
        } else if (numberOfSignatures === 2) {
          if (positionInSignatureGroup === 1) {
            stampBaseX = (width / 3) - (signatureConfig.blockWidth / 2);
          } else {
            stampBaseX = (2 * width / 3) - (signatureConfig.blockWidth / 2);
          }
        }
        
        const stampX = stampBaseX + (signatureConfig.blockWidth / 2) - (stampDims.width / 2);
        const stampY = signatureConfig.stampY;
        
        lastPage.drawImage(stampImage, { 
          x: stampX, 
          y: stampY, 
          width: stampDims.width, 
          height: stampDims.height 
        });
        
        console.log(`✅ Cachet ${positionInSignatureGroup}/${numberOfSignatures} apposé à x=${stampX.toFixed(2)}, y=${stampY}`);
      }

      const newFileName = `${path.basename(document.fileName, path.extname(document.fileName)).replace(/_v\d+$/, '')}_v${Date.now()}${path.extname(document.fileName)}`;
      const newFilePath = path.resolve(process.cwd(), `uploads/${newFileName}`);
      await fs.writeFile(newFilePath, await pdfDoc.save());
      
      await document.update({
        filePath: `uploads/${newFileName}`,
        fileName: newFileName,
        metadata: { 
          ...document.metadata, 
          [`has_${validationType}`]: true 
        },
      }, { transaction: t });
    }

    if (status) {
      await task.update({ 
        status, 
        comment, 
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
            const emailSubject = nextValidator.email === COMPTABLE_EMAIL && document.category === 'Ordre de mission'
              ? '💰 Ordre de mission validé - Créer Pièce de caisse'
              : 'Nouvelle tâche de validation';
            
            const emailBody = nextValidator.email === COMPTABLE_EMAIL && document.category === 'Ordre de mission'
              ? `L'Ordre de mission "${document.title}" a été validé par tous les responsables. Vous devez maintenant créer la Pièce de caisse correspondante.`
              : `Le document "${document.title}" nécessite votre validation.`;
            
            // ✅ NOUVEAU : WebSocket + Email
            const isConnected = isUserConnected(nextValidator.id);
            
            if (isConnected) {
              console.log(`🔌 Prochain validateur ${nextValidator.id} connecté - WebSocket`);
              emitNewTaskNotification(nextValidator.id, {
                taskId: nextTask.id,
                documentId: document.id,
                documentTitle: document.title,
                documentCategory: document.category,
                submittedBy: validator.firstName 
                  ? `${validator.firstName} ${validator.lastName}` 
                  : 'Inconnu'
              });
            }
            
            try {
              await sendNotificationEmail(nextValidator.email, emailSubject, emailBody);
            } catch(e) { 
              console.warn("Email error:", e.message); 
            }
          }
        } else {
          await document.update({ status: 'approved' }, { transaction: t });
          
          if (document.category === 'Demande de besoin' || 
              document.category === "Fiche de suivi d'équipements") {
            await reactivateLinkedWorkRequest(document, t);
          }
        }
      } else if (status === 'rejected') {
        await document.update({ status: 'rejected' }, { transaction: t });
        await Workflow.update(
          { status: 'rejected' }, 
          { where: { documentId: document.id, status: 'queued' }, transaction: t }
        );
      }
    }

    await t.commit();

    const updatedTask = await Workflow.findByPk(taskId, {
      include: [
        {
          model: Document,
          as: 'document',
          include: [
            { model: User, as: 'uploadedBy', attributes: ['id', 'firstName', 'lastName'] },
            { 
              model: Workflow, 
              as: 'workflows', 
              include: [{ model: User, as: 'validator', attributes: ['id', 'firstName', 'lastName', 'email'] }] 
            }
          ]
        }
      ]
    });

    res.json({ 
      success: true, 
      data: updatedTask, 
      message: `Action '${validationType || status}' effectuée.` 
    });

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

export default {
  createWorkflow,
  getMyTasks,
  validateTask,
  getDocumentWorkflow,
  getValidators,
  bulkValidateTask
};