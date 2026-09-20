// backend/src/utils/workflowEngine.js
// Logique de création de circuit de workflow réutilisable hors contexte HTTP
// (ex: job de synchro Sage) — extrait de workflowController.createWorkflow.

import { Workflow, User, NotificationPreference, WorkflowTemplate } from '../models/index.js';
import { sendNotificationEmail } from './mailer.js';
import { emitNewTaskNotification, isUserConnected } from './socketManager.js';
import { sendNewTaskPushNotification } from '../services/pushNotificationService.js';
import { computeDeadline } from './workflowAutoExpire.js';

// Notifie un validateur qu'une nouvelle tâche lui est assignée (WebSocket si
// connecté, sinon push + email selon ses préférences).
export const notifyValidator = async (validator, document, isFirstValidator = false) => {
  if (!validator?.email) return;

  try {
    const prefs = await NotificationPreference.findOne({ where: { userId: validator.id } });
    if (prefs?.emailOnNewTask === false) {
      console.log(`🔕 User ${validator.id} a desactive les emails de nouvelles taches`);
    }
  } catch (e) { /* continue */ }

  const subject = 'Nouvelle tache de validation';
  const body = `Vous avez une nouvelle tache de validation pour le document "${document.title}".`;

  try {
    const isConnected = isUserConnected(validator.id);

    if (isConnected) {
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

    const emailPrefs = await NotificationPreference.findOne({ where: { userId: validator.id } }).catch(() => null);
    if (emailPrefs?.emailOnNewTask !== false) {
      await sendNotificationEmail(validator.email, subject, body, 'task');
    }
  } catch (emailError) {
    console.warn('⚠️ Erreur envoi notification:', emailError.message);
  }
};

// Résout la liste ordonnée de validatorId depuis un WorkflowTemplate
// ({userId|role, validatorType, order}), identique à la logique historique
// du branchement `workflowTemplateId` de createWorkflow.
export async function resolveValidatorIdsFromTemplate(workflowTemplateId, tenantId) {
  const template = await WorkflowTemplate.findByPk(workflowTemplateId);
  if (!template) {
    throw new Error('Modèle de workflow introuvable.');
  }
  const steps = (template.validators || []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const resolved = [];
  for (const step of steps) {
    if (step.validatorType === 'user' && step.userId) {
      resolved.push(step.userId);
    } else if (step.validatorType === 'role' && step.role) {
      try {
        const u = await User.findOne({ where: { role: step.role, tenantId }, attributes: ['id'] });
        if (u) resolved.push(u.id);
      } catch { /* rôle invalide ignoré */ }
    }
  }
  return resolved;
}

// Crée les lignes Workflow pour un document déjà existant, à partir d'une
// liste ordonnée de validatorId, notifie le premier validateur, et marque le
// document en attente de validation. Utilisable aussi bien depuis un
// contrôleur HTTP que depuis un job (ex: import automatique Sage).
export async function createWorkflowForDocument(document, validatorIds, tenantId) {
  if (!Array.isArray(validatorIds) || validatorIds.length === 0) {
    throw new Error('Aucun validateur résolu pour ce document.');
  }

  const now = new Date();
  const workflows = await Promise.all(
    validatorIds.map((validatorId, index) =>
      Workflow.create({
        documentId: document.id,
        validatorId,
        tenantId,
        step: index + 1,
        status: index === 0 ? 'pending' : 'queued',
        assignedAt: index === 0 ? now : null,
        deadlineAt: index === 0 ? computeDeadline(now) : null,
      })
    )
  );

  await document.update({ status: 'pending_validation' });

  const firstValidator = await User.findByPk(validatorIds[0]);
  await notifyValidator(firstValidator, document, true);

  return workflows;
}

// Raccourci : résout un WorkflowTemplate par son id ET crée le circuit en un
// appel (c'est ce qu'utilise le job de synchro Sage).
export async function createWorkflowFromTemplate(document, workflowTemplateId, tenantId) {
  const validatorIds = await resolveValidatorIdsFromTemplate(workflowTemplateId, tenantId);
  if (validatorIds.length === 0) {
    throw new Error('Aucun validateur résolu depuis le modèle.');
  }
  return createWorkflowForDocument(document, validatorIds, tenantId);
}
