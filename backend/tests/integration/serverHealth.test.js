// État du serveur :
//  - panneau et seuils réservés au superadministrateur (contrôle côté serveur) ;
//  - l'alerte de l'Accueil (administrateurs) suit le disque mesuré en direct ;
//  - e-mails : un par franchissement de seuil / sauvegarde en échec, puis un
//    de retour à la normale, jamais en boucle ;
//  - tailles comme du : les liens durs entre points de restauration ne sont
//    comptés qu'une fois ; journal lu uniquement d'après une date valide.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import request from 'supertest';

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ged-etat-serveur-'));
process.env.BACKUP_STATUS_FILE = path.join(tmp, 'status.json');
process.env.BACKUPS_DIR = path.join(tmp, 'backups');

const { default: sequelize } = await import('../../src/config/database.js');
const health = await import('../../src/utils/serverHealth.js');
const { createTenant, makeFactory, authHeaders } = await import('../helpers/fixtures.js');
const { default: app } = await import('../../src/server.js');

let f, superadmin, admin, agent;
const as = (user) => authHeaders(f.tenant, user);
const T = health.DEFAULT_THRESHOLDS;

const writeStatus = (s) => fs.writeFile(process.env.BACKUP_STATUS_FILE, JSON.stringify({
  ok: true, date: '2026-10-29', startedAt: new Date(Date.now() - 3600e3).toISOString(),
  finishedAt: new Date().toISOString(), step: 'terminé', message: 'Sauvegarde complète et vérifiée.',
  restorePoints: 3, oldestRestorePoint: '2026-10-27', log: '/home/ged/backups/backup-2026-10-29.log', ...s,
}));

before(async () => {
  f = makeFactory(await createTenant());
  superadmin = await f.user({ role: 'superadmin' });
  admin = await f.user({ role: 'admin' });
  agent = await f.user();
  await sequelize.query("DELETE FROM server_health_state; DELETE FROM server_health_samples");
  await fs.mkdir(path.join(process.env.BACKUPS_DIR, 'db'), { recursive: true });
  for (const d of ['2026-10-27', '2026-10-28', '2026-10-29']) {
    await fs.writeFile(path.join(process.env.BACKUPS_DIR, 'db', `ged_db_${d}.sql.gz`), 'x');
  }
  await fs.writeFile(path.join(process.env.BACKUPS_DIR, 'backup-2026-10-29.log'), '=== Sauvegarde nocturne 2026-10-29 ===\n=== Termine ===\n');
  await writeStatus();
});
after(async () => {
  await sequelize.query("DELETE FROM server_health_state; DELETE FROM server_health_samples");
  await fs.rm(tmp, { recursive: true, force: true });
  await sequelize.close();
});

test('accès : panneau et seuils au superadministrateur seul, alerte aux administrateurs', async () => {
  for (const u of [admin, agent]) {
    assert.equal((await request(app).get('/api/system/server-health').set(as(u))).status, 403);
    assert.equal((await request(app).put('/api/system/server-health/seuils').set(as(u)).send(T)).status, 403);
    assert.equal((await request(app).get('/api/system/server-health/journal/2026-10-29').set(as(u))).status, 403);
  }
  assert.equal((await request(app).get('/api/system/backup-status').set(as(agent))).status, 403);
  assert.equal((await request(app).get('/api/system/backup-status').set(as(admin))).status, 200);

  const r = await request(app).get('/api/system/server-health').set(as(superadmin));
  assert.equal(r.status, 200);
  assert.equal(typeof r.body.disk.percent, 'number');
  assert.deepEqual(r.body.restorePoints, { count: 3, oldest: '2026-10-27', newest: '2026-10-29' });
  assert.equal(r.body.lastBackup.durationSeconds, 3600);
  assert.deepEqual(r.body.thresholds, T);
});

test('alerte de l\'Accueil : disque mesuré en direct, pas la valeur notée à minuit', async () => {
  await writeStatus({ diskUsedPercent: 86 });
  const disk = await health.measureDisk();
  const r = await request(app).get('/api/system/backup-status').set(as(admin));
  assert.equal(r.body.disk.percent, disk.percent);
  const diskProblem = r.body.problems.find(p => p.code === 'disk');
  assert.equal(Boolean(diskProblem), disk.percent >= T.warningPercent);

  // Seuil abaissé sous le taux réel : l'alerte apparaît aussitôt, puis disparaît
  const warn = Math.max(50, Math.min(disk.percent, 97));
  const low = { warningPercent: warn, criticalPercent: warn + 1, maxBackupAgeHours: 26 };
  assert.equal((await request(app).put('/api/system/server-health/seuils').set(as(superadmin)).send(low)).status, 200);
  const r2 = await request(app).get('/api/system/backup-status').set(as(admin));
  if (disk.percent >= 50) assert.ok(r2.body.problems.some(p => p.code === 'disk'));
  await request(app).put('/api/system/server-health/seuils').set(as(superadmin)).send({ ...T, warningPercent: 98, criticalPercent: 99 });
  const r3 = await request(app).get('/api/system/backup-status').set(as(admin));
  if (disk.percent < 98) assert.equal(r3.body.level, 'ok');
  await request(app).put('/api/system/server-health/seuils').set(as(superadmin)).send(T);
});

test('seuils : valeurs incohérentes refusées', async () => {
  for (const bad of [
    { ...T, warningPercent: 90, criticalPercent: 80 },
    { ...T, criticalPercent: 100 },
    { ...T, maxBackupAgeHours: 2 },
    { ...T, warningPercent: 'abc' },
  ]) {
    assert.equal((await request(app).put('/api/system/server-health/seuils').set(as(superadmin)).send(bad)).status, 400);
  }
});

