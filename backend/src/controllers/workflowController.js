// backend/src/controllers/workflowController.js
import { Workflow, Document, User } from '../models/index.js';
import { Op } from 'sequelize';

// 📋 Créer un workflow de validation pour un document
export const createWorkflow = async (req, res) => {
  try {
    const { documentId, validatorIds } = req.body;
    const userId = req.user.id;

    console.log('📋 Création workflow pour document:', documentId);

    // Vérifier que le document existe et appartient à l'utilisateur
    const document = await Document.findOne({
      where: { id: documentId, userId }
    });

    if (!document) {
      return res.status(404).json({ 
        error: 'Document non trouvé ou non autorisé' 
      });
    }

    // Vérifier que les validateurs existent
    if (!validatorIds || !Array.isArray(validatorIds) || validatorIds.length === 0) {
      return res.status(400).json({ 
        error: 'Au moins un validateur est requis' 
      });
    }

    const validators = await User.findAll({
      where: { id: { [Op.in]: validatorIds } }
    });

    if (validators.length !== validatorIds.length) {
      return res.status(400).json({ 
        error: 'Un ou plusieurs validateurs n\'existent pas' 
      });
    }

    // Créer les tâches de workflow (une par validateur)
    const workflows = await Promise.all(
      validatorIds.map((validatorId, index) => 
        Workflow.create({
          documentId,
          validatorId,
          step: index + 1,
          status: 'pending'
        })
      )
    );

    // Mettre à jour le statut du document
    await document.update({ 
      status: 'pending_validation',
      metadata: {
        ...document.metadata,
        workflowStartedAt: new Date(),
        totalValidators: validatorIds.length
      }
    });

    console.log('✅ Workflow créé avec succès:', workflows.length, 'tâches');

    res.status(201).json({ 
      message: 'Workflow créé avec succès',
      workflows: workflows.map(w => ({
        id: w.id,
        validatorId: w.validatorId,
        step: w.step,
        status: w.status
      }))
    });

  } catch (error) {
    console.error('❌ Erreur création workflow:', error);
    res.status(500).json({ error: 'Erreur lors de la création du workflow' });
  }
};

// 📥 Récupérer les tâches de validation de l'utilisateur connecté
export const getMyTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const whereClause = { validatorId: userId };
    if (status) {
      whereClause.status = status;
    }

    const tasks = await Workflow.findAll({
      where: whereClause,
      include: [
        {
          model: Document,
          as: 'document',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'username', 'email', 'firstName', 'lastName']
            }
          ]
        },
        {
          model: User,
          as: 'validator',
          attributes: ['id', 'username', 'email', 'firstName', 'lastName']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    console.log('📥 Tâches récupérées:', tasks.length);

    res.json({ 
      tasks: tasks.map(task => ({
        id: task.id,
        status: task.status,
        step: task.step,
        comment: task.comment,
        validatedAt: task.validatedAt,
        createdAt: task.createdAt,
        document: {
          id: task.document.id,
          title: task.document.title,
          filename: task.document.filename,
          type: task.document.type,
          status: task.document.status,
          uploadedBy: task.document.user
        }
      }))
    });

  } catch (error) {
    console.error('❌ Erreur récupération tâches:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des tâches' });
  }
};

// 📄 Récupérer le workflow d'un document spécifique
export const getDocumentWorkflow = async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;

    // Vérifier que le document existe
    const document = await Document.findByPk(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    // Vérifier que l'utilisateur a accès (propriétaire ou validateur)
    const isOwner = document.userId === userId;
    const isValidator = await Workflow.findOne({
      where: { documentId, validatorId: userId }
    });

    if (!isOwner && !isValidator) {
      return res.status(403).json({ 
        error: 'Accès non autorisé à ce workflow' 
      });
    }

    const workflows = await Workflow.findAll({
      where: { documentId },
      include: [
        {
          model: User,
          as: 'validator',
          attributes: ['id', 'username', 'email', 'firstName', 'lastName']
        }
      ],
      order: [['step', 'ASC']]
    });

    console.log('📄 Workflow du document récupéré:', workflows.length, 'étapes');

    res.json({ 
      workflows: workflows.map(w => ({
        id: w.id,
        step: w.step,
        status: w.status,
        comment: w.comment,
        validatedAt: w.validatedAt,
        createdAt: w.createdAt,
        validator: w.validator
      }))
    });

  } catch (error) {
    console.error('❌ Erreur récupération workflow:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du workflow' });
  }
};

