// Discussion — accusés de lecture et notifications : la lecture est diffusée
// aux participants (✓✓) ; un nouveau message alerte dans l'application les
// participants qui l'ont à l'écran sans lire cette conversation, jamais celui
// qui la lit déjà, ni une conversation en sourdine.
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
let A; let B; let C;
let server; let port;
const sockets = [];

before(async () => {
  f = makeFactory(await createTenant());
  [A, B, C] = await Promise.all([f.user({ firstName: 'Ana', lastName: 'Auteur' }), f.user(), f.user()]);
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

const as = (u) => authHeaders(f.tenant, u);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function socketOf(u) {
  const s = ioClient(`http://127.0.0.1:${port}`, { auth: { token: as(u).Authorization.split(' ')[1] }, transports: ['websocket'], reconnection: false });
  sockets.push(s);
  return new Promise((r, j) => { s.on('connect', () => r(s)); s.on('connect_error', j); });
}
const collect = (s, event, ms = 700) => new Promise((resolve) => {
  const got = [];
  const h = (m) => got.push(m);
  s.on(event, h);
  setTimeout(() => { s.off(event, h); resolve(got); }, ms);
});
const channel = async (members, name) => (await request(app).post('/api/chat/conversations').set(as(A)).send({ type: 'channel', name, memberIds: members.map((m) => m.id) })).body.data;
const send = (convId, content) => request(app).post(`/api/chat/conversations/${convId}/messages`).set(as(A)).send({ content });

test('lire une conversation est diffusé aux participants (accusé de lecture)', async () => {
  const conv = await channel([B], 'Lecture');
  const sA = await socketOf(A);
  sA.emit('chat:join', conv.id);
  await wait(300);
  const got = collect(sA, 'chat:read');
  assert.equal((await request(app).post(`/api/chat/conversations/${conv.id}/read`).set(as(B))).status, 200);
  const events = await got;
  assert.equal(events.length, 1);
  assert.equal(events[0].userId, B.id);
  assert.ok(new Date(events[0].readAt) > new Date(Date.now() - 5000));
  // un non-membre qui lit ne diffuse rien
  const none = collect(sA, 'chat:read');
  await request(app).post(`/api/chat/conversations/${conv.id}/read`).set(as(C));
  assert.equal((await none).length, 0);
  // l'heure de lecture est relue avec les participants
  const members = (await request(app).get(`/api/chat/conversations/${conv.id}/members`).set(as(A))).body.data;
  assert.ok(members.find((m) => m.user_id === B.id).last_read_at);
});

test('alerte dans l\'application : application ouverte ailleurs, pas sur cette conversation', async () => {
  const conv = await channel([B], 'Alerte');
  const sB = await socketOf(B);
  sB.emit('chat:join', conv.id);
  await wait(300);
  const got = collect(sB, 'chat:notify');
  await send(conv.id, 'Réunion à 14 h');
  const alerts = await got;
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].conversationId, conv.id);
  assert.equal(alerts[0].title, 'Ana Auteur · #Alerte');
  assert.equal(alerts[0].body, 'Réunion à 14 h');
});

test('pas d\'alerte pour qui lit déjà la conversation, ni pour l\'auteur', async () => {
  const conv = await channel([B], 'Lue');
  const [sA, sB] = await Promise.all([socketOf(A), socketOf(B)]);
  sB.emit('chat:join', conv.id);
  sA.emit('chat:join', conv.id);
  await wait(300);
  sB.emit('chat:viewing', conv.id);
  await wait(150);
  const gotB = collect(sB, 'chat:notify');
  const gotA = collect(sA, 'chat:notify');
  await send(conv.id, 'Tu me lis ?');
  assert.equal((await gotB).length, 0);
  assert.equal((await gotA).length, 0);
});

test('application en arrière-plan : pas d\'alerte dans l\'application (notification push à la place)', async () => {
  // utilisateur sans autre connexion ouverte (une autre fenêtre visible recevrait l'alerte)
  const D = await f.user();
  const conv = await channel([D], 'Arrière-plan');
  const sB = await socketOf(D);
  sB.emit('chat:join', conv.id);
  sB.emit('app:visibility', false);
  await wait(300);
  const got = collect(sB, 'chat:notify');
  await send(conv.id, 'Message en arrière-plan');
  assert.equal((await got).length, 0);
});

test('conversation en sourdine : aucune alerte', async () => {
  const conv = await channel([B], 'Sourdine');
  const mute = await request(app).put(`/api/chat/conversations/${conv.id}/mute`).set(as(B)).send({ muted: true });
  assert.equal(mute.body.muted, true);
  const list = (await request(app).get('/api/chat/conversations').set(as(B))).body.data;
  assert.equal(list.find((c) => c.id === conv.id).muted, true);
  const sB = await socketOf(B);
  sB.emit('chat:join', conv.id);
  await wait(300);
  const got = collect(sB, 'chat:notify');
  await send(conv.id, 'Silence');
  assert.equal((await got).length, 0);
  assert.equal((await request(app).put(`/api/chat/conversations/${conv.id}/mute`).set(as(C)).send({ muted: true })).status, 403);
});
