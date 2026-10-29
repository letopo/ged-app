// backend/src/utils/serverHealth.js
// État du serveur : disque mesuré en direct, dernière sauvegarde nocturne,
// volumes des données (calculés une fois par jour en tâche de fond), tendance
// et alertes e-mail aux superadministrateurs.
//
// Lecture seule : aucune commande système, uniquement statfs, lstat et la
// lecture de status.json et des journaux écrits par scripts/backup-nightly.sh.
import fs from 'fs/promises';
import path from 'path';
import { QueryTypes } from 'sequelize';
import sequelize from '../config/database.js';
import { User } from '../models/index.js';
import { sendNotificationEmail } from './mailer.js';

// Dossiers montés en lecture seule (docker-compose.prod.yml) ; absents en développement.
export const STATUS_FILE = process.env.BACKUP_STATUS_FILE || path.resolve('backup-status/status.json');
export const BACKUPS_DIR = process.env.BACKUPS_DIR || path.resolve('host-backups');
const UPLOADS_DIR = process.env.UPLOAD_DIR || path.resolve('uploads');
// Partition qui contient les données de la GED (le volume uploads est sur /)
const DISK_PATH = process.env.SERVER_DISK_PATH || UPLOADS_DIR;

export const DEFAULT_THRESHOLDS = { warningPercent: 80, criticalPercent: 90, maxBackupAgeHours: 26 };
// Marge avant de redescendre d'un niveau : évite un e-mail à chaque mesure
// quand le disque oscille autour d'un seuil (79 % / 80 % / 79 %…).
const HYSTERESIS_PERCENT = 2;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

// ─── Réglages et état (table server_health_state) ───────────────────────────

async function readState(key) {
  const rows = await sequelize.query('SELECT value FROM server_health_state WHERE key = :key',
    { replacements: { key }, type: QueryTypes.SELECT });
  return rows[0]?.value ?? null;
}

async function writeState(key, value) {
  await sequelize.query(`
    INSERT INTO server_health_state (key, value, updated_at) VALUES (:key, :value::jsonb, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `, { replacements: { key, value: JSON.stringify(value) } });
}

export async function getThresholds() {
  return { ...DEFAULT_THRESHOLDS, ...(await readState('thresholds')) };
}

// Renvoie { thresholds } ou { error } (message affiché tel quel)
export function validateThresholds(input = {}) {
  const t = {
    warningPercent: Number(input.warningPercent),
    criticalPercent: Number(input.criticalPercent),
    maxBackupAgeHours: Number(input.maxBackupAgeHours),
  };
  if (!Object.values(t).every(Number.isInteger)) return { error: 'Les seuils doivent être des nombres entiers.' };
  if (t.warningPercent < 50 || t.criticalPercent > 99 || t.warningPercent >= t.criticalPercent) {
    return { error: 'Le seuil d\'avertissement doit être entre 50 % et le seuil critique, lui-même au plus 99 %.' };
  }
  if (t.maxBackupAgeHours < 12 || t.maxBackupAgeHours > 168) {
    return { error: 'L\'âge maximal d\'une sauvegarde doit être entre 12 et 168 heures.' };
  }
  return { thresholds: t };
}

export async function setThresholds(thresholds) {
  await writeState('thresholds', thresholds);
}

// ─── Mesures ────────────────────────────────────────────────────────────────

// Occupation de la partition, au même arrondi que df (utilisé / (utilisé + disponible)).
export async function measureDisk() {
  const s = await fs.statfs(DISK_PATH);
  const total = s.blocks * s.bsize;
  const used = (s.blocks - s.bfree) * s.bsize;
  const available = s.bavail * s.bsize;
  const percent = used + available > 0 ? Math.ceil((used / (used + available)) * 100) : 0;
  return { total, used, available, percent, measuredAt: new Date().toISOString() };
}

