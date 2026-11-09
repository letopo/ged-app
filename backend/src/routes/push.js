// backend/src/routes/push.js

import express from 'express';
import { protect } from '../middleware/auth.js';
import { 
  subscribePush, 
  unsubscribePush, 
  getPublicVapidKey,
  subscribeFcm,
  unsubscribeFcm,
  sendPushNotification,
} from '../services/pushNotificationService.js';
import { fcmActif } from '../services/fcmService.js';

const router = express.Router();

/**
 * GET /api/push/vapid-public-key
 * Récupère la clé publique VAPID
 */
router.get('/vapid-public-key', (req, res) => {
  const publicKey = getPublicVapidKey();
  
  if (!publicKey) {
    return res.status(503).json({ 
      success: false, 
      message: 'Push notifications not configured' 
    });
  }

  res.json({ 
    success: true, 
    publicKey 
  });
});

/**
 * POST /api/push/subscribe
 * Enregistre une nouvelle souscription push
 */
router.post('/subscribe', protect, async (req, res) => {
  try {
    const { subscription } = req.body;
    const userId = req.user.id;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid subscription object' 
      });
    }

    const result = await subscribePush(userId, subscription);

    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Push subscription registered successfully',
        ...result
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: result.error || 'Failed to register subscription' 
      });
    }

  } catch (error) {
    console.error('❌ Erreur route /subscribe:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

/**
 * POST /api/push/unsubscribe
 * Désactive une souscription push
 */
router.post('/unsubscribe', protect, async (req, res) => {
  try {
    const { endpoint } = req.body;
    const userId = req.user.id;

    if (!endpoint) {
      return res.status(400).json({ 
        success: false, 
        message: 'Endpoint required' 
      });
    }

    const result = await unsubscribePush(userId, endpoint);

    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Push subscription removed successfully' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: result.error || 'Failed to remove subscription' 
      });
    }

  } catch (error) {
    console.error('❌ Erreur route /unsubscribe:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

/**
 * POST /api/push/fcm-subscribe   { token }
 * Application Android : enregistre le jeton Firebase du téléphone
 */
const jetonValide = (t) => typeof t === 'string' && t.length > 20 && t.length < 4096 && !/\s/.test(t);

router.post('/fcm-subscribe', protect, async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!jetonValide(token)) return res.status(400).json({ success: false, message: 'Jeton invalide' });
    const result = await subscribeFcm(req.user.id, token);
    res.json({ ...result, fcm: fcmActif() });
  } catch (error) {
    console.error('❌ Erreur route /fcm-subscribe:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * POST /api/push/fcm-unsubscribe   { token }
 */
router.post('/fcm-unsubscribe', protect, async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!jetonValide(token)) return res.status(400).json({ success: false, message: 'Jeton invalide' });
    res.json(await unsubscribeFcm(req.user.id, token));
  } catch (error) {
    console.error('❌ Erreur route /fcm-unsubscribe:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * POST /api/push/test
 * Envoie une notification d'essai à tous les appareils de l'utilisateur connecté
 */
router.post('/test', protect, async (req, res) => {
  const result = await sendPushNotification(req.user.id, {
    type: 'test',
    title: '🧪 Notification d\'essai',
    body: 'Les notifications de la GED fonctionnent sur cet appareil.',
    tag: 'test-notification',
    data: { url: '/mes-taches' },
  });
  res.json(result);
});

export default router;