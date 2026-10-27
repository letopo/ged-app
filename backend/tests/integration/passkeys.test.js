// Connexion sans mot de passe (passkeys / WebAuthn), avec un appareil logiciel :
//  - facultative : le mot de passe reste valable après activation ;
//  - enregistrer cet appareil (connecté), puis se connecter sans identifiant ;
//  - « Rester connecté » respecté ; la 2FA par code n'est pas redemandée ;
//  - refus : appareil retiré, autre établissement, compte désactivé, défi
//    rejoué ou expiré, personne non vérifiée par l'appareil, adresse IP.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import speakeasy from 'speakeasy';
import sequelize from '../../src/config/database.js';
import { User } from '../../src/models/index.js';
import { createTenant, makeFactory } from '../helpers/fixtures.js';
import { createSoftAuthenticator } from '../helpers/softAuthenticator.js';

const { default: app } = await import('../../src/server.js');

let f;
let other;
const PASSWORD = 'motdepasse-test';

before(async () => {
  // Domaine sous hsjmcam.net : origine acceptée par CORS, comme en production
  f = makeFactory(await createTenant({ domainSuffix: 'hsjmcam.net' }));
  other = makeFactory(await createTenant({ domainSuffix: 'hsjmcam.net' }));
});
after(async () => { await sequelize.close(); });

const site = (fx = f) => ({ Host: fx.tenant.domain, Origin: `https://${fx.tenant.domain}` });
const login = async (user, fx = f) => (await request(app).post('/api/auth/login').set(site(fx)).send({ username: user.username, password: PASSWORD })).body.token;
const authed = (token, fx = f) => ({ ...site(fx), Authorization: `Bearer ${token}` });

async function enroll(user, device, fx = f) {
  const token = await login(user, fx);
  const opts = await request(app).post('/api/auth/passkeys/register/options').set(authed(token, fx));
  assert.equal(opts.status, 200, JSON.stringify(opts.body));
  const res = await request(app).post('/api/auth/passkeys/register/verify').set(authed(token, fx))
    .send({ challengeId: opts.body.challengeId, response: device.register(opts.body.options, `https://${fx.tenant.domain}`) });
  return { token, res };
}

async function passkeyLogin(device, { fx = f, remember, tamper } = {}) {
  const opts = await request(app).post('/api/auth/passkeys/login/options').set(site(fx));
  assert.equal(opts.status, 200, JSON.stringify(opts.body));
  const response = device.authenticate(opts.body.options, `https://${fx.tenant.domain}`);
  const body = { challengeId: opts.body.challengeId, response, remember };
  if (tamper) tamper(body, opts.body);
  return request(app).post('/api/auth/passkeys/login/verify').set(site(fx)).send(body);
}

test('activer puis se connecter sans mot de passe', async () => {
  const u = await f.user();
  const device = createSoftAuthenticator();
  const { token, res } = await enroll(u, device);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const list = await request(app).get('/api/auth/passkeys').set(authed(token));
  assert.equal(list.body.passkeys.length, 1);

  const login2 = await passkeyLogin(device);
  assert.equal(login2.status, 200, JSON.stringify(login2.body));
  assert.equal(login2.body.user.id, u.id);
  assert.equal(login2.body.user.password, undefined);
  assert.equal((await request(app).get('/api/auth/profile').set(authed(login2.body.token))).status, 200);
});

test('facultatif : le mot de passe fonctionne toujours', async () => {
  const u = await f.user();
  await enroll(u, createSoftAuthenticator());
  assert.ok(await login(u));
});

test('« Rester connecté » respecté', async () => {
  const u = await f.user();
  const device = createSoftAuthenticator();
  await enroll(u, device);
  const res = await passkeyLogin(device, { remember: true });
  assert.equal(jwt.decode(res.body.token).rem, true);
});

test('2FA activée : l\'empreinte / le code PIN de l\'appareil suffisent', async () => {
  const secret = speakeasy.generateSecret({ length: 20 }).base32;
  const u = await f.user({ totpEnabled: true, totpSecret: secret });
  // Connexion par mot de passe + code pour enregistrer l'appareil
  const temp = (await request(app).post('/api/auth/login').set(site()).send({ username: u.username, password: PASSWORD })).body.tempToken;
  const token = (await request(app).post('/api/auth/2fa/verify-login').set(site()).send({ tempToken: temp, code: speakeasy.totp({ secret, encoding: 'base32' }) })).body.token;
  const device = createSoftAuthenticator();
  const opts = await request(app).post('/api/auth/passkeys/register/options').set(authed(token));
  await request(app).post('/api/auth/passkeys/register/verify').set(authed(token)).send({ challengeId: opts.body.challengeId, response: device.register(opts.body.options, `https://${f.tenant.domain}`) });
  const res = await passkeyLogin(device);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.ok(res.body.token);
  assert.equal(res.body.requires2FA, undefined);
});

