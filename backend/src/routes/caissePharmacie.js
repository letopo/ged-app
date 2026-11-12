// backend/src/routes/caissePharmacie.js — État de la caisse de vente pharmacie (lecture Sage)
import express from 'express';
import { protect } from '../middleware/auth.js';
import { getCaisse, getCaissePdf, createCaisse } from '../controllers/caissePharmacieController.js';

import {
  getEtat, ouvrirSeance, ajouterMouvement, annulerMouvement, cloturerSeance, listSeances, getSeance, rechercher,
  getSeancePdf, soumettreSeance, supprimerSeance,
} from '../controllers/caissePermanenceController.js';

const router = express.Router();
router.get('/', protect, getCaisse);
router.get('/pdf', protect, getCaissePdf);
router.post('/', protect, createCaisse);
// Caisse de permanence (classeur « CAISSE HSJM » : séances jour 7 h-16 h 30 / nuit 16 h 30-7 h)
router.get('/permanence', protect, getEtat);
router.get('/permanence/seances', protect, listSeances);
router.get('/permanence/recherche', protect, rechercher);
router.get('/permanence/seances/:id', protect, getSeance);
router.post('/permanence/seances', protect, ouvrirSeance);
router.post('/permanence/seances/:id/mouvements', protect, ajouterMouvement);
router.post('/permanence/seances/:id/cloturer', protect, cloturerSeance);
router.post('/permanence/mouvements/:id/annuler', protect, annulerMouvement);
router.get('/permanence/seances/:id/pdf', protect, getSeancePdf);
router.post('/permanence/seances/:id/soumettre', protect, soumettreSeance);
router.delete('/permanence/seances/:id', protect, supprimerSeance);
export default router;
