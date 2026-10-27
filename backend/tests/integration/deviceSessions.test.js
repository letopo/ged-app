// Appareils connectés (Paramètres › Sécurité) :
//  - chaque connexion devient un appareil (navigateur, système, IP, dates) ;
//  - on peut déconnecter un appareil précis, immédiatement (API et temps réel) ;
//  - on ne voit et ne déconnecte que ses propres appareils ;
//  - la déconnexion retire l'appareil ; changement de mot de passe et
//    « Déconnecter mes autres appareils » gardent l'appareil courant.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { io as ioClient } from 'socket.io-client';
import sequelize from '../../src/config/database.js';
import { initializeSocket } from '../../src/utils/socketManager.js';
import { createTenant, makeFactory } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f;
let server;
let port;
const PASSWORD = 'motdepasse-test';
const PHONE = 'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const OFFICE = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0';

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
const login = async (user, ua, extra = {}) => {
  const res = await request(app).post('/api/auth/login').set({ Host: host(), 'User-Agent': ua }).send({ username: user.username, password: PASSWORD, ...extra });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body.token;
};
const sessions = (t) => request(app).get('/api/auth/sessions').set(bearer(t));
const profile = (t) => request(app).get('/api/auth/profile').set(bearer(t));
const sid = (t) => jwt.decode(t).sid;

// Connexion temps réel ouverte ; résout quand le serveur la ferme
function openSocket(token) {
  return new Promise((resolve, reject) => {
    const s = ioClient(`http://127.0.0.1:${port}`, { auth: { token }, transports: ['websocket'], reconnection: false, timeout: 4000 });
    s.on('connect', () => resolve({ socket: s, closed: new Promise((r) => s.on('disconnect', r)) }));
    s.on('connect_error', reject);
  });
}

test('chaque connexion apparaît avec son appareil, l\'appareil courant est signalé', async () => {
  const u = await f.user();
  const phone = await login(u, PHONE, { remember: true });
  const office = await login(u, OFFICE);
  const res = await sessions(office);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.sessions.length, 2);
  const byId = Object.fromEntries(res.body.sessions.map((s) => [s.id, s]));
  assert.deepEqual(
    { browser: byId[sid(phone)].browser, os: byId[sid(phone)].os, type: byId[sid(phone)].type, remember: byId[sid(phone)].remember, current: byId[sid(phone)].current },
    { browser: 'Chrome', os: 'Android', type: 'mobile', remember: true, current: false },
  );
  assert.equal(byId[sid(office)].browser, 'Edge');
  assert.equal(byId[sid(office)].current, true);
  assert.ok(byId[sid(office)].ip, 'IP enregistrée');
  assert.ok(byId[sid(office)].createdAt && byId[sid(office)].lastSeenAt);
});

test('déconnecter un appareil : son jeton et son temps réel tombent, les autres continuent', async () => {
  const u = await f.user();
  const phone = await login(u, PHONE);
  const office = await login(u, OFFICE);
  const { closed } = await openSocket(phone);
  const res = await request(app).delete(`/api/auth/sessions/${sid(phone)}`).set(bearer(office));
  assert.equal(res.status, 200, JSON.stringify(res.body));
  await closed;
  assert.equal((await profile(phone)).status, 401);
  assert.equal((await profile(office)).status, 200);
  const list = (await sessions(office)).body.sessions.map((s) => s.id);
  assert.deepEqual(list, [sid(office)]);
});

test('on ne voit ni ne déconnecte les appareils d\'un autre compte', async () => {
  const a = await f.user();
  const b = await f.user();
  const tokenA = await login(a, OFFICE);
  const tokenB = await login(b, PHONE);
  assert.ok(!(await sessions(tokenA)).body.sessions.some((s) => s.id === sid(tokenB)));
  const res = await request(app).delete(`/api/auth/sessions/${sid(tokenB)}`).set(bearer(tokenA));
  assert.equal(res.status, 404);
  assert.equal((await profile(tokenB)).status, 200);
});

test('identifiant invalide : 404, pas d\'erreur serveur', async () => {
  const token = await login(await f.user(), OFFICE);
  const res = await request(app).delete('/api/auth/sessions/pas-un-uuid').set(bearer(token));
  assert.equal(res.status, 404);
});

test('déconnexion : l\'appareil quitte la liste et son jeton est refusé', async () => {
  const u = await f.user();
  const phone = await login(u, PHONE);
  const office = await login(u, OFFICE);
  const res = await request(app).post('/api/auth/logout').set(bearer(phone));
  assert.equal(res.status, 200);
  assert.equal((await profile(phone)).status, 401);
  assert.deepEqual((await sessions(office)).body.sessions.map((s) => s.id), [sid(office)]);
});

test('déconnexion sans jeton ou avec un jeton invalide : toujours acceptée', async () => {
  assert.equal((await request(app).post('/api/auth/logout').set('Host', host())).status, 200);
  assert.equal((await request(app).post('/api/auth/logout').set(bearer('n-importe-quoi'))).status, 200);
});

test('changement de mot de passe : cet appareil reste dans la liste, les autres en sortent', async () => {
  const u = await f.user();
  const phone = await login(u, PHONE);
  const office = await login(u, OFFICE);
  const res = await request(app).put('/api/auth/profile').set(bearer(office)).send({ currentPassword: PASSWORD, newPassword: 'nouveau-mdp-789' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(sid(res.body.token), sid(office), 'même appareil');
  assert.equal((await profile(phone)).status, 401);
  assert.deepEqual((await sessions(res.body.token)).body.sessions.map((s) => s.id), [sid(office)]);
});

test('déconnecter mes autres appareils : seul cet appareil reste', async () => {
  const u = await f.user();
  await login(u, PHONE);
  const office = await login(u, OFFICE);
  const res = await request(app).post('/api/auth/logout-others').set(bearer(office));
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(sid(res.body.token), sid(office));
  assert.deepEqual((await sessions(res.body.token)).body.sessions.map((s) => s.id), [sid(office)]);
});

test('jeton émis avant les appareils connectés (sans sid) : encore accepté', async () => {
  const u = await f.user();
  const legacy = jwt.sign({ id: u.id, email: u.email, role: u.role, type: 'session', tv: 0 }, process.env.JWT_SECRET, { expiresIn: '1d', algorithm: 'HS256' });
  assert.equal((await profile(legacy)).status, 200);
  const res = await sessions(legacy);
  assert.equal(res.status, 200);
  assert.equal(res.body.currentKnown, false);
});
