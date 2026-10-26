// Bornes de signature (audit sécurité run-1, piste 7) : seul un compte de
// guichet (ou titulaire du poste « Borne de signature ») peut se déclarer
// tablette ; un autre compte ne reçoit jamais les demandes de signature.
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
let server;
let port;
let agent;
const sockets = [];

before(async () => {
  f = makeFactory(await createTenant());
  agent = await f.user({ role: 'caissier' });
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

// Connecte un compte et tente de l'annoncer comme borne : 'registered' | 'refused'
async function register(user, name) {
  const token = authHeaders(f.tenant, user).Authorization.split(' ')[1];
  const s = ioClient(`http://127.0.0.1:${port}`, { auth: { token }, transports: ['websocket'], reconnection: false });
  sockets.push(s);
  await new Promise((r, j) => { s.on('connect', r); s.on('connect_error', j); });
  return new Promise((resolve) => {
    s.on('signature-kiosk:registered', () => resolve('registered'));
    s.on('signature-kiosk:refused', () => resolve('refused'));
    s.emit('signature-kiosk:register', { name });
    setTimeout(() => resolve('timeout'), 3000);
  });
}
const kioskNames = async () => (await request(app).get('/api/documents/signature-kiosks').set(authHeaders(f.tenant, agent))).body?.data?.map((k) => k.name) || [];

test('un compte ordinaire ne peut pas se déclarer tablette', async () => {
  const plain = await f.user({ firstName: 'Faux', lastName: 'Guichet' });
  assert.equal(await register(plain, 'Tablette accueil (fausse)'), 'refused');
  assert.ok(!(await kioskNames()).includes('Tablette accueil (fausse)'));
});

test('un compte de guichet (caisse) peut se déclarer tablette', async () => {
  const caisse = await f.user({ role: 'caissier' });
  assert.equal(await register(caisse, 'Tablette caisse 1'), 'registered');
  assert.ok((await kioskNames()).includes('Tablette caisse 1'));
});

test('le poste « Borne de signature » autorise aussi un autre compte', async () => {
  const borne = await f.user();
  await f.poste('borne_signature', [borne]);
  assert.equal(await register(borne, 'Tablette consultation'), 'registered');
  assert.ok((await kioskNames()).includes('Tablette consultation'));
});
