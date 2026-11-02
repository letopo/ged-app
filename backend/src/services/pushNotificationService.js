// backend/src/services/pushNotificationService.js

import webpush from 'web-push';
import { PushSubscription } from '../models/index.js';

// Configuration VAPID
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  console.log('✅ Web Push configuré avec les clés VAPID');
} else {
  console.warn('⚠️  Clés VAPID manquantes - Web Push désactivé');
}

/**
 * Envoie une notification push à un utilisateur
 */
// Installation de développement (PUSH_DISABLED=true dans docker-compose.yml) :
// la base peut contenir les abonnements des téléphones du personnel, copiés de
// la production — aucune notification ne part.
export const pushDisabled = (env = process.env) => /^(true|1|oui|yes)$/i.test(String(env.PUSH_DISABLED || '').trim());
if (pushDisabled()) console.warn('🔕 PUSH_DISABLED : aucune notification push ne partira (installation de développement).');

export const sendPushNotification = async (userId, payload) => {
  if (pushDisabled()) {
    console.log(`🔕 [PUSH NON ENVOYÉ — PUSH_DISABLED] ${userId} : ${payload?.title || ''}`);
    return { success: false, message: 'Push disabled (development)' };
  }
  try {
    // Récupérer toutes les souscriptions de l'utilisateur
    const subscriptions = await PushSubscription.findAll({
      where: { userId, active: true }
    });

    if (subscriptions.length === 0) {
      console.log(`📭 Aucune souscription push active pour l'utilisateur ${userId}`);
      return { success: false, message: 'No active subscriptions' };
    }

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    // Envoyer à toutes les souscriptions
    for (const sub of subscriptions) {
      try {
        const pushConfig = JSON.parse(sub.subscription);
        
        await webpush.sendNotification(
          pushConfig,
          JSON.stringify(payload)
        );

        console.log(`✅ Push envoyé à l'utilisateur ${userId} (endpoint: ${pushConfig.endpoint.substring(0, 50)}...)`);
        results.success++;

      } catch (error) {
        console.error(`❌ Erreur envoi push:`, error.message);
        results.failed++;
        results.errors.push(error.message);

        // Si l'endpoint n'est plus valide (410 Gone), supprimer la souscription
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`🗑️  Suppression de la souscription invalide`);
          await sub.destroy();
        }
      }
    }

    return results;

  } catch (error) {
    console.error('❌ Erreur service push:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Envoie une notification de nouvelle tâche
 */
export const sendNewTaskPushNotification = async (userId, taskData) => {
  const payload = {
    type: 'new_task',
    title: '🔔 Nouvelle tâche de validation',
    body: `${taskData.documentTitle}\nSoumis par: ${taskData.submittedBy}`,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: `task-${taskData.taskId}`,
    data: {
      taskId: taskData.taskId,
      documentId: taskData.documentId,
      url: '/mes-taches',
      timestamp: Date.now()
    },
    requireInteraction: true
  };

  return await sendPushNotification(userId, payload);
};

/**
 * Enregistre une nouvelle souscription push
 */
export const subscribePush = async (userId, subscription) => {
  try {
    // Vérifier si cette souscription existe déjà
    const existing = await PushSubscription.findOne({
      where: {
        userId,
        endpoint: subscription.endpoint
      }
    });

    if (existing) {
      // Mettre à jour
      await existing.update({
        subscription: JSON.stringify(subscription),
        active: true
      });
      console.log(`🔄 Souscription mise à jour pour l'utilisateur ${userId}`);
      return { success: true, updated: true };
    } else {
      // Créer nouvelle
      await PushSubscription.create({
        userId,
        endpoint: subscription.endpoint,
        subscription: JSON.stringify(subscription),
        active: true
      });
      console.log(`✅ Nouvelle souscription enregistrée pour l'utilisateur ${userId}`);
      return { success: true, created: true };
    }

  } catch (error) {
    console.error('❌ Erreur enregistrement souscription:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Désactive une souscription push
 */
export const unsubscribePush = async (userId, endpoint) => {
  try {
    const subscription = await PushSubscription.findOne({
      where: { userId, endpoint }
    });

    if (subscription) {
      await subscription.update({ active: false });
      console.log(`🔕 Souscription désactivée pour l'utilisateur ${userId}`);
      return { success: true };
    }

    return { success: false, message: 'Subscription not found' };

  } catch (error) {
    console.error('❌ Erreur désactivation souscription:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Récupère la clé publique VAPID
 */
export const getPublicVapidKey = () => {
  return process.env.VAPID_PUBLIC_KEY || null;
};

export default {
  sendPushNotification,
  sendNewTaskPushNotification,
  subscribePush,
  unsubscribePush,
  getPublicVapidKey
};