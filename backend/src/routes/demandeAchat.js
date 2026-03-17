// backend/src/routes/demandeAchat.js - VERSION AVEC UPLOAD
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const router = Router();

// Configuration ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import du controller
import {
  createDemandeAchat,
  getAllDemandesAchat,
  getDemandeAchatById,
  updateDemandeAchat,
  updateDemandeAchatStatus,
  deleteDemandeAchat
} from '../controllers/demandeAchatController.js';

import { protect } from '../middleware/auth.js';

// ============================================
// CONFIGURATION MULTER POUR UPLOAD FICHIERS
// ============================================
const uploadsDir = path.join(process.cwd(), 'uploads', 'demandes-achat');

// Créer le dossier s'il n'existe pas
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `DA-${uniqueSuffix}-${name}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé. Seuls PDF, images et Excel sont acceptés.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max par fichier
  }
});

// ============================================
// ROUTES
// ============================================
router.post('/', protect, upload.array('attachments', 10), createDemandeAchat);
router.get('/', protect, getAllDemandesAchat);
router.get('/:id', protect, getDemandeAchatById);
router.put('/:id', protect, upload.array('attachments', 10), updateDemandeAchat);
router.patch('/:id/status', protect, updateDemandeAchatStatus);
router.delete('/:id', protect, deleteDemandeAchat);

export default router;