test('appareil retiré : connexion refusée', async () => {
  const u = await f.user();
  const device = createSoftAuthenticator();
  const { token } = await enroll(u, device);
  const id = (await request(app).get('/api/auth/passkeys').set(authed(token))).body.passkeys[0].id;
  assert.equal((await request(app).delete(`/api/auth/passkeys/${id}`).set(authed(token))).status, 200);
  assert.equal((await passkeyLogin(device)).status, 401);
});

test('on ne retire pas l\'appareil d\'un autre compte', async () => {
  const a = await f.user();
  const b = await f.user();
  const { token: tokenB } = await enroll(b, createSoftAuthenticator());
  const idB = (await request(app).get('/api/auth/passkeys').set(authed(tokenB))).body.passkeys[0].id;
  const tokenA = await login(a);
  assert.equal((await request(app).delete(`/api/auth/passkeys/${idB}`).set(authed(tokenA))).status, 404);
  assert.equal((await request(app).delete('/api/auth/passkeys/pas-un-uuid').set(authed(tokenA))).status, 404);
});

test('compte d\'un autre établissement : refusé', async () => {
  const u = await f.user();
  const device = createSoftAuthenticator();
  await enroll(u, device);
  assert.equal((await passkeyLogin(device, { fx: other })).status, 401);
});

test('compte désactivé : refusé', async () => {
  const u = await f.user();
  const device = createSoftAuthenticator();
  await enroll(u, device);
  await f.run(() => User.update({ isActive: false }, { where: { id: u.id } }));
  assert.equal((await passkeyLogin(device)).status, 403);
});

test('défi rejoué : refusé', async () => {
  const u = await f.user();
  const device = createSoftAuthenticator();
  await enroll(u, device);
  let replay;
  const first = await passkeyLogin(device, { tamper: (body) => { replay = structuredClone(body); } });
  assert.equal(first.status, 200);
  const again = await request(app).post('/api/auth/passkeys/login/verify').set(site()).send(replay);
  assert.equal(again.status, 400);
});

test('signature d\'un autre appareil : refusée', async () => {
  const u = await f.user();
  const device = createSoftAuthenticator();
  await enroll(u, device);
  const impostor = createSoftAuthenticator();
  const res = await passkeyLogin(impostor, { tamper: (body) => { body.response.id = device.credentialId; body.response.rawId = device.credentialId; } });
  assert.equal(res.status, 401);
});

test('personne non vérifiée par l\'appareil (ni empreinte ni PIN) : refusé', async () => {
  const u = await f.user();
  const noUv = createSoftAuthenticator({ userVerified: false });
  const { res } = await enroll(u, noUv);
  assert.equal(res.status, 400, 'enregistrement refusé');
});

test('GED ouverte par une adresse IP : refus explicite', async () => {
  // Comme en production : l'IP du serveur est un domaine secondaire de l'établissement
  const ip = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250) + 1}`;
  await f.tenant.update({ additionalDomains: ip });
  const res = await request(app).post('/api/auth/passkeys/login/options').set({ Host: ip, Origin: `https://${ip}` });
  assert.equal(res.status, 400);
  assert.equal(res.body.code, 'PASSKEY_NEEDS_DOMAIN');
});

test('origine d\'un autre site : refusée', async () => {
  // Bloquée par CORS avant même la route ; sinon par la vérification de l'origine
  const res = await request(app).post('/api/auth/passkeys/login/options').set({ Host: f.tenant.domain, Origin: 'https://site-pirate.example' });
  assert.ok(res.status >= 400, `statut ${res.status}`);
  assert.equal(res.body.options, undefined);
});

test('enregistrer un appareil : connexion requise', async () => {
  assert.equal((await request(app).post('/api/auth/passkeys/register/options').set(site())).status, 401);
});

test('origine d\'un autre établissement (acceptée par CORS) : refusée par la vérification', async () => {
  const res = await request(app).post('/api/auth/passkeys/login/options').set({ Host: f.tenant.domain, Origin: `https://${other.tenant.domain}` });
  assert.equal(res.status, 400);
  assert.equal(res.body.code, 'PASSKEY_BAD_ORIGIN');
});
