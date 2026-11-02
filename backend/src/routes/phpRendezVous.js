import express from 'express';
import authMiddlewareObject from '../middleware/auth.js';
const { protect } = authMiddlewareObject;

import {
  getRendezVous,
  getRdvDuJour,
  createRendezVous,
  updateStatusRdv,
  deleteRendezVous,
} from '../controllers/phpRendezVousController.js';
import { requirePhpWrite } from '../utils/phpAccess.js';

const router = express.Router();

router.get('/',       protect, getRendezVous);
router.get('/today',  protect, getRdvDuJour);
router.post('/',      protect, requirePhpWrite, createRendezVous);
router.patch('/:id/status', protect, requirePhpWrite, updateStatusRdv);
router.delete('/:id', protect, requirePhpWrite, deleteRendezVous);

export default router;
