// Règles métier à travers l'API (vraies requêtes HTTP sur l'application, sans
// démarrer le serveur) : délai de la demande de permission, verrou de la
// signature manuscrite, circuit de validation, intérim saisi une seule fois.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import request from 'supertest';
import sharp from 'sharp';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import sequelize from '../../src/config/database.js';
import { Document, Workflow } from '../../src/models/index.js';
import { permissionEarliestStart } from '../../src/utils/permissionRules.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f;
let u;
const created = []; // fichiers à supprimer à la fin

const pdfBytes = async (lines = ['Facture de test', 'Signature du patient :']) => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  lines.forEach((l, i) => page.drawText(l, { x: 50, y: 780 - i * 30, size: 12, font }));
  return Buffer.from(await pdf.save());
};
const addDays = (iso, n) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const todayDouala = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Douala' });

async function upload(user, fields = {}, lines) {
  let req = request(app).post('/api/documents/upload').set(authHeaders(f.tenant, user))
    .attach('file', await pdfBytes(lines), { filename: 'test.pdf', contentType: 'application/pdf' });
  for (const [k, v] of Object.entries({ title: 'Document de test', ...fields })) req = req.field(k, typeof v === 'string' ? v : JSON.stringify(v));
  const res = await req;
  const doc = res.body?.data?.document || res.body?.data || res.body?.document;
  if (doc?.filePath) created.push(doc.filePath);
  return { res, doc };
}

before(async () => {
  f = makeFactory(await createTenant());
  const [agent, admin, v1, v2] = await Promise.all([f.user(), f.user({ role: 'admin' }), f.user(), f.user()]);
  u = { agent, admin, v1, v2 };
});
after(async () => {
  const docs = await f.run(() => Document.findAll({ attributes: ['filePath', 'metadata'] }));
  for (const d of docs) {
    created.push(d.filePath);
    if (d.metadata?.manualSignature?.originalFilePath) created.push(d.metadata.manualSignature.originalFilePath);
  }
  for (const p of new Set(created.filter(Boolean))) await fs.unlink(path.resolve(process.cwd(), p)).catch(() => {});
  await sequelize.close();
});

// ── Demande de permission : 2 jours ouvrables ──────────────────────────────
test('permission : refusée avant J+2 ouvrables pour un agent', async () => {
  const tooSoon = addDays(todayDouala(), 1);
  const { res } = await upload(u.agent, { category: 'Demande de permission', dateDebut: tooSoon });
  assert.equal(res.status, 400);
  assert.match(res.body.message, /2 jours ouvrables/);
});
test('permission : acceptée à partir de J+2 ouvrables', async () => {
  const { res } = await upload(u.agent, { category: 'Demande de permission', dateDebut: permissionEarliestStart() });
  assert.equal(res.status, 201, res.body?.message);
});
test('permission : une période trop proche dans metadata.periods est aussi refusée', async () => {
  const { res } = await upload(u.agent, {
    category: 'Demande de permission', dateDebut: addDays(todayDouala(), 30),
    metadata: { periods: [{ startDate: addDays(todayDouala(), 30) }, { startDate: todayDouala() }] },
  });
  assert.equal(res.status, 400);
});
test('permission : un administrateur peut la demander pour demain', async () => {
  const { res } = await upload(u.admin, { category: 'Demande de permission', dateDebut: addDays(todayDouala(), 1) });
  assert.equal(res.status, 201, res.body?.message);
});

// ── Signature manuscrite : document verrouillé ─────────────────────────────
test('signature manuscrite : signée une fois, puis verrouillée', async () => {
  const { doc } = await upload(u.agent, { category: 'Facture' });
  const png = await sharp({ create: { width: 300, height: 120, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: Buffer.from('<svg width="300" height="120"><path d="M10 80 C 60 10, 120 120, 290 40" stroke="#123" stroke-width="5" fill="none"/></svg>') }])
    .png().toBuffer();
  const body = { signature: `data:image/png;base64,${png.toString('base64')}`, signerName: 'Jean Patient', placement: { page: 1, x: 0.1, y: 0.7, w: 0.3, h: 0.1 } };
  const sign = await request(app).post(`/api/documents/${doc.id}/manual-signature`).set(authHeaders(f.tenant, u.agent)).send(body);
  assert.ok([200, 201].includes(sign.status), sign.body?.message);
  const signed = await f.run(() => Document.findByPk(doc.id));
  assert.ok(signed.metadata.manualSignature?.sha256, 'preuve de signature enregistrée');
  created.push(signed.filePath);

  // 2e signature : refusée
  const again = await request(app).post(`/api/documents/${doc.id}/manual-signature`).set(authHeaders(f.tenant, u.agent)).send(body);
  assert.equal(again.status, 409);
  // Modification : le fichier et la preuve ne bougent pas
  const moved = await request(app).put(`/api/documents/${doc.id}`).set(authHeaders(f.tenant, u.agent))
    .send({ filePath: 'uploads/autre.pdf' });
  assert.equal(moved.status, 400, 'le fichier ne se change pas par PUT');
  const upd = await request(app).put(`/api/documents/${doc.id}`).set(authHeaders(f.tenant, u.agent))
    .send({ title: 'Nouveau titre', metadata: { manualSignature: null } });
  assert.equal(upd.status, 200);
  const after = await f.run(() => Document.findByPk(doc.id));
  assert.equal(after.title, 'Nouveau titre');
  assert.equal(after.filePath, signed.filePath);
  assert.deepEqual(after.metadata.manualSignature, signed.metadata.manualSignature);
  // Ajout de page : refusé
  const add = await request(app).post(`/api/documents/${doc.id}/add-page`).set(authHeaders(f.tenant, u.agent))
    .attach('file', await pdfBytes(), { filename: 'page.pdf', contentType: 'application/pdf' });
  assert.equal(add.status, 409);
  // Circuit de validation : refusé
  const wf = await request(app).post('/api/workflows').set(authHeaders(f.tenant, u.agent)).send({ documentId: doc.id, validatorIds: [u.v1.id] });
  assert.equal(wf.status, 409);
});

