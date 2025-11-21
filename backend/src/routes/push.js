// backend/src/routes/push.js

import express from 'express';
import { protect } from '../middleware/auth.js';
import { 
  subscribePush, 
  unsubscribePush, 
  getPublicVapidKey 
} from '../services/pushNotificationService.js';

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

export default router;