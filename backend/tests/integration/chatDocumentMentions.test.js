// Discussion d'un document : mentionner (@) un collègue l'ajoute à la
// discussion et lui transmet le document s'il ne pouvait pas le lire (mêmes
// règles que « Transmettre »). Seules comptent les personnes choisies dans la
// liste et nommées dans le message ; jamais hors de l'établissement, jamais
// dans une autre conversation.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import sequelize from '../../src/config/database.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f; let g;
let A; let B; let C; let outsider;
let doc; let thread;

before(async () => {
  f = makeFactory(await createTenant());
  g = makeFactory(await createTenant());
  [A, C] = await Promise.all([f.user(), f.user()]);
  B = await f.user({ username: `B-TIRET${Date.now() % 100000}` });
  outsider = await g.user();
  doc = await f.document(A, { title: 'Compte rendu de garde' });
  thread = (await request(app).get(`/api/chat/conversations/document/${doc.id}`).set(as(A))).body.data;
});
after(async () => {
  await sequelize.close();
});

const as = (u, fac = f) => authHeaders(fac.tenant, u);
const send = (u, convId, content, mentionUserIds) => request(app).post(`/api/chat/conversations/${convId}/messages`).set(as(u)).send({ content, mentionUserIds });
const candidates = async (u, convId, q) => (await request(app).get(`/api/chat/conversations/${convId}/mention-candidates`).query({ q }).set(as(u))).body;
const canRead = async (u) => (await request(app).get(`/api/documents/${doc.id}`).set(as(u))).status === 200;

test('la liste @ propose les collègues et signale qui n\'a pas encore accès', async () => {
  const res = await candidates(A, thread.id, B.username.slice(0, 4));
  assert.equal(res.documentThread, true);
  const b = res.data.find((u) => u.id === B.id);
  assert.ok(b, 'B est proposé même s\'il n\'est pas membre');
  assert.equal(b.is_member, false);
  assert.equal(b.has_access, false);
  const foreign = await request(app).get(`/api/chat/conversations/${thread.id}/mention-candidates`).set(as(outsider, g));
  assert.equal(foreign.status, 403);
});

test('mentionner un collègue l\'ajoute et lui transmet le document', async () => {
  assert.equal(await canRead(B), false);
  const res = await send(A, thread.id, `@${B.username}, peux-tu relire ce compte rendu ?`, [B.id]);
  assert.equal(res.status, 201);
  assert.deepEqual(res.body.added.map((a) => [a.id, a.transmitted]), [[B.id, true]]);
  assert.equal(await canRead(B), true);
  const msgs = await request(app).get(`/api/chat/conversations/${thread.id}/messages`).set(as(B));
  assert.equal(msgs.status, 200);
  const received = await request(app).get('/api/documents/transmissions/received').set(as(B));
  assert.ok(received.body.transmissions.some((t) => t.document.id === doc.id));

  // déjà membre et lecteur : rien à transmettre de nouveau
  const again = await send(A, thread.id, `Merci @${B.username}`, [B.id]);
  assert.deepEqual(again.body.added.map((a) => [a.joined, a.transmitted]), [[false, false]]);
});

test('une personne choisie mais absente du message n\'est pas ajoutée', async () => {
  const res = await send(A, thread.id, 'Message sans mention', [C.id]);
  assert.deepEqual(res.body.added, []);
  assert.equal(await canRead(C), false);
  assert.equal((await request(app).get(`/api/chat/conversations/${thread.id}/messages`).set(as(C))).status, 403);
});

test('jamais une personne d\'un autre établissement', async () => {
  const res = await send(A, thread.id, `@${outsider.username} bonjour`, [outsider.id]);
  assert.equal(res.status, 201);
  assert.deepEqual(res.body.added, []);
});

test('hors discussion de document, une mention ne fait entrer personne', async () => {
  const channel = (await request(app).post('/api/chat/conversations').set(as(A)).send({ type: 'channel', name: 'Canal', memberIds: [B.id] })).body.data;
  const res = await send(A, channel.id, `@${C.username} tu es là ?`, [C.id]);
  assert.deepEqual(res.body.added, []);
  assert.equal((await request(app).get(`/api/chat/conversations/${channel.id}/messages`).set(as(C))).status, 403);
  // la liste @ d'un canal ne propose que ses membres
  const list = await candidates(A, channel.id, '');
  assert.deepEqual(list.data.map((u) => u.id), [B.id]);
});
