// Chat (audit sécurité run-1, pistes 8, 9 et 11) : on ne rejoint une
// conversation que si un membre (ou un administrateur) vous y ajoute, dans le
// même établissement ; le fil d'un document exige le droit de lire ce document ;
// en temps réel, seuls les membres reçoivent les messages.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import request from 'supertest';
import { io as ioClient } from 'socket.io-client';
import sequelize from '../../src/config/database.js';
import { initializeSocket } from '../../src/utils/socketManager.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f;
let g; // autre établissement
let A; let B; let C; let D; let admin; let outsider;
let server;
let port;
const sockets = [];

before(async () => {
  f = makeFactory(await createTenant());
  g = makeFactory(await createTenant());
  [A, B, C, D, admin] = await Promise.all([f.user(), f.user(), f.user(), f.user(), f.user({ role: 'admin' })]);
  outsider = await g.user({ role: 'admin' });
  server = http.createServer(app);
  initializeSocket(server);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  port = server.address().port;
});
after(async () => {
  sockets.forEach((s) => s.close());
  await new Promise((r) => server.close(r));
  await sequelize.close();
});

const as = (u, fac = f) => authHeaders(fac.tenant, u);
const channel = async (owner, members, name = 'Canal test') => (await request(app).post('/api/chat/conversations').set(as(owner)).send({ type: 'channel', name, memberIds: members.map((m) => m.id) })).body.data;
const addMember = (actor, convId, target, fac = f) => request(app).post(`/api/chat/conversations/${convId}/members`).set(as(actor, fac)).send({ userId: target.id });
const messages = (u, convId, fac = f) => request(app).get(`/api/chat/conversations/${convId}/messages`).set(as(u, fac));

test('un non-membre ne peut pas s\'ajouter à une conversation', async () => {
  const conv = await channel(A, [B]);
  assert.equal((await addMember(C, conv.id, C)).status, 403);
  assert.equal((await messages(C, conv.id)).status, 403);
});

test('un membre peut toujours inviter un collègue', async () => {
  const conv = await channel(A, [B]);
  assert.equal((await addMember(B, conv.id, D)).status, 200);
  assert.equal((await messages(D, conv.id)).status, 200);
});

test('un membre retiré par un administrateur ne peut pas revenir seul', async () => {
  const conv = await channel(A, [B]);
  const rm = await request(app).delete(`/api/chat/conversations/${conv.id}/members/${B.id}`).set(as(admin));
  assert.equal(rm.status, 200);
  assert.equal((await addMember(B, conv.id, B)).status, 403);
});

test('un autre établissement ne peut ni rejoindre ni lire', async () => {
  const conv = await channel(A, [B]);
  assert.equal((await addMember(outsider, conv.id, outsider, g)).status, 404);
  assert.equal((await messages(outsider, conv.id, g)).status, 403);
});

test('on n\'ajoute pas une personne d\'un autre établissement', async () => {
  const conv = await channel(A, [B]);
  assert.equal((await addMember(A, conv.id, outsider)).status, 400);
  const created = await request(app).post('/api/chat/conversations').set(as(A)).send({ type: 'channel', name: 'Mixte', memberIds: [B.id, outsider.id] });
  assert.equal(created.status, 400);
});

test('une conversation privée (directe) ne reçoit pas de tiers', async () => {
  const direct = (await request(app).post('/api/chat/conversations').set(as(A)).send({ type: 'direct', memberIds: [B.id] })).body.data;
  assert.equal((await addMember(A, direct.id, C)).status, 403);
});

test('fil d\'un document : réservé à qui peut lire le document', async () => {
  const doc = await f.document(A, { title: 'Dossier confidentiel' });
  assert.equal((await request(app).get(`/api/chat/conversations/document/${doc.id}`).set(as(A))).status, 200);
  const res = await request(app).get(`/api/chat/conversations/document/${doc.id}`).set(as(C));
  assert.equal(res.status, 403);
  assert.ok(!JSON.stringify(res.body).includes('Dossier confidentiel'));
  const other = await request(app).get(`/api/chat/conversations/document/${doc.id}`).set(as(outsider, g));
  assert.equal(other.status, 404);
  assert.ok(!JSON.stringify(other.body).includes('Dossier confidentiel'), 'pas de fuite du titre');
});

function socketOf(u) {
  const s = ioClient(`http://127.0.0.1:${port}`, { auth: { token: as(u).Authorization.split(' ')[1] }, transports: ['websocket'], reconnection: false });
  sockets.push(s);
  return new Promise((r, j) => { s.on('connect', () => r(s)); s.on('connect_error', j); });
}
const received = (s, ms = 1200) => new Promise((resolve) => {
  const got = [];
  s.on('chat:message', (m) => got.push(m));
  setTimeout(() => resolve(got), ms);
});

test('temps réel : un non-membre qui rejoint la salle ne reçoit rien, un membre si', async () => {
  const conv = await channel(A, [B], 'Canal temps réel');
  const sC = await socketOf(C);
  const sB = await socketOf(B);
  sC.emit('chat:join', conv.id);
  sB.emit('chat:join', conv.id);
  await new Promise((r) => setTimeout(r, 400));
  const gotC = received(sC);
  const gotB = received(sB);
  const post = await request(app).post(`/api/chat/conversations/${conv.id}/messages`).set(as(A)).send({ content: 'Message secret' });
  assert.equal(post.status, 201, JSON.stringify(post.body));
  assert.equal((await gotC).length, 0, 'le non-membre ne reçoit pas le message');
  assert.ok((await gotB).length >= 1, 'le membre reçoit le message');
});

test('temps réel : un membre retiré cesse de recevoir les messages', async () => {
  const conv = await channel(A, [B], 'Canal retrait');
  const sB = await socketOf(B);
  sB.emit('chat:join', conv.id);
  await new Promise((r) => setTimeout(r, 400));
  await request(app).delete(`/api/chat/conversations/${conv.id}/members/${B.id}`).set(as(admin));
  await new Promise((r) => setTimeout(r, 200));
  const gotB = received(sB);
  await request(app).post(`/api/chat/conversations/${conv.id}/messages`).set(as(A)).send({ content: 'Après retrait' });
  assert.equal((await gotB).length, 0);
});
