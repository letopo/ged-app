// backend/src/utils/workflowEngine.js
// Logique de création de circuit de workflow réutilisable hors contexte HTTP
// (ex: job de synchro Sage) — extrait de workflowController.createWorkflow.

import { Workflow, User, NotificationPreference, WorkflowTemplate } from '../models/index.js';
import { getPosteHolders } from './posteResolver.js';
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
  const steps = [...(template.validators || [])].sort((a, b) => (a.order ?? a.step ?? 0) - (b.order ?? b.step ?? 0));
  const resolved = [];
  for (const step of steps) {
    // Type implicite pour les anciens modèles ({ label, userId } sans validatorType)
    const type = step.validatorType || (step.posteCode ? 'poste' : step.userId ? 'user' : step.role ? 'role' : null);
    if (type === 'poste' && step.posteCode) {
      // Titulaire actuel du poste (la personne préférée si elle l'occupe toujours) :
      // le modèle reste valable quand quelqu'un change de poste
      const holders = await getPosteHolders(step.posteCode);
      const preferred = step.userId && holders.find(h => h.id === step.userId);
      const holder = preferred || holders[0];
      if (holder) resolved.push(holder.id);
    } else if (type === 'user' && step.userId) {
      resolved.push(step.userId);
    } else if (type === 'role' && step.role) {
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
  const firstDeadline = await computeDeadline(now, tenantId);
  const workflows = await Promise.all(
    validatorIds.map((validatorId, index) =>
      Workflow.create({
        documentId: document.id,
        validatorId,
        tenantId,
        step: index + 1,
        status: index === 0 ? 'pending' : 'queued',
        assignedAt: index === 0 ? now : null,
        deadlineAt: index === 0 ? firstDeadline : null,
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
  // Toutes les étapes doivent avoir un validateur : sinon les signatures se
  // décaleraient d'un cadre (cadre p ↔ étape p sur les documents générés)
  const template = await WorkflowTemplate.findByPk(workflowTemplateId, { attributes: ['name', 'validators'] });
  const steps = template?.validators || [];
  if (validatorIds.length < steps.length) {
    const missing = [];
    for (const st of steps) {
      if ((st.validatorType === 'poste' || st.posteCode) && st.posteCode && !(await getPosteHolders(st.posteCode)).length) missing.push(st.name || st.posteCode);
    }
    throw new Error(`Modèle « ${template.name} » : ${missing.length ? `poste(s) sans titulaire : ${missing.join(', ')}` : 'une étape n’a pas de validateur'}. Corrigez dans Postes & Fonctions ou Modèles workflow.`);
  }
  return createWorkflowForDocument(document, validatorIds, tenantId);
}

// Étapes du cycle de validation EN COURS d'un document. Une nouvelle soumission
// (après expiration ou rejet) crée de nouvelles étapes 1..n sans effacer les
// anciennes : les numéros se répètent. Le cycle en cours = les étapes créées en
// même temps que la dernière « étape 1 » (à quelques secondes près), triées.
export function currentCycleSteps(steps) {
  if (!steps?.length) return [];
  const firsts = steps.filter(s => s.step === 1);
  if (!firsts.length) return [...steps].sort((a, b) => a.step - b.step);
  const latestStart = Math.max(...firsts.map(s => new Date(s.createdAt).getTime()));
  return steps
    .filter(s => new Date(s.createdAt).getTime() >= latestStart - 5000)
    .sort((a, b) => a.step - b.step);
}
