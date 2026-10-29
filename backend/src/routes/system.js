// backend/src/routes/system.js — état du serveur utile aux administrateurs.
import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import AuditLog from '../models/AuditLog.js';
import {
  readBackupStatus, measureDisk, evaluate, getThresholds, validateThresholds, setThresholds,
  listRestorePoints, readBackupLog, getSamples, computeTrend,
} from '../utils/serverHealth.js';

const router = express.Router();

// Express 4 n'attrape pas les erreurs des fonctions async
const handle = (fn) => (req, res) => fn(req, res).catch((err) => {
  console.error('État du serveur :', err.message);
  res.status(500).json({ success: false, message: 'Impossible de lire l\'état du serveur.' });
});

// Le statut de la sauvegarde vient du fichier écrit chaque nuit par
// scripts/backup-nightly.sh ; l'occupation du disque est mesurée à chaque
// appel (statfs), l'alerte suit donc le disque en cours de journée.
async function currentReport() {
  const [thresholds, backup, disk] = await Promise.all([
    getThresholds(), readBackupStatus(), measureDisk().catch(() => null),
  ]);
  return { thresholds, backup, disk, ...evaluate({ backup, disk, thresholds }) };
}

// GET /api/system/backup-status — dernière sauvegarde nocturne et problèmes éventuels
router.get('/system/backup-status', protect, authorize('admin'), handle(async (req, res) => {
  const { backup, disk, level, problems } = await currentReport();
  res.json({ success: true, available: backup.available, level, problems, status: backup.status, disk });
}));

// GET /api/system/server-health — panneau « État du serveur » (superadministrateur)
router.get('/system/server-health', protect, authorize('superadmin'), handle(async (req, res) => {
  const { thresholds, backup, disk, level, problems } = await currentReport();
  const [restorePoints, samples] = await Promise.all([listRestorePoints(backup.status), getSamples(90)]);
  const s = backup.status;
  const lastBackup = s && {
    date: s.date, ok: s.ok, step: s.step, message: s.message,
    startedAt: s.startedAt, finishedAt: s.finishedAt,
    durationSeconds: s.startedAt && s.finishedAt ? Math.round((Date.parse(s.finishedAt) - Date.parse(s.startedAt)) / 1000) : null,
    dbSize: s.dbSize, uploadsFiles: s.uploadsFiles, log: s.log,
  };
  res.json({
    success: true, level, problems, thresholds, disk,
    backupAvailable: backup.available, lastBackup, restorePoints,
    volumes: samples.at(-1) || null,
    trend: computeTrend(samples, disk),
    history: samples,
  });
}));

// GET /api/system/server-health/journal/:day — fin du journal d'une sauvegarde
router.get('/system/server-health/journal/:day', protect, authorize('superadmin'), handle(async (req, res) => {
  const log = await readBackupLog(req.params.day);
  if (!log) return res.status(404).json({ success: false, message: 'Journal introuvable.' });
  res.json({ success: true, ...log });
}));

// PUT /api/system/server-health/seuils — seuils d'alerte (superadministrateur)
router.put('/system/server-health/seuils', protect, authorize('superadmin'), handle(async (req, res) => {
  const { thresholds, error } = validateThresholds(req.body);
  if (error) return res.status(400).json({ success: false, message: error });
  const before = await getThresholds();
  await setThresholds(thresholds);
  await AuditLog.log(req, 'SERVER_HEALTH_THRESHOLDS', 'server', null, { avant: before, après: thresholds });
  res.json({ success: true, thresholds });
}));

export default router;
