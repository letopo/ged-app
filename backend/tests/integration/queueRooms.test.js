// Files d'attente en temps réel (audit sécurité run-1, piste 15) : les salles
// Socket.IO des files (noms et téléphones des patients) sont propres à chaque
// établissement.
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

let f; let g;
let A; let A2; let B;
let server; let port;
const sockets = [];

before(async () => {
  f = makeFactory(await createTenant());
  g = makeFactory(await createTenant());
  [A, A2] = await Promise.all([f.user(), f.user()]);
  B = await g.user();
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

function socketOf(u, fac) {
  const s = ioClient(`http://127.0.0.1:${port}`, { auth: { token: authHeaders(fac.tenant, u).Authorization.split(' ')[1] }, transports: ['websocket'], reconnection: false });
  sockets.push(s);
  return new Promise((r, j) => { s.on('connect', () => r(s)); s.on('connect_error', j); });
}
const collect = (s, event, ms = 1200) => new Promise((resolve) => {
  const got = [];
  s.on(event, (m) => got.push(m));
  setTimeout(() => resolve(got), ms);
});

test('un ticket créé n\'est diffusé qu\'à la file de son établissement', async () => {
  const sameTenant = await socketOf(A2, f);
  const otherTenant = await socketOf(B, g);
  sameTenant.emit('join_queue', 'accueil_normal');
  otherTenant.emit('join_queue', 'accueil_normal');
  await new Promise((r) => setTimeout(r, 400));
  const gotSame = collect(sameTenant, 'ticket_created');
  const gotOther = collect(otherTenant, 'ticket_created');
  const res = await request(app).post('/api/tickets').set(authHeaders(f.tenant, A))
    .send({ visitType: 'consultation', patientType: 'normal', patientName: 'Patient Confidentiel', patientPhone: '690000000' });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal((await gotOther).length, 0, 'l\'autre établissement ne reçoit rien');
  const same = await gotSame;
  assert.equal(same.length, 1, 'la file du même établissement reçoit le ticket');
  assert.equal(same[0].patientName, 'Patient Confidentiel');
});

test('mise à jour de file : seulement pour son établissement', async () => {
  const sameTenant = await socketOf(A2, f);
  const otherTenant = await socketOf(B, g);
  sameTenant.emit('join_queue', 'caisse');
  otherTenant.emit('join_queue', 'caisse');
  await new Promise((r) => setTimeout(r, 400));
  const gotSame = collect(sameTenant, 'queue_update');
  const gotOther = collect(otherTenant, 'queue_update');
  sameTenant.emit('request_queue_status', 'caisse');
  assert.equal((await gotOther).length, 0);
  assert.ok((await gotSame).length >= 1);
});
