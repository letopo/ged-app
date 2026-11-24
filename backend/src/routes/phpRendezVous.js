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
import { rdvDmePhp } from '../utils/phpRdvDme.js';

const router = express.Router();

router.get('/',       protect, getRendezVous);
router.get('/today',  protect, getRdvDuJour);
// Rendez-vous lus dans le DME pour les patients inscrits en consultation PHP
router.get('/dme', protect, async (req, res) => {
  try {
    const ok = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || '');
    const { from, to } = req.query;
    if (!ok(from) || !ok(to) || from > to) return res.status(400).json({ success: false, message: 'Période attendue (from, to : AAAA-MM-JJ).' });
    if ((Date.parse(to) - Date.parse(from)) / 864e5 > 400) return res.status(400).json({ success: false, message: 'Période de 400 jours au plus.' });
    res.json({ success: true, ...(await rdvDmePhp({ tenantId: req.tenantId, from, to })) });
  } catch (err) {
    console.error('rendez-vous DME', err);
    res.status(500).json({ success: false, message: 'Rendez-vous du DME indisponibles.' });
  }
});
router.post('/',      protect, requirePhpWrite, createRendezVous);
router.patch('/:id/status', protect, requirePhpWrite, updateStatusRdv);
router.delete('/:id', protect, requirePhpWrite, deleteRendezVous);

export default router;
