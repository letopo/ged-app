// Discussion d'un document : bandeau épinglé (document, statut, étape en cours)
// et messages automatiques du circuit (soumission, validation, approbation,
// rejet, transmission), seulement si la discussion existe.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import request from 'supertest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import sequelize from '../../src/config/database.js';
import { Document, ChatMessage } from '../../src/models/index.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f;
let agent; let v1; let v2; let outsider;

const pdfBytes = async () => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  page.drawText('Note de service', { x: 50, y: 780, size: 12, font: await pdf.embedFont(StandardFonts.Helvetica) });
  return Buffer.from(await pdf.save());
};
const as = (u) => authHeaders(f.tenant, u);
const settle = () => new Promise((r) => setTimeout(r, 150)); // messages publiés après la réponse

async function uploadDoc(title) {
  const res = await request(app).post('/api/documents/upload').set(as(agent))
    .attach('file', await pdfBytes(), { filename: 'note.pdf', contentType: 'application/pdf' })
    .field('title', title).field('category', 'Note');
  return res.body?.data?.document || res.body?.data || res.body?.document;
}
const openThread = async (u, doc) => (await request(app).get(`/api/chat/conversations/document/${doc.id}`).set(as(u))).body.data;
const systemLines = async (u, conv) => (await request(app).get(`/api/chat/conversations/${conv.id}/messages`).set(as(u))).body.data
  .filter((m) => m.is_system).map((m) => m.content);
const banner = async (u, conv) => (await request(app).get(`/api/chat/conversations/${conv.id}/document`).set(as(u))).body;

before(async () => {
  f = makeFactory(await createTenant());
  [agent, v1, v2, outsider] = await Promise.all([f.user({ firstName: 'Agent', lastName: 'Soumis' }), f.user({ firstName: 'Val', lastName: 'Un' }), f.user({ firstName: 'Val', lastName: 'Deux' }), f.user()]);
});
after(async () => {
  const docs = await f.run(() => Document.findAll({ attributes: ['filePath'] }));
  for (const d of docs) if (d.filePath) await fs.unlink(path.resolve(process.cwd(), d.filePath)).catch(() => {});
  await sequelize.close();
});

test('bandeau et messages automatiques au fil du circuit', async () => {
  const doc = await uploadDoc('Note de garde');
  const conv = await openThread(agent, doc);

  let b = await banner(agent, conv);
  assert.equal(b.data.accessible, true);
  assert.equal(b.data.title, 'Note de garde');
  assert.equal(b.data.workflow, null);

  const wf = await request(app).post('/api/workflows').set(as(agent)).send({ documentId: doc.id, validatorIds: [v1.id, v2.id] });
  assert.equal(wf.status, 201, wf.body?.message);
  const steps = [...wf.body.data].sort((a, x) => a.step - x.step);
  await settle();
  b = await banner(agent, conv);
  assert.deepEqual([b.data.workflow.total, b.data.workflow.current.step, b.data.workflow.current.validator], [2, 1, 'Val Un']);

  const r1 = await request(app).put(`/api/workflows/${steps[0].id}/validate`).set(as(v1)).send({ status: 'approved', comment: 'RAS' });
  assert.equal(r1.status, 200, r1.body?.message);
  await settle();
  const r2 = await request(app).put(`/api/workflows/${steps[1].id}/validate`).set(as(v2)).send({ status: 'approved' });
  assert.equal(r2.status, 200, r2.body?.message);
  await settle();

  const lines = await systemLines(agent, conv);
  assert.match(lines[0], /^📤 Agent Soumis a soumis le document à validation \(2 étape\(s\)\) — premier validateur : Val Un\.$/);
  assert.equal(lines[1], '✅ Val Un a validé le document (étape 1/2) — « RAS »');
  assert.equal(lines[2], '⏳ Au tour de Val Deux (étape 2/2).');
  assert.equal(lines[3], '✅ Val Deux a validé le document (étape 2/2)');
  assert.equal(lines[4], '🎉 Document approuvé : circuit de validation terminé.');

  b = await banner(agent, conv);
  assert.equal(b.data.status, 'approved');
  assert.equal(b.data.workflow.current, null);

  // les messages automatiques ne comptent pas comme non lus
  const list = (await request(app).get('/api/chat/conversations').set(as(agent))).body.data;
  assert.equal(Number(list.find((c) => c.id === conv.id).unread_count), 0);
});

test('rejet et transmission', async () => {
  const doc = await uploadDoc('Demande');
  const conv = await openThread(agent, doc);
  const wf = await request(app).post('/api/workflows').set(as(agent)).send({ documentId: doc.id, validatorIds: [v1.id] });
  await request(app).put(`/api/workflows/${wf.body.data[0].id}/validate`).set(as(v1)).send({ status: 'rejected', comment: 'Pièce manquante' });
  await request(app).post(`/api/documents/${doc.id}/transmit`).set(as(agent)).send({ userIds: [v2.id], message: 'Pour info' });
  await settle();
  const lines = await systemLines(agent, conv);
  assert.ok(lines.includes('❌ Val Un a rejeté le document — « Pièce manquante »'), lines.join('\n'));
  assert.ok(lines.includes('📨 Agent Soumis a transmis le document à Val Deux — « Pour info »'), lines.join('\n'));
});

test('sans discussion ouverte, aucun fil n\'est créé', async () => {
  const doc = await uploadDoc('Sans discussion');
  await request(app).post('/api/workflows').set(as(agent)).send({ documentId: doc.id, validatorIds: [v1.id] });
  await settle();
  const count = await f.run(() => ChatMessage.count({ where: { isSystem: true, content: { [sequelize.Sequelize.Op.like]: '%Sans discussion%' } } }));
  assert.equal(count, 0);
  const threads = await sequelize.query('SELECT count(*)::int AS n FROM chat_conversations WHERE document_id = :d', { replacements: { d: doc.id }, type: sequelize.QueryTypes.SELECT });
  assert.equal(threads[0].n, 0);
});

test('bandeau : réservé aux membres, « accès réservé » sans le titre si on ne peut plus lire', async () => {
  const doc = await uploadDoc('Confidentiel RH');
  const conv = await openThread(agent, doc);
  assert.equal((await request(app).get(`/api/chat/conversations/${conv.id}/document`).set(as(outsider))).status, 403);
  // membre de la discussion sans droit de lecture
  await sequelize.query('INSERT INTO chat_conversation_members (conversation_id, user_id, role) VALUES (:c, :u, \'member\')', { replacements: { c: conv.id, u: outsider.id } });
  const b = await banner(outsider, conv);
  assert.deepEqual(b.data, { accessible: false });
});
