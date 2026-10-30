// backend/src/routes/phpImport.js — import du classeur Excel du Point Focal (utils/phpExcelImport.js)
import express from 'express';
import multer from 'multer';
import { protect, authorize } from '../middleware/auth.js';
import AuditLog from '../models/AuditLog.js';
import { importPhpExcel } from '../utils/phpExcelImport.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /\.(xlsm|xlsx)$/i.test(file.originalname || '')),
});

// POST /api/php/import-excel?apply=1  (fichier : champ « file »)
// Sans apply : simulation, rien n'est écrit ; le rapport dit ce qui changerait.
router.post('/', protect, authorize('admin', 'agent_accueil_php'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'Choisissez le fichier Excel du Point Focal (.xlsm ou .xlsx).' });
  const apply = req.query.apply === '1';
  try {
    const report = await importPhpExcel(req.file.buffer, { apply, userId: req.user.id, tenantId: req.tenantId });
    if (apply) await AuditLog.log(req, 'PHP_IMPORT_EXCEL', 'php', null, { fichier: req.file.originalname, ...report });
    res.json({ success: true, report });
  } catch (err) {
    console.error('Import Excel PHP :', err);
    res.status(400).json({ success: false, message: err.message || 'Import impossible.' });
  }
});

export default router;