// ── Circuit de validation ──────────────────────────────────────────────────
async function startCircuit(category = 'Note', lines) {
  const { doc } = await upload(u.agent, { category }, lines);
  const wf = await request(app).post('/api/workflows').set(authHeaders(f.tenant, u.agent)).send({ documentId: doc.id, validatorIds: [u.v1.id, u.v2.id] });
  assert.equal(wf.status, 201, wf.body?.message);
  const steps = [...wf.body.data].sort((a, b) => a.step - b.step);
  return { doc, steps };
}
const validate = (user, taskId, body) => request(app).put(`/api/workflows/${taskId}/validate`).set(authHeaders(f.tenant, user)).send(body);

test('circuit : seul le validateur de l\'étape peut valider', async () => {
  const { steps } = await startCircuit();
  assert.equal((await validate(u.v2, steps[0].id, { status: 'approved' })).status, 403);
  assert.equal((await validate(u.agent, steps[0].id, { status: 'approved' })).status, 403);
});
test('circuit : deux approbations → document approuvé', async () => {
  const { doc, steps } = await startCircuit();
  assert.deepEqual(steps.map((s) => s.validatorId), [u.v1.id, u.v2.id]);
  const r1 = await validate(u.v1, steps[0].id, { status: 'approved' });
  assert.equal(r1.status, 200, r1.body?.message);
  const mid = await f.run(() => Document.findByPk(doc.id));
  assert.notEqual(mid.status, 'approved', 'pas encore approuvé après la 1re étape');
  const r2 = await validate(u.v2, steps[1].id, { status: 'approved' });
  assert.equal(r2.status, 200, r2.body?.message);
  const done = await f.run(() => Document.findByPk(doc.id));
  assert.equal(done.status, 'approved');
  const tasks = await f.run(() => Workflow.findAll({ where: { documentId: doc.id } }));
  assert.ok(tasks.every((t) => t.status === 'approved'));
});
test('circuit : un rejet → document rejeté, l\'étape suivante n\'a rien à valider', async () => {
  const { doc, steps } = await startCircuit();
  const r = await validate(u.v1, steps[0].id, { status: 'rejected', comment: 'Incomplet' });
  assert.equal(r.status, 200, r.body?.message);
  const rejected = await f.run(() => Document.findByPk(doc.id));
  assert.equal(rejected.status, 'rejected');
  const next = await f.run(() => Workflow.findByPk(steps[1].id));
  assert.notEqual(next.status, 'approved');
  assert.notEqual(next.status, 'pending');
});

// ── Demande de permission : intérim saisi une seule fois ───────────────────
test('permission : l\'intérim saisi par le 1er validateur ne peut plus être changé', async () => {
  const { doc, steps } = await startCircuit('Demande de permission', ['DEMANDE DE PERMISSION', 'Intérim assuré par :']);
  const r1 = await validate(u.v1, steps[0].id, { status: 'approved', remplacantName: 'Alice Interim' });
  assert.equal(r1.status, 200, r1.body?.message);
  const first = await f.run(() => Document.findByPk(doc.id));
  assert.equal(first.metadata?.interim?.name, 'Alice Interim');
  const r2 = await validate(u.v2, steps[1].id, { status: 'approved', remplacantName: 'Bob Autre' });
  assert.equal(r2.status, 200, r2.body?.message);
  const last = await f.run(() => Document.findByPk(doc.id));
  assert.equal(last.metadata?.interim?.name, 'Alice Interim');
});
