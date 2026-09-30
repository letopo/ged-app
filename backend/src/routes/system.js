// backend/src/routes/system.js — état du serveur utile aux administrateurs.
import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Fichier écrit chaque nuit par scripts/backup-nightly.sh (dossier monté en
// lecture seule, voir docker-compose.prod.yml). Absent en développement.
const STATUS_FILE = process.env.BACKUP_STATUS_FILE || path.resolve('backup-status/status.json');
const MAX_AGE_HOURS = 26;        // sauvegarde à minuit : 26 h laissent une marge
const DISK_WARNING_PERCENT = 85;
const DISK_CRITICAL_PERCENT = 95;

// GET /api/system/backup-status — dernière sauvegarde nocturne et problèmes éventuels
router.get('/system/backup-status', protect, authorize('admin'), async (req, res) => {
  let status;
  try {
    status = JSON.parse(await fs.readFile(STATUS_FILE, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return res.json({ success: true, available: false });
    console.error('Lecture état sauvegarde:', err.message);
    return res.json({ success: true, available: true, level: 'error', problems: [{ code: 'unreadable' }] });
  }

  const problems = [];
  if (!status.ok) problems.push({ code: 'failed', step: status.step, date: status.date });
  const finishedAt = status.finishedAt ? new Date(status.finishedAt) : null;
  const ageHours = finishedAt ? (Date.now() - finishedAt.getTime()) / 3600000 : Infinity;
  if (ageHours > MAX_AGE_HOURS) problems.push({ code: 'stale', hours: Number.isFinite(ageHours) ? Math.floor(ageHours) : null });
  const disk = status.diskUsedPercent;
  if (typeof disk === 'number' && disk >= DISK_WARNING_PERCENT) {
    problems.push({ code: 'disk', percent: disk, critical: disk >= DISK_CRITICAL_PERCENT });
  }

  const level = problems.some(p => p.code !== 'disk' || p.critical) ? 'error' : problems.length ? 'warning' : 'ok';
  res.json({ success: true, available: true, level, problems, status });
});

export default router;
