// backend/src/routes/invoices.js - VERSION CORRIGÉE

import express from 'express';
import { getBoard, createFolder, updateFolder, deleteFolder, moveDocument } from '../controllers/invoiceController.js';
import { protect } from '../middleware/auth.js'; // ✅ Correction ici : on importe "protect"

const router = express.Router();

// Appliquer le middleware d'authentification à toutes les routes
router.use(protect); // ✅ Correction ici : on utilise "protect"

router.get('/board', getBoard);
router.post('/folders', createFolder);
router.put('/folders/:id', updateFolder);
router.delete('/folders/:id', deleteFolder);
router.post('/move-document', moveDocument);

export default router;