// Transmettre un document : quel que soit son statut (brouillon non signé,
// signé à la main, en cours de validation, validé). Exemple : une facture
// déposée par un agent, transmise à la comptabilité. Seule condition : pouvoir
// lire le document.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import sequelize from '../../src/config/database.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f;
before(async () => { f = makeFactory(await createTenant()); });
after(async () => { await sequelize.close(); });

const as = (user) => authHeaders(f.tenant, user);
const transmit = (doc, from, to) => request(app).post(`/api/documents/${doc.id}/transmit`).set(as(from)).send({ userIds: to.map(u => u.id), message: 'Pour paiement' });
const received = async (user) => (await request(app).get('/api/documents/transmissions/received').set(as(user))).body.transmissions.map(t => t.document.id);

for (const [label, attrs] of [
  ['brouillon non signé (facture déposée)', { status: 'draft' }],
  ['signé à la main', { status: 'draft', metadata: { manualSignature: { signerName: 'Patient', signedAt: new Date().toISOString() } } }],
  ['en cours de validation', { status: 'pending_validation' }],
  ['validé', { status: 'approved' }],
]) {
  test(`document ${label} : transmissible, le destinataire peut l'ouvrir`, async () => {
    const owner = await f.user();
    const compta = await f.user();
    const doc = await f.document(owner, attrs);
    const res = await transmit(doc, owner, [compta]);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.ok((await received(compta)).includes(doc.id));
    assert.equal((await request(app).get(`/api/documents/${doc.id}`).set(as(compta))).status, 200);
  });
}

test('un document reçu peut être retransmis', async () => {
  const owner = await f.user();
  const relay = await f.user();
  const compta = await f.user();
  const doc = await f.document(owner);
  assert.equal((await transmit(doc, owner, [relay])).status, 200);
  const res = await transmit(doc, relay, [compta]);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.ok((await received(compta)).includes(doc.id));
});

test('sans droit de lecture : transmission refusée', async () => {
  const owner = await f.user();
  const stranger = await f.user();
  const doc = await f.document(owner);
  const res = await transmit(doc, stranger, [await f.user()]);
  assert.equal(res.status, 403);
});
