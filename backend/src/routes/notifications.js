// backend/src/routes/notifications.js
import express from 'express';
import { protect } from '../middleware/auth.js';
import { checkNewTasks } from '../controllers/notificationController.js';

const router = express.Router();

router.use(protect);

router.get('/new-tasks-check', checkNewTasks);

export default router;