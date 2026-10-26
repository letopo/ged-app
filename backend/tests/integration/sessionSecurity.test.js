// Sessions (audit sécurité run-1, pistes 2, 6 et 12) :
//  - le jeton provisoire 2FA (après le seul mot de passe) n'est jamais une session ;
//  - un compte désactivé perd ses sessions ;
//  - désactivation et (ré)initialisation du mot de passe révoquent les jetons ;
//  - mêmes règles pour l'API, le super-admin et le temps réel (Socket.IO).
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import speakeasy from 'speakeasy';
import { io as ioClient } from 'socket.io-client';
import sequelize from '../../src/config/database.js';
import { User } from '../../src/models/index.js';
import { initializeSocket } from '../../src/utils/socketManager.js';
import { createTenant, makeFactory } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f;
let server;
let port;
const PASSWORD = 'motdepasse-test';

before(async () => {
  f = makeFactory(await createTenant());
  server = http.createServer(app);
  initializeSocket(server);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  port = server.address().port;
});
after(async () => {
  await new Promise((r) => server.close(r));
  await sequelize.close();
});

const host = () => f.tenant.domain;
const bearer = (t) => ({ Host: host(), Authorization: `Bearer ${t}` });
const login = (user) => request(app).post('/api/auth/login').set('Host', host()).send({ username: user.username, password: PASSWORD });
const profile = (t) => request(app).get('/api/auth/profile').set(bearer(t));

async function totpUser(attrs = {}) {
  const secret = speakeasy.generateSecret({ length: 20 }).base32;
  return f.user({ totpEnabled: true, totpSecret: secret, ...attrs });
}

// Connexion temps réel : résout 'ok' si acceptée, 'refused' sinon
function socketConnect(token) {
  return new Promise((resolve) => {
    const s = ioClient(`http://127.0.0.1:${port}`, { auth: { token }, transports: ['websocket'], reconnection: false, timeout: 4000 });
    s.on('connect', () => { s.close(); resolve('ok'); });
    s.on('connect_error', () => { s.close(); resolve('refused'); });
  });
}

test('jeton provisoire 2FA : refusé par l\'API', async () => {
  const u = await totpUser();
  const res = await login(u);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.ok(res.body.requires2FA || res.body.tempToken, 'la connexion demande le 2e facteur');
  const temp = res.body.tempToken;
  assert.ok(temp);
  assert.equal((await profile(temp)).status, 401);
});

test('jeton provisoire 2FA : refusé par le super-admin', async () => {
  const su = await totpUser({ role: 'superadmin' });
  const temp = (await login(su)).body.tempToken;
  const res = await request(app).get('/api/super-admin/stats').set({ Authorization: `Bearer ${temp}` });
  assert.ok([401, 403].includes(res.status), `statut ${res.status}`);
});

test('jeton provisoire 2FA : refusé par le temps réel', async () => {
  const u = await totpUser();
  const temp = (await login(u)).body.tempToken;
  assert.equal(await socketConnect(temp), 'refused');
});

test('2FA complète : la vraie session fonctionne (API et temps réel)', async () => {
  const u = await totpUser();
  const temp = (await login(u)).body.tempToken;
  const code = speakeasy.totp({ secret: u.totpSecret, encoding: 'base32' });
  const res = await request(app).post('/api/auth/2fa/verify-login').set('Host', host()).send({ tempToken: temp, code });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal((await profile(res.body.token)).status, 200);
  assert.equal(await socketConnect(res.body.token), 'ok');
});

test('compte désactivé : ses jetons sont refusés (API et temps réel)', async () => {
  const u = await f.user();
  const token = (await login(u)).body.token;
  assert.equal((await profile(token)).status, 200);
  await f.run(() => User.update({ isActive: false }, { where: { id: u.id } }));
  assert.equal((await profile(token)).status, 401);
  assert.equal(await socketConnect(token), 'refused');
});

test('désactivation par un administrateur : sessions révoquées, même après réactivation', async () => {
  const admin = await f.user({ role: 'admin' });
  const u = await f.user();
  const adminToken = (await login(admin)).body.token;
  const token = (await login(u)).body.token;
  const off = await request(app).put(`/api/users/${u.id}`).set(bearer(adminToken)).send({ isActive: false });
  assert.equal(off.status, 200, JSON.stringify(off.body));
  assert.equal((await profile(token)).status, 401);
  await request(app).put(`/api/users/${u.id}`).set(bearer(adminToken)).send({ isActive: true });
  assert.equal((await profile(token)).status, 401, 'l\'ancien jeton reste révoqué');
  assert.equal((await profile((await login(u)).body.token)).status, 200, 'une nouvelle connexion fonctionne');
});

test('réinitialisation du mot de passe par un administrateur : anciennes sessions révoquées', async () => {
  const admin = await f.user({ role: 'admin' });
  const u = await f.user();
  const adminToken = (await login(admin)).body.token;
  const token = (await login(u)).body.token;
  const res = await request(app).post(`/api/users/${u.id}/reset-password`).set(bearer(adminToken)).send({ newPassword: 'nouveau-mdp-123' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal((await profile(token)).status, 401);
  assert.equal((await profile(adminToken)).status, 200, 'la session de l\'administrateur n\'est pas touchée');
});

test('changement de son propre mot de passe : nouveau jeton rendu, l\'ancien est révoqué', async () => {
  const admin = await f.user({ role: 'admin' });
  const token = (await login(admin)).body.token;
  const res = await request(app).post(`/api/users/${admin.id}/reset-password`).set(bearer(token)).send({ newPassword: 'nouveau-mdp-456' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.ok(res.body.token, 'un nouveau jeton est rendu à l\'appelant');
  assert.equal((await profile(token)).status, 401);
  assert.equal((await profile(res.body.token)).status, 200);
});

test('profil : changement de mot de passe avec l\'ancien → nouveau jeton, l\'ancien révoqué', async () => {
  const u = await f.user();
  const token = (await login(u)).body.token;
  const res = await request(app).put('/api/auth/profile').set(bearer(token)).send({ currentPassword: PASSWORD, newPassword: 'nouveau-mdp-789' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.ok(res.body.token);
  assert.equal((await profile(token)).status, 401);
  assert.equal((await profile(res.body.token)).status, 200);
});

test('compatibilité : un jeton émis avant ce correctif (sans type ni version) reste valable', async () => {
  const u = await f.user();
  const legacy = jwt.sign({ id: u.id, email: u.email, role: u.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
  assert.equal((await profile(legacy)).status, 200);
  assert.equal(await socketConnect(legacy), 'ok');
});

test('jeton signé avec un autre algorithme : refusé', async () => {
  const u = await f.user();
  const hs512 = jwt.sign({ id: u.id, type: 'session', tv: 0 }, process.env.JWT_SECRET, { algorithm: 'HS512', expiresIn: '1h' });
  assert.equal((await profile(hs512)).status, 401);
});
