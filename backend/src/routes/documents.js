// backend/src/routes/documents.js - VERSION 100% COMPLÈTE ET NETTOYÉE
import express from 'express';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js'; // <- ON IMPORTE LE MIDDLEWARE CENTRALISÉ
import {
  uploadDocument,
  getDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  downloadDocument,
  searchDocuments
} from '../controllers/documentController.js';

const router = express.Router();

// Appliquer la protection par token JWT à toutes les routes de ce fichier
router.use(protect);

// @route   POST /api/documents/upload
// @desc    Upload un nouveau document
// @access  Private
// On utilise le middleware 'upload'. '.single('file')' doit correspondre au nom du champ dans le FormData du frontend.
router.post('/upload', upload.single('file'), uploadDocument);

// @route   GET /api/documents
// @desc    Récupérer tous les documents
// @access  Private
router.get('/', getDocuments);

// @route   GET /api/documents/search
// @desc    Rechercher des documents
// @access  Private
// Note: la route est plus standard sans '/query'
router.get('/search', searchDocuments);

// Routes pour un document spécifique par son ID
router.route('/:id')
  .get(getDocument)
  .put(updateDocument)
  .delete(deleteDocument);

// @route   GET /api/documents/:id/download
// @desc    Télécharger un document
// @access  Private
router.get('/:id/download', downloadDocument);

export default router;