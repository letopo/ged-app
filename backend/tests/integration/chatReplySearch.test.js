// Discussion — répondre à un message et rechercher dans les messages : on ne
// cite qu'un message de la même conversation ; la citation d'un document de la
// GED n'en montre pas le titre ; la recherche ne parcourt que mes conversations.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import sequelize from '../../src/config/database.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f;
let A; let B; let C;
let conv; let other;

before(async () => {
  f = makeFactory(await createTenant());
  [A, B, C] = await Promise.all([f.user({ firstName: 'Ana', lastName: 'Auteur' }), f.user({ firstName: 'Bob', lastName: 'Lecteur' }), f.user()]);
  conv = (await request(app).post('/api/chat/conversations').set(as(A)).send({ type: 'channel', name: 'Garde', memberIds: [B.id] })).body.data;
  other = (await request(app).post('/api/chat/conversations').set(as(C)).send({ type: 'channel', name: 'Autre', memberIds: [] })).body.data;
});
after(async () => { await sequelize.close(); });

const as = (u) => authHeaders(f.tenant, u);
const send = (u, convId, body) => request(app).post(`/api/chat/conversations/${convId}/messages`).set(as(u)).send(body);
const list = async (u, convId) => (await request(app).get(`/api/chat/conversations/${convId}/messages`).set(as(u))).body.data;
const search = async (u, q) => (await request(app).get('/api/chat/search').query({ q }).set(as(u))).body.data;

test('répondre à un message : la citation accompagne la réponse', async () => {
  const orig = (await send(A, conv.id, { content: 'Qui est de garde samedi ?' })).body.data;
  const res = await send(B, conv.id, { content: 'Moi, de 8 h à 20 h', replyToId: orig.id });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.reply_to_id, orig.id);
  assert.equal(res.body.data.reply_content, 'Qui est de garde samedi ?');
  assert.equal(res.body.data.reply_author_first_name, 'Ana');
  const row = (await list(A, conv.id)).find((m) => m.id === res.body.data.id);
  assert.equal(row.reply_content, 'Qui est de garde samedi ?');
  assert.equal(row.reply_deleted, false);

  // message cité supprimé ensuite : la réponse reste, sans le texte cité
  await request(app).delete(`/api/chat/messages/${orig.id}`).set(as(A));
  const after = (await list(B, conv.id)).find((m) => m.id === res.body.data.id);
  assert.equal(after.reply_deleted, true);
  assert.equal(after.reply_content, null);
});

test('on ne cite pas un message d\'une autre conversation', async () => {
  const secret = (await send(C, other.id, { content: 'Message privé de C' })).body.data;
  const res = await send(A, conv.id, { content: 'Tentative', replyToId: secret.id });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.reply_to_id, undefined);
  const row = (await list(A, conv.id)).find((m) => m.id === res.body.data.id);
  assert.equal(row.reply_to_id, null);
  assert.equal(row.reply_content, null);
});

test('citer un document de la GED partagé n\'en montre pas le titre', async () => {
  const doc = await f.document(A, { title: 'Dossier confidentiel' });
  const shared = (await send(A, conv.id, { documentId: doc.id })).body.data;
  const res = await send(A, conv.id, { content: 'Voir ci-dessus', replyToId: shared.id });
  assert.equal(res.body.data.reply_kind, 'document');
  assert.equal(res.body.data.reply_attachment_name, null);
  assert.ok(!JSON.stringify(await list(B, conv.id)).includes('Dossier confidentiel'));
});

test('recherche : mes conversations seulement, % et _ pris à la lettre', async () => {
  await send(A, conv.id, { content: 'Le planning de garde est validé' });
  await send(C, other.id, { content: 'Planning de garde (conversation de C)' });
  await send(A, conv.id, { content: 'Taux 100% atteint' });
  await send(A, conv.id, { content: 'Taux 1000 atteint' });

  const found = await search(B, 'planning de GARDE');
  assert.deepEqual(found.map((m) => m.content), ['Le planning de garde est validé']);
  assert.equal(found[0].conversation_id, conv.id);
  assert.equal(found[0].conversation_name, 'Garde');
  assert.equal(found[0].author_first_name, 'Ana');

  assert.deepEqual((await search(B, '100%')).map((m) => m.content), ['Taux 100% atteint']);
  assert.deepEqual(await search(B, 'a'), [], 'au moins 2 caractères');
  assert.ok(!(await search(B, 'conversation de C')).length, 'pas les conversations des autres');
  assert.ok((await search(C, 'conversation de C')).length === 1);
});