// Taille réellement occupée sur le disque, comme du : blocs alloués, et un
// fichier présent plusieurs fois (liens durs entre points de restauration)
// n'est compté qu'une fois. Les éléments illisibles sont ignorés et comptés.
export async function diskUsage(root) {
  const seen = new Set();
  let bytes = 0, files = 0, skipped = 0;
  const visit = async (p) => {
    let st;
    try { st = await fs.lstat(p); } catch { skipped++; return; }
    const id = `${st.dev}:${st.ino}`;
    if (seen.has(id)) return;
    seen.add(id);
    bytes += st.blocks * 512;
    if (st.isFile()) files++;
    if (!st.isDirectory()) return;
    let names;
    try { names = await fs.readdir(p); } catch { skipped++; return; }
    for (let i = 0; i < names.length; i += 64) {
      await Promise.all(names.slice(i, i + 64).map(n => visit(path.join(p, n))));
    }
  };
  try { await fs.access(root); } catch { return null; }
  await visit(root);
  return { bytes, files, skipped };
}

export async function readBackupStatus() {
  try {
    return { available: true, status: JSON.parse(await fs.readFile(STATUS_FILE, 'utf8')) };
  } catch (err) {
    if (err.code === 'ENOENT') return { available: false, status: null };
    console.error('Lecture état sauvegarde:', err.message);
    return { available: true, status: null, unreadable: true };
  }
}

// Points de restauration = dumps présents dans backups/db (dossier monté),
// sinon ce que le script a noté dans status.json.
export async function listRestorePoints(status) {
  try {
    const names = await fs.readdir(path.join(BACKUPS_DIR, 'db'));
    const days = names.map(n => /^ged_db_(\d{4}-\d{2}-\d{2})\.sql\.gz$/.exec(n)?.[1]).filter(Boolean).sort();
    return { count: days.length, oldest: days[0] || null, newest: days.at(-1) || null };
  } catch {
    if (!status) return null;
    return { count: status.restorePoints ?? null, oldest: status.oldestRestorePoint ?? null, newest: status.ok ? status.date : null };
  }
}

// Fin du journal d'une sauvegarde (date contrôlée : jamais un chemin fourni par l'utilisateur)
export async function readBackupLog(day, maxBytes = 200 * 1024) {
  if (!DAY_RE.test(day || '')) return null;
  const file = path.join(BACKUPS_DIR, `backup-${day}.log`);
  let handle;
  try {
    handle = await fs.open(file, 'r');
    const { size } = await handle.stat();
    const length = Math.min(size, maxBytes);
    const buf = Buffer.alloc(length);
    await handle.read(buf, 0, length, size - length);
    return { day, truncated: size > maxBytes, text: buf.toString('utf8') };
  } catch {
    return null;
  } finally {
    await handle?.close();
  }
}

// ─── Évaluation ─────────────────────────────────────────────────────────────

export function diskLevel(percent, thresholds) {
  if (percent >= thresholds.criticalPercent) return 'critical';
  if (percent >= thresholds.warningPercent) return 'warning';
  return 'ok';
}

// Problèmes à signaler : { level: 'ok'|'warning'|'error', problems }
export function evaluate({ backup, disk, thresholds, now = Date.now() }) {
  const problems = [];
  if (backup.unreadable) problems.push({ code: 'unreadable' });
  const s = backup.status;
  if (s) {
    if (!s.ok) problems.push({ code: 'failed', step: s.step, date: s.date });
    const finishedAt = s.finishedAt ? new Date(s.finishedAt).getTime() : NaN;
    const ageHours = (now - finishedAt) / 3600000;
    if (!(ageHours <= thresholds.maxBackupAgeHours)) {
      problems.push({ code: 'stale', hours: Number.isFinite(ageHours) ? Math.floor(ageHours) : null });
    }
  }
  if (disk) {
    const lvl = diskLevel(disk.percent, thresholds);
    if (lvl !== 'ok') problems.push({ code: 'disk', percent: disk.percent, critical: lvl === 'critical' });
  }
  const level = problems.some(p => p.code !== 'disk' || p.critical) ? 'error' : problems.length ? 'warning' : 'ok';
  return { level, problems };
}

// ─── Historique et tendance (table server_health_samples) ───────────────────

const doualaDay = (d = new Date()) => new Date(d.getTime() + 3600000).toISOString().slice(0, 10);
const doualaHour = (d = new Date()) => new Date(d.getTime() + 3600000).getUTCHours();

