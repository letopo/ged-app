// backend/src/controllers/workflowController.js - VERSION AVEC 4 SIGNATURES POUR ORDRE DE MISSION

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
          assignedAt: index === 0 ? new Date() : null, // ✅ Initialiser assignedAt
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
        assignedAt: new Date() // ✅ Réinitialiser assignedAt
      }, { transaction });
      
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

// ✅ MODIFIÉ : Valider une tâche avec logique adaptative pour signatures et cachets
export const validateTask = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { taskId } = req.params;
    const { status, comment, validationType } = req.body;
    const userId = req.user.id;

    const task = await Workflow.findByPk(taskId, { 
      include: [{ model: Document, as: 'document' }], 
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

    // ✅ NOUVEAU : Déterminer le nombre de signatures selon le type de document
    const totalSteps = await Workflow.count({ 
      where: { documentId: document.id }, 
      transaction: t 
    });
    
    // ✅ LOGIQUE ADAPTATIVE : 4 signatures pour Ordre de mission, 3 pour les autres
    const documentsNeeding4Signatures = ['Ordre de mission'];
    const numberOfSignatures = documentsNeeding4Signatures.includes(document.category) ? 4 : 3;
    
    console.log(`📄 Document: ${document.category}`);
    console.log(`✍️ Nombre de signatures requises: ${numberOfSignatures}`);
    console.log(`👥 Total d'étapes: ${totalSteps}`);
    console.log(`📍 Étape actuelle: ${task.step}`);

    // Gestion de la pause
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

    // ✅ MODIFIÉ : Application des signatures et cachets avec logique adaptative
    if (['signature', 'stamp', 'dater'].includes(validationType) && 
        document.fileType === 'application/pdf') {
      
      console.log(`🔧 Application de ${validationType} sur le PDF...`);
      
      const pdfPath = path.resolve(process.cwd(), document.filePath);
      const pdfDoc = await PDFDocument.load(await fs.readFile(pdfPath));
      pdfDoc.registerFontkit(fontkit);
      
      const pages = pdfDoc.getPages();
      const lastPage = pages[pages.length - 1];
      const { width, height } = lastPage.getSize();
      
      // ✅ Vérifier si c'est dans la plage de signature
      const isInSignatureRange = task.step > (totalSteps - numberOfSignatures);

      console.log(`🎯 Dans la plage de signature? ${isInSignatureRange} (étape ${task.step} > ${totalSteps - numberOfSignatures})`);

      // Dateur (RH uniquement)
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

      // ✅ MODIFIÉ : Signature (pour les N derniers validateurs)
      if (validationType === 'signature' && validator.signaturePath && isInSignatureRange) {
        const signatureImagePath = path.resolve(process.cwd(), validator.signaturePath);
        const signatureImageBytes = await fs.readFile(signatureImagePath);
        const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
        
        const signatureBlockWidth = 150; // ✅ Réduit de 170 à 150
        const margin = 40; // ✅ Réduit de 50 à 40
        let x;
        
        // ✅ Position selon le nombre de signatures
        const positionInSignatureGroup = task.step - (totalSteps - numberOfSignatures);
        
        if (numberOfSignatures === 4) {
          // ✅ CORRIGÉ : Pour 4 signatures - répartition uniforme sur toute la largeur
          console.log(`📍 Position dans le groupe de 4 signatures: ${positionInSignatureGroup}/4`);
          
          // Calcul de l'espacement égal entre les 4 signatures
          const totalWidth = width - (2 * margin); // Largeur utilisable
          const spacing = totalWidth / 4; // Diviser en 4 zones égales
          
          if (positionInSignatureGroup === 1) {
            x = margin; // Première signature (tout à gauche)
          } else if (positionInSignatureGroup === 2) {
            x = margin + spacing; // Deuxième signature
          } else if (positionInSignatureGroup === 3) {
            x = margin + (spacing * 2); // Troisième signature
          } else {
            x = margin + (spacing * 3); // Quatrième signature (tout à droite)
          }
        } else {
          // Pour 3 signatures (documents standards)
          console.log(`📍 Position dans le groupe de 3 signatures: ${positionInSignatureGroup}/3`);
          
          if (positionInSignatureGroup === 1) {
            x = margin; // Première signature (gauche)
          } else if (positionInSignatureGroup === 2) {
            x = (width / 2) - (signatureBlockWidth / 2); // Deuxième (centre)
          } else {
            x = width - signatureBlockWidth - margin; // Troisième (droite)
          }
        }
        
        const signatureDims = signatureImage.scaleToFit(130, 65); // ✅ Réduit de 140x70 à 130x65
        const signatureX = x + (signatureBlockWidth / 2) - (signatureDims.width / 2);
        const signatureY = 88;
        
        lastPage.drawImage(signatureImage, { 
          x: signatureX, 
          y: signatureY, 
          width: signatureDims.width, 
          height: signatureDims.height 
        });
        
        console.log(`✅ Signature ${positionInSignatureGroup}/4 appliquée à x=${signatureX.toFixed(2)}`);
      }

      // ✅ MODIFIÉ : Cachet (pour TOUS les validateurs dans la plage de signature qui ont un cachet)
      if (validationType === 'stamp' && isInSignatureRange && validator.stampPath) {
        const stampImagePath = path.resolve(process.cwd(), validator.stampPath);
        const stampImageBytes = await fs.readFile(stampImagePath);
        const stampImage = await pdfDoc.embedPng(stampImageBytes);
        
        const stampDims = stampImage.scaleToFit(80, 80);
        const signatureBlockWidth = 150;
        const margin = 40;
        
        const positionInSignatureGroup = task.step - (totalSteps - numberOfSignatures);
        let stampBaseX;
        
        if (numberOfSignatures === 4) {
          const totalWidth = width - (2 * margin);
          const spacing = totalWidth / 4;
          
          if (positionInSignatureGroup === 1) {
            stampBaseX = margin;
          } else if (positionInSignatureGroup === 2) {
            stampBaseX = margin + spacing;
          } else if (positionInSignatureGroup === 3) {
            stampBaseX = margin + (spacing * 2);
          } else {
            stampBaseX = margin + (spacing * 3);
          }
        } else {
          if (positionInSignatureGroup === 1) {
            stampBaseX = margin;
          } else if (positionInSignatureGroup === 2) {
            stampBaseX = (width / 2) - (signatureBlockWidth / 2);
          } else {
            stampBaseX = width - signatureBlockWidth - margin;
          }
        }
        
        const stampX = stampBaseX + (signatureBlockWidth / 2) - (stampDims.width / 2);
        const stampY = 135; // ✅ MODIFIÉ : Remonté de 110 à 135 pour être bien au-dessus
        
        lastPage.drawImage(stampImage, { 
          x: stampX, 
          y: stampY, 
          width: stampDims.width, 
          height: stampDims.height 
        });
        
        console.log(`✅ Cachet ${positionInSignatureGroup}/4 apposé à x=${stampX.toFixed(2)}, y=${stampY}`);
      }

      // Sauvegarder le PDF modifié
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

    // Mise à jour du statut de la tâche
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
            assignedAt: new Date() // ✅ Initialiser assignedAt pour le prochain
          }, { transaction: t });
          
          await document.update({ status: 'in_progress' }, { transaction: t });
          
          const nextValidator = await User.findByPk(nextTask.validatorId, { transaction: t });
          if (nextValidator?.email) {
            try {
              await sendNotificationEmail(
                nextValidator.email, 
                'Nouvelle tâche de validation', 
                `Le document "${document.title}" nécessite votre validation.`
              );
            } catch(e) { 
              console.warn("Email error:", e.message); 
            }
          }
        } else {
          await document.update({ status: 'approved' }, { transaction: t });
          
          // Réactivation si nécessaire
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
              include: [{ model: User, as: 'validator', attributes: ['id', 'firstName', 'lastName'] }] 
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

// ✅ Validation en masse
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

        // Application de la signature avec logique adaptative
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
            
            // ✅ Logique adaptative
            const documentsNeeding4Signatures = ['Ordre de mission'];
            const numberOfSignatures = documentsNeeding4Signatures.includes(document.category) ? 4 : 3;
            const isInSignatureRange = task.step > (totalSteps - numberOfSignatures);
            
            if (isInSignatureRange) {
              const signatureImagePath = path.resolve(process.cwd(), validator.signaturePath);
              const signatureImageBytes = await fs.readFile(signatureImagePath);
              const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
              
              const signatureBlockWidth = 170;
              const margin = 50;
              const positionInSignatureGroup = task.step - (totalSteps - numberOfSignatures);
              let x;
              
              if (numberOfSignatures === 4) {
                if (positionInSignatureGroup === 1) x = 50;
                else if (positionInSignatureGroup === 2) x = width * 0.25 - (signatureBlockWidth / 2);
                else if (positionInSignatureGroup === 3) x = width * 0.75 - (signatureBlockWidth / 2);
                else x = width - signatureBlockWidth - margin;
              } else {
                if (positionInSignatureGroup === 1) x = 50;
                else if (positionInSignatureGroup === 2) x = (width / 2) - (signatureBlockWidth / 2);
                else x = width - signatureBlockWidth - margin;
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