// backend/src/routes/auditLogRoutes.js
import express from 'express';
import { protect } from '../middleware/auth.js';
import { getAuditLogs } from '../controllers/auditLogController.js';

const router = express.Router();

router.get('/', protect, getAuditLogs);

export default router;