test('évaluation : échec, sauvegarde trop ancienne, seuils du disque', () => {
  const ok = { available: true, status: { ok: true, finishedAt: new Date().toISOString() } };
  assert.equal(health.evaluate({ backup: ok, disk: { percent: 64 }, thresholds: T }).level, 'ok');
  assert.equal(health.evaluate({ backup: ok, disk: { percent: 85 }, thresholds: T }).level, 'warning');
  assert.equal(health.evaluate({ backup: ok, disk: { percent: 90 }, thresholds: T }).level, 'error');
  const old = { available: true, status: { ok: true, finishedAt: new Date(Date.now() - 27 * 3600e3).toISOString() } };
  assert.deepEqual(health.evaluate({ backup: old, disk: null, thresholds: T }).problems.map(p => p.code), ['stale']);
  const failed = { available: true, status: { ok: false, step: 'copie des documents', date: '2026-10-29', finishedAt: new Date().toISOString() } };
  assert.equal(health.evaluate({ backup: failed, disk: null, thresholds: T }).level, 'error');
  assert.equal(health.evaluate({ backup: { available: false, status: null }, disk: null, thresholds: T }).level, 'ok');
});

test('e-mails disque : un par franchissement, un au retour, avec une marge contre les oscillations', () => {
  const backup = { available: false };
  const evaluation = { problems: [] };
  const disk = (percent) => ({ percent, used: 0, total: 0, available: 0 });
  let state = {};
  const step = (percent) => {
    const out = health.planAlerts({ previous: state, disk: disk(percent), backup, evaluation, thresholds: T });
    state = out.state;
    return out.messages.map(m => m.subject);
  };
  assert.deepEqual(step(64), []);
  assert.match(step(81)[0], /Avertissement/);
  assert.deepEqual(step(82), []);
  assert.deepEqual(step(79), [], '79 % : dans la marge, pas de « retour à la normale »');
  assert.deepEqual(step(80), []);
  assert.match(step(91)[0], /CRITIQUE/);
  assert.deepEqual(step(89), []);
  assert.deepEqual(step(85), []);
  assert.match(step(64)[0], /revenu à la normale/);
  assert.deepEqual(step(64), []);
});

test('e-mails sauvegarde : un par échec, puis un au retour, aux superadministrateurs', async () => {
  await sequelize.query("DELETE FROM server_health_state WHERE key = 'alerts'");
  const sent = [];
  const sendEmail = async (to, subject) => { sent.push({ to, subject }); return { success: true }; };
  const backupMails = () => sent.filter(m => /Sauvegarde/.test(m.subject));

  await writeStatus({ ok: false, step: 'copie des documents', message: 'Échec' });
  await health.checkServerHealth({ sendEmail });
  assert.ok(backupMails().some(m => m.to === superadmin.email && /en échec/.test(m.subject)));
  assert.ok(!backupMails().some(m => m.to === admin.email), 'les administrateurs ne reçoivent pas ces e-mails');
  const n = backupMails().length;
  await health.checkServerHealth({ sendEmail });
  assert.equal(backupMails().length, n, 'pas de renvoi pour le même échec');

  await writeStatus();
  await health.checkServerHealth({ sendEmail });
  assert.ok(backupMails().slice(n).some(m => /de nouveau réussie/.test(m.subject)));
  const n2 = backupMails().length;
  await health.checkServerHealth({ sendEmail });
  assert.equal(backupMails().length, n2);
});

test('tailles comme du : liens durs comptés une fois ; tendance et mois avant saturation', async () => {
  const dir = path.join(tmp, 'du');
  await fs.mkdir(path.join(dir, 'a'), { recursive: true });
  await fs.mkdir(path.join(dir, 'b'), { recursive: true });
  await fs.writeFile(path.join(dir, 'a', 'f.bin'), Buffer.alloc(256 * 1024, 1));
  const single = await health.diskUsage(dir);
  await fs.link(path.join(dir, 'a', 'f.bin'), path.join(dir, 'b', 'f.bin'));
  const linked = await health.diskUsage(dir);
  assert.equal(linked.files, 1);
  assert.ok(linked.bytes < single.bytes * 1.5, 'le second lien ne double pas la taille');
  assert.equal(await health.diskUsage(path.join(tmp, 'absent')), null);

  const G = 1e9;
  const samples = Array.from({ length: 31 }, (_, i) => ({
    day: new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10), diskTotal: 200 * G, diskUsed: 100 * G + i * G,
  }));
  const trend = health.computeTrend(samples, { available: 70 * G });
  assert.equal(trend.growthBytes, 30 * G);
  assert.equal(trend.monthsUntilFull, 2.3);
  assert.equal(health.computeTrend(samples.slice(0, 3), null).enoughData, false);

  const rec = await health.recordDailySample({ day: '2026-10-29' });
  assert.ok(rec.dbBytes > 0);
  const r = await request(app).get('/api/system/server-health').set(as(superadmin));
  assert.equal(r.body.volumes.day, '2026-10-29');
  assert.ok(r.body.volumes.backupsBytes > 0);
});

test('journal : date valide seulement, jamais un chemin', async () => {
  const ok = await request(app).get('/api/system/server-health/journal/2026-10-29').set(as(superadmin));
  assert.equal(ok.status, 200);
  assert.match(ok.body.text, /Termine/);
  for (const bad of ['..%2F..%2Fetc%2Fpasswd', '2026-10-30', 'status']) {
    assert.equal((await request(app).get(`/api/system/server-health/journal/${bad}`).set(as(superadmin))).status, 404);
  }
});
