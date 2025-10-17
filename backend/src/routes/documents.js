import express from 'express';
import multer from 'multer';
import path from 'path';
import {
  uploadDocument,
  getDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  searchDocuments
} from '../controllers/documentController.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /pdf|doc|docx|jpg|jpeg|png|xlsx|xls|txt/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  if (extname) cb(null, true);
  else cb(new Error('Type de fichier non autorisé'));
};

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter
});

router.use(authenticateToken);
router.post('/', upload.single('file'), asyncHandler(uploadDocument));
router.get('/', asyncHandler(getDocuments));
router.get('/search', asyncHandler(searchDocuments));
router.get('/:id', asyncHandler(getDocument));
router.put('/:id', asyncHandler(updateDocument));
router.delete('/:id', asyncHandler(deleteDocument));

export default router;