export async function getSamples(days = 90) {
  const rows = await sequelize.query(`
    SELECT to_char(day, 'YYYY-MM-DD') AS day, disk_total, disk_used, uploads_bytes, db_bytes, backups_bytes, measured_at
    FROM server_health_samples WHERE day > CURRENT_DATE - :days::int ORDER BY day
  `, { replacements: { days }, type: QueryTypes.SELECT });
  const num = (v) => (v === null ? null : Number(v));
  return rows.map(r => ({
    day: r.day, diskTotal: num(r.disk_total), diskUsed: num(r.disk_used),
    uploadsBytes: num(r.uploads_bytes), dbBytes: num(r.db_bytes), backupsBytes: num(r.backups_bytes),
    measuredAt: r.measured_at,
  }));
}

// Croissance sur (au plus) 30 jours et mois restants avant saturation au même rythme.
export function computeTrend(samples, disk) {
  if (samples.length < 2) return { enoughData: false };
  const last = samples.at(-1);
  const since = new Date(Date.parse(last.day) - 30 * 86400000).toISOString().slice(0, 10);
  const first = samples.find(s => s.day >= since) || samples[0];
  const spanDays = (Date.parse(last.day) - Date.parse(first.day)) / 86400000;
  if (spanDays < 7) return { enoughData: false, spanDays };
  const growth = last.diskUsed - first.diskUsed;
  const perMonth = (growth / spanDays) * 30;
  const available = disk?.available ?? (last.diskTotal - last.diskUsed);
  return {
    enoughData: true,
    spanDays,
    from: first.day,
    to: last.day,
    growthBytes: growth,
    perMonthBytes: Math.round(perMonth),
    monthsUntilFull: perMonth > 0 ? Math.round((available / perMonth) * 10) / 10 : null,
  };
}

let sampling = false;
// Mesure du jour : tailles complètes (lent, ~38 Go de documents), jamais au
// chargement d'une page. Les liens durs des sauvegardes ne sont comptés qu'une fois.
export async function recordDailySample({ day = doualaDay() } = {}) {
  if (sampling) return null;
  sampling = true;
  try {
    const disk = await measureDisk();
    const uploads = await diskUsage(UPLOADS_DIR);
    const backups = await diskUsage(BACKUPS_DIR);
    const [{ size }] = await sequelize.query('SELECT pg_database_size(current_database()) AS size', { type: QueryTypes.SELECT });
    await sequelize.query(`
      INSERT INTO server_health_samples (day, disk_total, disk_used, uploads_bytes, db_bytes, backups_bytes, measured_at)
      VALUES (:day, :total, :used, :uploads, :db, :backups, NOW())
      ON CONFLICT (day) DO UPDATE SET disk_total = EXCLUDED.disk_total, disk_used = EXCLUDED.disk_used,
        uploads_bytes = EXCLUDED.uploads_bytes, db_bytes = EXCLUDED.db_bytes,
        backups_bytes = EXCLUDED.backups_bytes, measured_at = NOW()
    `, { replacements: { day, total: disk.total, used: disk.used, uploads: uploads?.bytes ?? null, db: Number(size), backups: backups?.bytes ?? null } });
    return { day, disk, uploads, backups, dbBytes: Number(size) };
  } finally {
    sampling = false;
  }
}

// ─── Alertes e-mail ─────────────────────────────────────────────────────────

const RANK = { ok: 0, warning: 1, critical: 2 };

// Niveau disque retenu pour les e-mails : monte dès le seuil franchi, ne
// redescend qu'avec une marge de HYSTERESIS_PERCENT points.
export function nextDiskAlertLevel(previous, percent, thresholds) {
  const raw = diskLevel(percent, thresholds);
  if (RANK[raw] >= RANK[previous]) return raw;
  return diskLevel(percent + HYSTERESIS_PERCENT, thresholds) === previous ? previous : raw;
}

const gb = (bytes) => `${(bytes / 1e9).toFixed(1).replace('.', ',')} Go`;

