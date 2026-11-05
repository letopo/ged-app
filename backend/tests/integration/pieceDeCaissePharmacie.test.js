// Pièce de caisse du personnel de la Pharmacie (demande du 05/11/2026) : le
// circuit ne passe pas chez le DG — Pharmacienne (déposante) → Caissière →
// Comptable, chacun signant ; les autres services gardent DG → Comptable → Caissière.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import sequelize from '../../src/config/database.js';
import { Document, Workflow } from '../../src/models/index.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f; let pharmacienne; let agent; let caissiere; let comptable; let dg;
const as = (u) => authHeaders(f.tenant, u);
const circuit = async (docId) => (await f.run(() => Workflow.findAll({ where: { documentId: docId }, order: [['step', 'ASC']] }))).map((w) => w.validatorId);

before(async () => {
  f = makeFactory(await createTenant());
  pharmacienne = await f.user();
  await f.member(pharmacienne, await f.service('Pharmacie'));
  agent = await f.user();
  await f.member(agent, await f.service('Laboratoire'));
  caissiere = await f.user({ role: 'caissier' });
  comptable = await f.user();
  dg = await f.user({ role: 'director' });
  await f.poste('comptable', [comptable]);
  await f.poste('dg', [dg]);
});
after(async () => {
  await f.dropPostes();
  await sequelize.close();
});

test('Pharmacie : aperçu et circuit Pharmacienne → Caissière → Comptable, sans DG', async () => {
  const doc = await f.document(pharmacienne, { title: 'CAISSE HSJM', category: 'Pièce de caisse' });
  const preview = await request(app).get(`/api/workflows/document/${doc.id}/piece-de-caisse-preview`).set(as(pharmacienne));
  assert.equal(preview.status, 200, JSON.stringify(preview.body));
  assert.deepEqual(preview.body.steps.map((s) => s.label), ['Pharmacienne', 'Caissière', 'Comptable']);

  const wf = await request(app).post('/api/workflows').set(as(pharmacienne)).send({ documentId: doc.id });
  assert.equal(wf.status, 201, JSON.stringify(wf.body));
  assert.deepEqual(await circuit(doc.id), [pharmacienne.id, caissiere.id, comptable.id]);
  const saved = await f.run(() => Document.findByPk(doc.id));
  assert.equal(saved.metadata.circuitPC, 'pharmacie');
});

test('autre service : circuit habituel DG → Comptable → Caissière', async () => {
  const doc = await f.document(agent, { category: 'Pièce de caisse' });
  const wf = await request(app).post('/api/workflows').set(as(agent)).send({ documentId: doc.id });
  assert.equal(wf.status, 201, JSON.stringify(wf.body));
  assert.deepEqual(await circuit(doc.id), [dg.id, comptable.id, caissiere.id]);
  assert.equal((await f.run(() => Document.findByPk(doc.id))).metadata.circuitPC, 'standard');
});
