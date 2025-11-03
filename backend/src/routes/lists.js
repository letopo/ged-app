// backend/src/routes/lists.js

import express from 'express';
import { protect, isAdmin } from '../middleware/auth.js'; // Utilisez le nom correct : isAdmin
import {
  getServices,
  getServicesWithMembers,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getServiceMembers,
  getChefDeService,
  addServiceMember,
  updateServiceMember,
  removeServiceMember,
} from '../controllers/serviceController.js';
import {
  getMotifs,
  createMotif,
  updateMotif,
  deleteMotif,
} from '../controllers/motifController.js';

const router = express.Router();

// ============================================
// Routes Services
// ============================================
router.get('/services', protect, getServices);
router.get('/services/with-members', protect, getServicesWithMembers);
router.get('/services/:serviceId', protect, getServiceById);
// --- AVANT ---
// router.post('/services', protect, adminOnly, createService);
// router.put('/services/:serviceId', protect, adminOnly, updateService);
// router.delete('/services/:serviceId', protect, adminOnly, deleteService);
// --- APRÈS ---
router.post('/services', protect, isAdmin, createService); // Utilisez isAdmin
router.put('/services/:serviceId', protect, isAdmin, updateService); // Utilisez isAdmin
router.delete('/services/:serviceId', protect, isAdmin, deleteService); // Utilisez isAdmin

// Routes Membres de Services
router.get('/services/:serviceId/members', protect, getServiceMembers);
router.get('/services/:serviceId/chef', protect, getChefDeService);
// --- AVANT ---
// router.post('/services/:serviceId/members', protect, adminOnly, addServiceMember);
// router.put('/services/:serviceId/members/:memberId', protect, adminOnly, updateServiceMember);
// router.delete('/services/:serviceId/members/:memberId', protect, adminOnly, removeServiceMember);
// --- APRÈS ---
router.post('/services/:serviceId/members', protect, isAdmin, addServiceMember); // Utilisez isAdmin
router.put('/services/:serviceId/members/:memberId', protect, isAdmin, updateServiceMember); // Utilisez isAdmin
router.delete('/services/:serviceId/members/:memberId', protect, isAdmin, removeServiceMember); // Utilisez isAdmin

// ============================================
// Routes Motifs
// ============================================
router.get('/motifs', protect, getMotifs);
// --- AVANT ---
// router.post('/motifs', protect, adminOnly, createMotif);
// router.put('/motifs/:motifId', protect, adminOnly, updateMotif);
// router.delete('/motifs/:motifId', protect, adminOnly, deleteMotif);
// --- APRÈS ---
router.post('/motifs', protect, isAdmin, createMotif); // Utilisez isAdmin
router.put('/motifs/:motifId', protect, isAdmin, updateMotif); // Utilisez isAdmin
router.delete('/motifs/:motifId', protect, isAdmin, deleteMotif); // Utilisez isAdmin

export default router;