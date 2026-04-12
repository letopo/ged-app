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

const router = express.Router();

router.get('/',       protect, getRendezVous);
router.get('/today',  protect, getRdvDuJour);
router.post('/',      protect, createRendezVous);
router.patch('/:id/status', protect, updateStatusRdv);
router.delete('/:id', protect, deleteRendezVous);

export default router;
