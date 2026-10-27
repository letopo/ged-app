// « Rester connecté sur cet appareil » :
//  - sans la case : session de sessionMaxDays jours (7 par défaut), déconnexion
//    après inactivité côté navigateur ;
//  - avec la case : session de rememberMeDays jours (30 par défaut), marquée
//    rem (le navigateur ne déconnecte pas pour inactivité) ;
//  - rememberMeDays = 0 : l'option est désactivée par l'administrateur ;
//  - le choix traverse la 2FA et le changement de mot de passe ;
//  - « Déconnecter mes autres appareils » révoque les autres sessions.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import speakeasy from 'speakeasy';
import sequelize from '../../src/config/database.js';
import { invalidateTenantSettings } from '../../src/utils/tenantSettings.js';
import { createTenant, makeFactory } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f;
const PASSWORD = 'motdepasse-test';
const DAY = 86400;

before(async () => { f = makeFactory(await createTenant()); });
after(async () => { await sequelize.close(); });

const host = () => f.tenant.domain;
const bearer = (t) => ({ Host: host(), Authorization: `Bearer ${t}` });
const login = (user, extra = {}) => request(app).post('/api/auth/login').set('Host', host()).send({ username: user.username, password: PASSWORD, ...extra });
const profile = (t) => request(app).get('/api/auth/profile').set(bearer(t));
const lifetimeDays = (token) => { const { iat, exp } = jwt.decode(token); return Math.round((exp - iat) / DAY); };
const settings = async (attrs) => { await f.settings(attrs); invalidateTenantSettings(f.tenant.id); };

test('sans la case : session normale, sans marque rem', async () => {
  await settings({ sessionMaxDays: 7, rememberMeDays: 30 });
  const res = await login(await f.user());
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(lifetimeDays(res.body.token), 7);
  assert.equal(jwt.decode(res.body.token).rem, undefined);
});

test('avec la case : session longue marquée rem', async () => {
  await settings({ sessionMaxDays: 7, rememberMeDays: 30 });
  const res = await login(await f.user(), { remember: true });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(lifetimeDays(res.body.token), 30);
  assert.equal(jwt.decode(res.body.token).rem, true);
  assert.equal((await profile(res.body.token)).status, 200);
});

test('valeur autre que true : ignorée', async () => {
  await settings({ sessionMaxDays: 7, rememberMeDays: 30 });
  const res = await login(await f.user(), { remember: 'oui' });
  assert.equal(lifetimeDays(res.body.token), 7);
  assert.equal(jwt.decode(res.body.token).rem, undefined);
});

test('option désactivée (0 jour) : session normale même avec la case', async () => {
  await settings({ sessionMaxDays: 7, rememberMeDays: 0 });
  const res = await login(await f.user(), { remember: true });
  assert.equal(lifetimeDays(res.body.token), 7);
  assert.equal(jwt.decode(res.body.token).rem, undefined);
  await settings({ rememberMeDays: 30 });
});

test('durée réglée par l\'administrateur (bornes 0 à 90)', async () => {
  const admin = await f.user({ role: 'admin' });
  const token = (await login(admin)).body.token;
  const ok = await request(app).put('/api/tenant-settings').set(bearer(token)).send({ rememberMeDays: 60 });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.equal(ok.body.settings.rememberMeDays, 60);
  const res = await login(await f.user(), { remember: true });
  assert.equal(lifetimeDays(res.body.token), 60);
  const tooLong = await request(app).put('/api/tenant-settings').set(bearer(token)).send({ rememberMeDays: 91 });
  assert.equal(tooLong.status, 400);
  await settings({ rememberMeDays: 30 });
});

test('2FA : le choix est conservé jusqu\'à la vraie session', async () => {
  await settings({ sessionMaxDays: 7, rememberMeDays: 30 });
  const secret = speakeasy.generateSecret({ length: 20 }).base32;
  const u = await f.user({ totpEnabled: true, totpSecret: secret });
  const temp = (await login(u, { remember: true })).body.tempToken;
  assert.ok(temp);
  const code = speakeasy.totp({ secret, encoding: 'base32' });
  const res = await request(app).post('/api/auth/2fa/verify-login').set('Host', host()).send({ tempToken: temp, code });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(lifetimeDays(res.body.token), 30);
  assert.equal(jwt.decode(res.body.token).rem, true);
});

test('changement de mot de passe : la session de cet appareil reste longue', async () => {
  await settings({ sessionMaxDays: 7, rememberMeDays: 30 });
  const u = await f.user();
  const token = (await login(u, { remember: true })).body.token;
  const res = await request(app).put('/api/auth/profile').set(bearer(token)).send({ currentPassword: PASSWORD, newPassword: 'nouveau-mdp-789' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(jwt.decode(res.body.token).rem, true);
  assert.equal(lifetimeDays(res.body.token), 30);
});

test('déconnecter mes autres appareils : les autres sessions tombent, celle-ci continue', async () => {
  await settings({ sessionMaxDays: 7, rememberMeDays: 30 });
  const u = await f.user();
  const phone = (await login(u, { remember: true })).body.token;
  const office = (await login(u, { remember: true })).body.token;
  const res = await request(app).post('/api/auth/logout-others').set(bearer(office));
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal((await profile(phone)).status, 401, 'l\'autre appareil est déconnecté');
  assert.equal((await profile(office)).status, 401, 'l\'ancien jeton de cet appareil est remplacé');
  assert.equal((await profile(res.body.token)).status, 200);
  assert.equal(jwt.decode(res.body.token).rem, true);
});

test('déconnecter mes autres appareils : connexion requise', async () => {
  const res = await request(app).post('/api/auth/logout-others').set('Host', host());
  assert.equal(res.status, 401);
});
