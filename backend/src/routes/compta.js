// backend/src/routes/compta.js — Module Comptabilité (pièces de caisse)
// Accès : admin (role) OU titulaire du poste « comptable »
import express from 'express';
import authMiddlewareObject from '../middleware/auth.js';
import upload, { fixUploadEncoding } from '../middleware/upload.js';
import { getUserPosteCodes } from '../utils/posteResolver.js';
import {
  extractFromUpload, reextract, create, list, getOne, update, remove, exportCsv,
} from '../controllers/comptaController.js';

const { protect } = authMiddlewareObject;
const router = express.Router();

// Middleware : admin ou comptable (via poste)
const canManage = async (req, res, next) => {
  if (['admin','superadmin'].includes(req.user.role)) return next();
  const postes = await getUserPosteCodes(req.user.id);
  if (postes.includes('comptable')) return next();
  return res.status(403).json({ message: 'Accès réservé à la comptable et aux administrateurs.' });
};

router.get('/',           protect, canManage, list);
router.get('/export.csv', protect, canManage, exportCsv);
router.get('/:id',        protect, canManage, getOne);

router.post('/extract',               protect, canManage, upload.single('file'), fixUploadEncoding, extractFromUpload);
router.post('/:documentId/reextract', protect, canManage, reextract);
router.post('/',                      protect, canManage, create);
router.put('/:id',                    protect, canManage, update);
router.delete('/:id',                 protect, canManage, remove);

export default router;