// ✅ Approuver une tâche de validation
export const approveTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const userId = req.user.id;

    console.log('✅ Approbation tâche:', id);

    // Trouver la tâche
    const workflow = await Workflow.findOne({
      where: { id, validatorId: userId },
      include: [{ model: Document, as: 'document' }]
    });

    if (!workflow) {
      return res.status(404).json({ 
        error: 'Tâche non trouvée ou non autorisée' 
      });
    }

    if (workflow.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Cette tâche a déjà été traitée' 
      });
    }

    // Mettre à jour la tâche
    await workflow.update({
      status: 'approved',
      comment: comment || null,
      validatedAt: new Date()
    });

    // Vérifier si toutes les tâches sont approuvées
    const allWorkflows = await Workflow.findAll({
      where: { documentId: workflow.documentId }
    });

    const allApproved = allWorkflows.every(w => w.status === 'approved');

    // Mettre à jour le document
    if (allApproved) {
      await workflow.document.update({ 
        status: 'validated',
        metadata: {
          ...workflow.document.metadata,
          workflowCompletedAt: new Date()
        }
      });
      console.log('🎉 Document complètement validé !');
    }

    res.json({ 
      message: 'Tâche approuvée avec succès',
      workflow: {
        id: workflow.id,
        status: workflow.status,
        validatedAt: workflow.validatedAt
      },
      documentStatus: allApproved ? 'validated' : 'pending_validation'
    });

  } catch (error) {
    console.error('❌ Erreur approbation:', error);
    res.status(500).json({ error: 'Erreur lors de l\'approbation' });
  }
};

// ❌ Rejeter une tâche de validation
export const rejectTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const userId = req.user.id;

    console.log('❌ Rejet tâche:', id);

    if (!comment || comment.trim() === '') {
      return res.status(400).json({ 
        error: 'Un commentaire est requis pour le rejet' 
      });
    }

    // Trouver la tâche
    const workflow = await Workflow.findOne({
      where: { id, validatorId: userId },
      include: [{ model: Document, as: 'document' }]
    });

    if (!workflow) {
      return res.status(404).json({ 
        error: 'Tâche non trouvée ou non autorisée' 
      });
    }

    if (workflow.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Cette tâche a déjà été traitée' 
      });
    }

    // Mettre à jour la tâche
    await workflow.update({
      status: 'rejected',
      comment,
      validatedAt: new Date()
    });

    // Mettre à jour le document (un seul rejet suffit)
    await workflow.document.update({ 
      status: 'rejected',
      metadata: {
        ...workflow.document.metadata,
        rejectedAt: new Date(),
        rejectedBy: userId,
        rejectionReason: comment
      }
    });

    console.log('❌ Document rejeté');

    res.json({ 
      message: 'Tâche rejetée',
      workflow: {
        id: workflow.id,
        status: workflow.status,
        comment: workflow.comment,
        validatedAt: workflow.validatedAt
      },
      documentStatus: 'rejected'
    });

  } catch (error) {
    console.error('❌ Erreur rejet:', error);
    res.status(500).json({ error: 'Erreur lors du rejet' });
  }
};

// 📊 Statistiques des workflows
export const getStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const [pending, approved, rejected, total] = await Promise.all([
      Workflow.count({ where: { validatorId: userId, status: 'pending' } }),
      Workflow.count({ where: { validatorId: userId, status: 'approved' } }),
      Workflow.count({ where: { validatorId: userId, status: 'rejected' } }),
      Workflow.count({ where: { validatorId: userId } })
    ]);

    res.json({
      pending,
      approved,
      rejected,
      total
    });

  } catch (error) {
    console.error('❌ Erreur statistiques:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
};