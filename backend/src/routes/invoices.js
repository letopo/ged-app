// backend/src/routes/invoices.js — Factures (dossiers de classement des factures fournisseurs)
import express from 'express';
import { getBoard, createFolder, updateFolder, deleteFolder, moveDocument } from '../controllers/invoiceController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Réservé aux mêmes personnes que l'entrée « Finances › Factures » du menu
// (AppShell, managementOnly) : administrateurs + direction. Avant, seule la
// connexion était vérifiée : tout utilisateur pouvait lire et déplacer les factures.
router.use(protect, authorize('admin', 'director', 'dds', 'medical_chief'));

router.get('/board', getBoard);
router.post('/folders', createFolder);
router.put('/folders/:id', updateFolder);
router.delete('/folders/:id', deleteFolder);
router.post('/move-document', moveDocument);

export default router;
