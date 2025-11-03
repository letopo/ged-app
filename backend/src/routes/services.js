// backend/src/routes/services.js

import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import {
  getServicesWithMembers,
  createService,
  updateService,
  deleteService,
  getServiceMembers,
  addServiceMember,
  removeServiceMember,
  getChefDeService,
} from '../controllers/serviceController.js';

const router = express.Router();

// Routes services (lecture accessible à tous les utilisateurs connectés)
router.get('/', protect, getServicesWithMembers);
router.get('/:serviceId/members', protect, getServiceMembers);
router.get('/:serviceId/chef', protect, getChefDeService);

// Routes admin uniquement
router.post('/', protect, adminOnly, createService);
router.put('/:serviceId', protect, adminOnly, updateService);
router.delete('/:serviceId', protect, adminOnly, deleteService);
router.post('/:serviceId/members', protect, adminOnly, addServiceMember);
router.delete('/:serviceId/members/:memberId', protect, adminOnly, removeServiceMember);

export default router;