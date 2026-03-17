// backend/src/routes/trello.js

import express from 'express';
import { protect } from '../middleware/auth.js';
import { checkLicense } from '../middleware/licenseCheck.js'; // <--- AJOUTER
import { 
  getBoardByService, 
  createCard, 
  moveCard, 
  updateCard, 
  addComment, 
  addAttachment,
  syncOldDocuments, // ✅ Importez la nouvelle fonction
  deleteAttachment, // ✅ Importer la fonction
  getAssignees // ✅ Importer
} from '../controllers/trelloController.js';
import upload from '../utils/fileUpload.js'; // Assurez-vous que ce fichier existe ou utilisez multer direct

const router = express.Router();

router.use(protect, checkLicense('trello'));; // <--- PROTÉGER TOUTES LES ROUTES TRELLO

// Récupérer le tableau (Board)
// GET /api/trello/board/MG
router.get('/board/:serviceType', protect, getBoardByService);

// Cartes (Tâches)
router.post('/cards', protect, createCard);
router.put('/cards/:cardId/move', protect, moveCard); // Route spécifique Drag & Drop
router.put('/cards/:cardId', protect, updateCard);    // Mise à jour générale

// Commentaires
router.post('/cards/:cardId/comments', protect, addComment);

// Pièces jointes (Upload)
router.post('/cards/:cardId/attachments', protect, upload.single('file'), addAttachment);

// Route de synchronisation (Admin seulement de préférence)
router.post('/sync', protect, syncOldDocuments);

// Supprimer une pièce jointe
router.delete('/cards/:cardId/attachments/:attachmentId', protect, deleteAttachment);

// Récupérer les membres assignables pour un service
router.get('/assignees/:serviceType', protect, getAssignees);

export default router;