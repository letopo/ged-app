// backend/src/routes/notifications.js
import express from 'express';
import { protect } from '../middleware/auth.js';
import { 
  checkNewTasks,
  getVapidPublicKey,
  subscribeToPush,
  unsubscribeFromPush,
  sendTestNotification
} from '../controllers/notificationController.js';

const router = express.Router();

// Routes publiques (avant protect)
router.get('/vapid-public-key', getVapidPublicKey);

// Routes protégées
router.use(protect);

router.get('/new-tasks-check', checkNewTasks);
router.post('/subscribe', subscribeToPush);
router.post('/unsubscribe', unsubscribeFromPush);
router.post('/test', sendTestNotification);

export default router;