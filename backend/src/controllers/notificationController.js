// backend/src/controllers/notificationController.js
import { Workflow, PushSubscription } from '../models/index.js';
import { Op } from 'sequelize';
import webPush from 'web-push';

// ============================================
// Configuration Web Push
// ============================================
const VAPID_ENABLED = !!(
  process.env.VAPID_PUBLIC_KEY && 
  process.env.VAPID_PRIVATE_KEY
);

if (VAPID_ENABLED) {
  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:aureleyankeu@gmail.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  console.log('✅ Web Push configuré avec VAPID');
} else {
  console.warn('⚠️  Clés VAPID manquantes - Web Push désactivé');
}

// ============================================
// Vérifier nouvelles tâches
// ============================================
/**
 * @desc    Vérifie si de nouvelles tâches sont apparues
 * @route   GET /api/notifications/new-tasks-check?since=...
 * @access  Private
 */
export const checkNewTasks = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { since } = req.query;

    if (!since) {
      return res.status(400).json({ 
        success: false, 
        message: "Le paramètre 'since' est requis." 
      });
    }

    const sinceDate = new Date(parseInt(since));

    const newTasksCount = await Workflow.count({
      where: {
        validatorId: userId,
        status: 'pending',
        createdAt: {
          [Op.gt]: sinceDate
        }
      }
    });

    res.json({
      success: true,
      newTasks: newTasksCount > 0,
      count: newTasksCount
    });

  } catch (error) {
    next(error);
  }
};

// ============================================
// Web Push - Clé publique VAPID
// ============================================
/**
 * @desc    Retourne la clé publique VAPID
 * @route   GET /api/notifications/vapid-public-key
 * @access  Public
 */
export const getVapidPublicKey = async (req, res, next) => {
  try {
    if (!VAPID_ENABLED) {
      return res.status(503).json({
        success: false,
        message: 'Web Push non configuré sur le serveur'
      });
    }

    res.json({
      success: true,
      publicKey: process.env.VAPID_PUBLIC_KEY
    });

  } catch (error) {
    next(error);
  }
};

// ============================================
// Web Push - Souscription
// ============================================
/**
 * @desc    Sauvegarde une souscription push
 * @route   POST /api/notifications/subscribe
 * @access  Private
 */
export const subscribeToPush = async (req, res, next) => {
  try {
    if (!VAPID_ENABLED) {
      return res.status(503).json({
        success: false,
        message: 'Web Push non configuré'
      });
    }

    const userId = req.user.id;
    const subscriptionData = req.body;

    if (!subscriptionData || !subscriptionData.endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Données de souscription invalides'
      });
    }

    // Vérifier si la souscription existe déjà
    const existing = await PushSubscription.findOne({
      where: {
        userId,
        endpoint: subscriptionData.endpoint
      }
    });

    if (existing) {
      // Mettre à jour si elle existe
      await existing.update({
        subscription: JSON.stringify(subscriptionData),
        active: true
      });

      return res.json({
        success: true,
        message: 'Souscription mise à jour'
      });
    }

    // Créer une nouvelle souscription
    await PushSubscription.create({
      userId,
      endpoint: subscriptionData.endpoint,
      subscription: JSON.stringify(subscriptionData),
      active: true
    });

    console.log(`✅ Souscription push créée pour l'utilisateur ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Souscription enregistrée avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur souscription push:', error);
    next(error);
  }
};

// ============================================
// Web Push - Désinscription
// ============================================
/**
 * @desc    Supprime une souscription push
 * @route   POST /api/notifications/unsubscribe
 * @access  Private
 */
export const unsubscribeFromPush = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Endpoint requis'
      });
    }

    const deleted = await PushSubscription.destroy({
      where: {
        userId,
        endpoint
      }
    });

    if (deleted === 0) {
      return res.status(404).json({
        success: false,
        message: 'Souscription non trouvée'
      });
    }

    console.log(`✅ Désinscription push pour l'utilisateur ${userId}`);

    res.json({
      success: true,
      message: 'Désinscription réussie'
    });

  } catch (error) {
    next(error);
  }
};

// ============================================
// Web Push - Test
// ============================================
/**
 * @desc    Envoie une notification push de test
 * @route   POST /api/notifications/test
 * @access  Private
 */
export const sendTestNotification = async (req, res, next) => {
  try {
    if (!VAPID_ENABLED) {
      return res.status(503).json({
        success: false,
        message: 'Web Push non configuré'
      });
    }

    const userId = req.user.id;

    // Récupérer les souscriptions actives de l'utilisateur
    const subscriptions = await PushSubscription.findAll({
      where: { 
        userId,
        active: true 
      }
    });

    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Aucune souscription active trouvée'
      });
    }

    const payload = JSON.stringify({
      title: '🧪 Test de notification',
      body: 'Si vous voyez ceci, les notifications push fonctionnent !',
      icon: '/favicon.ico',
      tag: 'test-notification',
      data: {
        url: '/mes-taches'
      }
    });

    // Envoyer à toutes les souscriptions
    const results = await Promise.allSettled(
      subscriptions.map(sub => {
        const subscriptionObject = JSON.parse(sub.subscription);
        return webPush.sendNotification(subscriptionObject, payload);
      })
    );

    // Compter les succès/échecs
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    // Désactiver les souscriptions expirées (erreur 410)
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'rejected' && results[i].reason?.statusCode === 410) {
        await subscriptions[i].update({ active: false });
        console.log(`🗑️  Souscription expirée désactivée: ${subscriptions[i].endpoint}`);
      }
    }

    console.log(`📤 Notification test envoyée: ${successful} succès, ${failed} échecs`);

    res.json({
      success: true,
      message: `Notification envoyée à ${successful} appareil(s)`,
      stats: {
        total: subscriptions.length,
        successful,
        failed
      }
    });

  } catch (error) {
    console.error('❌ Erreur envoi notification test:', error);
    next(error);
  }
};

// ============================================
// Fonction utilitaire pour envoyer des notifications
// ============================================
/**
 * Envoie une notification push à un utilisateur
 * @param {string} userId - UUID de l'utilisateur
 * @param {object} payload - Contenu de la notification
 */
export const sendPushToUser = async (userId, payload) => {
  if (!VAPID_ENABLED) {
    console.log('⚠️  Web Push désactivé - notification ignorée');
    return;
  }

  try {
    const subscriptions = await PushSubscription.findAll({
      where: { 
        userId,
        active: true 
      }
    });

    if (subscriptions.length === 0) {
      console.log(`ℹ️  Aucune souscription push active pour l'utilisateur ${userId}`);
      return;
    }

    const payloadString = JSON.stringify(payload);

    const results = await Promise.allSettled(
      subscriptions.map(sub => {
        const subscriptionObject = JSON.parse(sub.subscription);
        return webPush.sendNotification(subscriptionObject, payloadString);
      })
    );

    // Désactiver les souscriptions expirées
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'rejected' && results[i].reason?.statusCode === 410) {
        await subscriptions[i].update({ active: false });
        console.log(`🗑️  Souscription expirée désactivée: ${subscriptions[i].endpoint}`);
      }
    }

    const successful = results.filter(r => r.status === 'fulfilled').length;
    console.log(`✅ Notification push envoyée à ${successful}/${subscriptions.length} appareil(s)`);

  } catch (error) {
    console.error('❌ Erreur envoi push:', error);
  }
};