// Messages à envoyer d'après l'état précédent ; renvoie { messages, state }.
export function planAlerts({ previous = {}, disk, backup, evaluation, thresholds }) {
  const messages = [];
  const state = { ...previous };

  if (disk) {
    const before = previous.disk || 'ok';
    const after = nextDiskAlertLevel(before, disk.percent, thresholds);
    const detail = `Disque du serveur GED : ${disk.percent} % utilisé (${gb(disk.used)} sur ${gb(disk.total)}, ${gb(disk.available)} libres).`;
    if (RANK[after] > RANK[before]) {
      const seuil = after === 'critical' ? thresholds.criticalPercent : thresholds.warningPercent;
      messages.push({
        type: after === 'critical' ? 'error' : 'warning',
        subject: `${after === 'critical' ? 'CRITIQUE' : 'Avertissement'} : disque du serveur GED à ${disk.percent} %`,
        text: `${detail}\n\nLe seuil de ${seuil} % est dépassé. Libérez de la place ou agrandissez le disque avant que les sauvegardes et l'ajout de documents n'échouent.`,
      });
    } else if (after === 'ok' && before !== 'ok') {
      messages.push({ type: 'success', subject: `Disque du serveur GED revenu à la normale (${disk.percent} %)`, text: `${detail}\n\nL'occupation est repassée sous le seuil de ${thresholds.warningPercent} %.` });
    }
    state.disk = after;
  }

  if (backup.available) {
    const s = backup.status;
    const problem = evaluation.problems.find(p => ['failed', 'stale', 'unreadable'].includes(p.code));
    // Une alerte par sauvegarde en cause (repérée par sa date de fin et le type de problème)
    const key = problem ? `${problem.code}:${s?.finishedAt || ''}` : null;
    if (key && key !== previous.backup) {
      const text = problem.code === 'failed'
        ? `La sauvegarde du ${s.date} a échoué pendant l'étape « ${s.step} ».\n${s.message || ''}\n\nJournal : ${s.log}`
        : problem.code === 'stale'
          ? `Aucune sauvegarde réussie depuis ${problem.hours ?? '?'} heures (seuil : ${thresholds.maxBackupAgeHours} h) : la sauvegarde automatique ne s'exécute plus.`
          : 'L\'état de la dernière sauvegarde est illisible (fichier status.json).';
      messages.push({ type: 'error', subject: 'Sauvegarde du serveur GED en échec', text });
    } else if (!key && previous.backup) {
      messages.push({ type: 'success', subject: 'Sauvegarde du serveur GED de nouveau réussie', text: `La sauvegarde du ${s.date} s'est terminée correctement (${s.restorePoints ?? '?'} points de restauration).` });
    }
    state.backup = key;
  }
  return { messages, state };
}

let checking = false;
export async function checkServerHealth({ sendEmail = sendNotificationEmail } = {}) {
  if (checking) return null;
  checking = true;
  try {
    const thresholds = await getThresholds();
    const [backup, disk] = await Promise.all([readBackupStatus(), measureDisk().catch(() => null)]);
    const evaluation = evaluate({ backup, disk, thresholds });
    const previous = (await readState('alerts')) || {};
    const { messages, state } = planAlerts({ previous, disk, backup, evaluation, thresholds });
    if (messages.length) {
      const admins = await User.findAll({ where: { role: 'superadmin', isActive: true }, attributes: ['email', 'tenantId'] });
      for (const m of messages) {
        for (const a of admins.filter(u => u.email)) {
          await sendEmail(a.email, m.subject, m.text, m.type, '/etat-serveur', { tenantId: a.tenantId });
        }
      }
    }
    if (JSON.stringify(state) !== JSON.stringify(previous)) await writeState('alerts', state);
    return { evaluation, messages };
  } finally {
    checking = false;
  }
}

// ─── Planificateur sans cron (même pattern que vehicleAlerts.js) ────────────

async function tick() {
  try {
    await checkServerHealth();
    // Mesure complète une fois par jour, après la sauvegarde de minuit
    const day = doualaDay();
    if (doualaHour() >= 3) {
      const [row] = await sequelize.query('SELECT 1 FROM server_health_samples WHERE day = :day', { replacements: { day }, type: QueryTypes.SELECT });
      if (!row) recordDailySample({ day }).catch(err => console.warn('[État serveur] mesure du jour :', err.message));
    }
  } catch (err) {
    console.warn('[État serveur] contrôle :', err.message);
  }
}

export function startServerHealthScheduler() {
  setTimeout(tick, 2 * 60 * 1000);
  setInterval(tick, 15 * 60 * 1000);
  console.log('[État serveur] ⏰ Contrôle du disque et des sauvegardes toutes les 15 minutes');
}
