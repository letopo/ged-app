// backend/src/utils/workflowAutoExpire.js
// Expiration automatique des tâches de workflow dépassant leur deadline.
// Tourne chaque nuit à 00:05 (même pattern que phpAutoClose.js).
// ─────────────────────────────────────────────────────────────────────────────
// Comportement :
//   1. Trouve tous les Workflow en statut 'pending' dont deadline_at < NOW()
//   2. Les passe en statut 'expired'
//   3. Passe aussi tous les steps 'queued' du même document en 'expired'
//      (inutile de les garder en attente si la chaîne est rompue)
//   4. Repasse le Document en 'draft' → le créateur peut soumettre à nouveau
//   5. Notifie le créateur du document par email

import { Op } from 'sequelize';
import { sequelize, Workflow, Document, User } from '../models/index.js';
import { sendNotificationEmail } from './mailer.js';

// ─── Délai par défaut en jours ────────────────────────────────────────────────
export const WORKFLOW_DEADLINE_DAYS = 7;

// ─── Calcul de la deadline à partir de maintenant ────────────────────────────
export function computeDeadline(fromDate = new Date()) {
  const d = new Date(fromDate);
  d.setDate(d.getDate() + WORKFLOW_DEADLINE_DAYS);
  return d;
}

// ─── Expiration effective ─────────────────────────────────────────────────────
export async function expireOverdueWorkflows() {
  const now = new Date();

  try {
    // 1. Trouver toutes les étapes pending expirées
    const expiredSteps = await Workflow.findAll({
      where: {
        status: 'pending',
        deadlineAt: { [Op.lt]: now },
      },
      include: [
        {
          model: Document,
          as: 'document',
          include: [{ model: User, as: 'uploadedBy', attributes: ['id', 'firstName', 'lastName', 'email'] }],
        },
        { model: User, as: 'validator', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
    });

    if (expiredSteps.length === 0) {
      console.log('[WorkflowExpire] ℹ️  Aucune tâche expirée à traiter.');
      return { expired: 0, documentsReset: 0 };
    }

    // Grouper par document pour traiter par document
    const byDocument = {};
    for (const step of expiredSteps) {
      const docId = step.documentId;
      if (!byDocument[docId]) byDocument[docId] = { doc: step.document, steps: [] };
      byDocument[docId].steps.push(step);
    }

    let totalExpired = 0;
    let documentsReset = 0;

    for (const [docId, { doc, steps }] of Object.entries(byDocument)) {
      await sequelize.transaction(async (t) => {
        // 2. Expirer le step pending
        await Workflow.update(
          { status: 'expired', comment: 'Délai de validation dépassé — expiration automatique' },
          { where: { id: steps.map(s => s.id) }, transaction: t }
        );

        // 3. Expirer tous les steps queued du même document (ils ne serviront plus)
        await Workflow.update(
          { status: 'expired', comment: 'Annulé suite à l\'expiration d\'une étape précédente' },
          { where: { documentId: docId, status: 'queued' }, transaction: t }
        );

        // 4. Repasser le document en 'draft' pour permettre une nouvelle soumission
        await Document.update(
          { status: 'draft' },
          { where: { id: docId }, transaction: t }
        );

        totalExpired += steps.length;
        documentsReset++;

        // 5. Notifier le créateur du document
        const creator = doc?.uploadedBy;
        if (creator?.email) {
          const expiredValidator = steps[0]?.validator;
          const validatorName = expiredValidator
            ? `${expiredValidator.firstName} ${expiredValidator.lastName}`
            : 'un validateur';

          await sendNotificationEmail(
            creator.email,
            `⏰ Validation expirée — "${doc.title}"`,
            `Bonjour ${creator.firstName},\n\n` +
            `La validation de votre document "${doc.title}" a expiré car ${validatorName} n'a pas traité la demande dans le délai de ${WORKFLOW_DEADLINE_DAYS} jours.\n\n` +
            `Votre document a été remis en brouillon. Vous pouvez le soumettre à nouveau en choisissant un nouveau validateur.\n\n` +
            `— Système GED HSJM`
          ).catch(err => console.warn('[WorkflowExpire] ⚠️ Email créateur:', err.message));
        }
      });
    }

    console.log(`[WorkflowExpire] ✅ ${totalExpired} étape(s) expirée(s) sur ${documentsReset} document(s) → remis en brouillon.`);
    return { expired: totalExpired, documentsReset };

  } catch (err) {
    console.error('[WorkflowExpire] ❌ Erreur lors de l\'expiration automatique:', err.message);
    return { expired: 0, documentsReset: 0, error: err.message };
  }
}

// ─── Planificateur sans cron (même pattern que phpAutoClose.js) ───────────────
function msUntilNextRun() {
  const now  = new Date();
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(0, 5, 0, 0); // 00:05 — légèrement après phpAutoClose (00:01)
  return next - now;
}

export function startWorkflowExpireScheduler() {
  const ms = msUntilNextRun();
  const heure = new Date(Date.now() + ms).toLocaleTimeString('fr-FR');

  console.log(`[WorkflowExpire] ⏰ Planifié à 00:05 (dans ${Math.round(ms / 60000)} min, ~${heure})`);

  setTimeout(async () => {
    console.log('[WorkflowExpire] 🔔 Déclenchement expiration automatique...');
    await expireOverdueWorkflows();
    // Replanifier pour le lendemain
    startWorkflowExpireScheduler();
  }, ms);
}
