// backend/src/controllers/workflowController.js - VERSION FINALE COMPLÈTE

import { Workflow, Document, User } from '../models/index.js';
import { sendNotificationEmail } from '../utils/mailer.js';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs/promises';
import path from 'path';
import { Op } from 'sequelize';
import { sequelize } from '../models/index.js';

// Créer un workflow
export const createWorkflow = async (req, res) => {
  try {
    const { documentId, validatorIds } = req.body;
    if (!documentId || !validatorIds || !Array.isArray(validatorIds) || validatorIds.length === 0) {
      return res.status(400).json({ success: false, message: 'documentId et validatorIds (array) sont requis.' });
    }
    const document = await Document.findByPk(documentId);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document introuvable.' });
    }
    const workflows = await Promise.all(
      validatorIds.map((validatorId, index) =>
        Workflow.create({
          documentId,
          validatorId,
          step: index + 1,
          status: index === 0 ? 'pending' : 'queued',
        })
      )
    );
    await document.update({ status: 'pending_validation' });
    const firstValidator = await User.findByPk(validatorIds[0]);
    if (firstValidator?.email) {
      try {
        await sendNotificationEmail(
          firstValidator.email,
          'Nouvelle tâche de validation',
          `Vous avez une nouvelle tâche de validation pour le document "${document.title}".`
        );
      } catch (emailError) {
        console.warn('⚠️ Erreur envoi email:', emailError.message);
      }
    }
    const workflowsWithValidators = await Workflow.findAll({
      where: { documentId },
      include: [{ model: User, as: 'validator', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      order: [['step', 'ASC']],
    });
    res.status(201).json({ success: true, data: workflowsWithValidators, message: 'Workflow créé avec succès.' });
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

    const pausedWorkflow = await Workflow.findOne({ where: { documentId: workRequest.id, status: 'en_pause' }, transaction });
    if (pausedWorkflow) {
      const reason = originDocument.category === 'Demande de besoin' ? 'Demande de Besoin validée' : 'Fiche de Suivi validée';
      
      await pausedWorkflow.update({ status: 'pending', comment: `${reason}. Reprise du processus.` }, { transaction });
      await workRequest.update({ status: 'in_progress' }, { transaction });
      
      const nextValidator = await User.findByPk(pausedWorkflow.validatorId, { transaction });
      if (nextValidator?.email) {
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

// Valider une tâche (VERSION CORRIGÉE GÉRANT LA RÉACTIVATION VIA FS)
export const validateTask = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { taskId } = req.params;
    const { status, comment, validationType } = req.body;
    const userId = req.user.id;

    const task = await Workflow.findByPk(taskId, { include: [{ model: Document, as: 'document' }], transaction: t });
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

    if (validationType === 'pause') {
        await task.update({ status: 'en_pause', comment, validatedAt: new Date() }, { transaction: t });
        await document.update({ status: 'en_attente_dependance' }, { transaction: t });
        await t.commit();
        const updatedTask = await Workflow.findByPk(taskId, { include: [{ model: Document, as: 'document' }] });
        return res.json({ success: true, data: updatedTask, message: 'Tâche mise en pause.' });
    }

    if (['signature', 'stamp', 'dater'].includes(validationType) && document.fileType === 'application/pdf') {
        console.log(`📝 Application de ${validationType} sur le PDF...`);
        const pdfPath = path.resolve(process.cwd(), document.filePath);
        const pdfDoc = await PDFDocument.load(await fs.readFile(pdfPath));
        pdfDoc.registerFontkit(fontkit);
        const pages = pdfDoc.getPages();
        const lastPage = pages[pages.length - 1];
        const { width, height } = lastPage.getSize();
        const totalSteps = await Workflow.count({ where: { documentId: document.id }, transaction: t });
        const isLastStep = task.step === totalSteps;

        if (validationType === 'dater' && validator.email === 'hsjm.rh@gmail.com') {
            const specialEliteFontPath = path.resolve(process.cwd(), 'fonts/SpecialElite-Regular.ttf');
            try {
                const specialEliteFontBytes = await fs.readFile(specialEliteFontPath);
                const customFont = await pdfDoc.embedFont(specialEliteFontBytes);
                const dateText = `Reçu le : ${new Date().toLocaleDateString('fr-FR')}`;
                lastPage.drawText(dateText, { x: 420, y: height - 100, size: 13, font: customFont, color: rgb(0.8, 0, 0) });
            } catch (fontError) {
                const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
                const dateText = `Reçu le : ${new Date().toLocaleDateString('fr-FR')}`;
                lastPage.drawText(dateText, { x: 420, y: height - 100, size: 13, font, color: rgb(0.8, 0, 0) });
            }
        }

        if (validationType === 'signature' && validator.signaturePath) {
            const signatureImagePath = path.resolve(process.cwd(), validator.signaturePath);
            const signatureImageBytes = await fs.readFile(signatureImagePath);
            const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
            const signatureBlockWidth = 170;
            const margin = 50;
            let x;
            if (totalSteps >= 3) {
                if (task.step === 1) x = 50;
                else if (task.step === 2) x = (width / 2) - (signatureBlockWidth / 2);
                else x = width - signatureBlockWidth - margin;
            } else if (totalSteps === 2) {
                x = (task.step === 1) ? 50 : width - signatureBlockWidth - margin;
            } else {
                x = width - signatureBlockWidth - margin;
            }
            const signatureDims = signatureImage.scaleToFit(140, 70);
            const signatureX = x + (signatureBlockWidth / 2) - (signatureDims.width / 2);
            const signatureY = 88;
            lastPage.drawImage(signatureImage, { x: signatureX, y: signatureY, width: signatureDims.width, height: signatureDims.height });
        }

        if (validationType === 'stamp' && isLastStep && validator.stampPath) {
            const stampImagePath = path.resolve(process.cwd(), validator.stampPath);
            const stampImageBytes = await fs.readFile(stampImagePath);
            const stampImage = await pdfDoc.embedPng(stampImageBytes);
            const stampDims = stampImage.scaleToFit(90, 90);
            const signatureBlockWidth = 170;
            const margin = 50;
            let lastSignatureX;
            if (totalSteps === 1) lastSignatureX = width - signatureBlockWidth - margin;
            else if (totalSteps === 2) lastSignatureX = width - signatureBlockWidth - margin;
            else lastSignatureX = width - signatureBlockWidth - margin;
            const stampX = lastSignatureX + (signatureBlockWidth / 2) - (stampDims.width / 2);
            const stampY = 120;
            lastPage.drawImage(stampImage, { x: stampX, y: stampY, width: stampDims.width, height: stampDims.height });
        }

        const newFileName = `${path.basename(document.fileName, path.extname(document.fileName)).replace(/_v\d+$/, '')}_v${Date.now()}${path.extname(document.fileName)}`;
        const newFilePath = path.resolve(process.cwd(), `uploads/${newFileName}`);
        await fs.writeFile(newFilePath, await pdfDoc.save());
        await document.update({
            filePath: `uploads/${newFileName}`,
            fileName: newFileName,
            metadata: { ...document.metadata, [`has_${validationType}`]: true },
        }, { transaction: t });
    }

    if (status) {
      await task.update({ status, comment, validatedAt: new Date() }, { transaction: t });
      if (status === 'approved') {
        const nextTask = await Workflow.findOne({
          where: { documentId: document.id, status: 'queued' },
          order: [['step', 'ASC']],
          transaction: t
        });
        if (nextTask) {
          await nextTask.update({ status: 'pending' }, { transaction: t });
          await document.update({ status: 'in_progress' }, { transaction: t });
          const nextValidator = await User.findByPk(nextTask.validatorId, { transaction: t });
          if (nextValidator?.email) {
            try {
              await sendNotificationEmail(nextValidator.email, 'Nouvelle tâche de validation', `Le document "${document.title}" nécessite votre validation.`);
            } catch(e){ console.warn("Email error:", e.message) }
          }
        } else {
          await document.update({ status: 'approved' }, { transaction: t });
          if (document.category === 'Demande de besoin' || document.category === "Fiche de suivi d'équipements") {
            await reactivateLinkedWorkRequest(document, t);
          }
        }
      } else if (status === 'rejected') {
        await document.update({ status: 'rejected' }, { transaction: t });
        await Workflow.update({ status: 'rejected' }, { where: { documentId: document.id, status: 'queued' }, transaction: t });
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
              include: [{ model: User, as: 'validator', attributes: ['id', 'firstName', 'lastName'] }] 
            }
          ]
        }
      ]
    });

    res.json({ success: true, data: updatedTask, message: `Action '${validationType || status}' effectuée.` });

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

// ✅ NOUVEAU : Validation en masse
export const bulkValidateTask = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { taskIds, action, comment, applySignature } = req.body;
    const userId = req.user.id;

    // Validation des paramètres
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      await t.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'taskIds (array) est requis.' 
      });
    }

    // Limite de 20 documents
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

    // Récupérer toutes les tâches
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

    // Traiter chaque tâche
    for (const task of tasks) {
      try {
        // Vérifier que la tâche est bien en attente ou queued (bypass)
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

        // Application de la signature si demandé et disponible
        if (action === 'approve' && applySignature && validator.signaturePath && document.fileType === 'application/pdf') {
          try {
            const pdfPath = path.resolve(process.cwd(), document.filePath);
            const pdfDoc = await PDFDocument.load(await fs.readFile(pdfPath));
            pdfDoc.registerFontkit(fontkit);
            
            const pages = pdfDoc.getPages();
            const lastPage = pages[pages.length - 1];
            const { width, height } = lastPage.getSize();
            
            const totalSteps = await Workflow.count({ 
              where: { documentId: document.id }, 
              transaction: t 
            });

            const signatureImagePath = path.resolve(process.cwd(), validator.signaturePath);
            const signatureImageBytes = await fs.readFile(signatureImagePath);
            const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
            
            const signatureBlockWidth = 170;
            const margin = 50;
            let x;
            
            if (totalSteps >= 3) {
              if (task.step === 1) x = 50;
              else if (task.step === 2) x = (width / 2) - (signatureBlockWidth / 2);
              else x = width - signatureBlockWidth - margin;
            } else if (totalSteps === 2) {
              x = (task.step === 1) ? 50 : width - signatureBlockWidth - margin;
            } else {
              x = width - signatureBlockWidth - margin;
            }
            
            const signatureDims = signatureImage.scaleToFit(140, 70);
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
          } catch (pdfError) {
            console.error('Erreur signature PDF:', pdfError);
            // Continue sans signature en cas d'erreur
          }
        }

        // Mise à jour de la tâche
        const status = action === 'approve' ? 'approved' : 'rejected';
        const bulkComment = comment ? `[VALIDATION EN MASSE] ${comment}` : '[VALIDATION EN MASSE]';
        
        await task.update({ 
          status, 
          comment: bulkComment, 
          validatedAt: new Date() 
        }, { transaction: t });

        // Gestion du workflow suivant
        if (status === 'approved') {
          const nextTask = await Workflow.findOne({
            where: { documentId: document.id, status: 'queued' },
            order: [['step', 'ASC']],
            transaction: t
          });
          
          if (nextTask) {
            await nextTask.update({ status: 'pending' }, { transaction: t });
            await document.update({ status: 'in_progress' }, { transaction: t });
            
            const nextValidator = await User.findByPk(nextTask.validatorId, { transaction: t });
            if (nextValidator?.email) {
              try {
                await sendNotificationEmail(
                  nextValidator.email, 
                  'Nouvelle tâche de validation', 
                  `Le document "${document.title}" nécessite votre validation.`
                );
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