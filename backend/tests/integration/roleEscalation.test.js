// Rôle super-admin (audit sécurité run-1, piste 1) : un administrateur
// d'établissement ne peut ni s'attribuer ni attribuer le rôle super-admin,
// ni modifier, réinitialiser ou supprimer un compte super-admin.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import sequelize from '../../src/config/database.js';
import { User } from '../../src/models/index.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f;
let admin;
let superadmin;
let plain;

before(async () => {
  f = makeFactory(await createTenant());
  [admin, superadmin, plain] = await Promise.all([f.user({ role: 'admin' }), f.user({ role: 'superadmin' }), f.user()]);
});
after(() => sequelize.close());

const as = (user) => authHeaders(f.tenant, user);
const roleOf = async (id) => (await f.run(() => User.findByPk(id))).role;

test('un administrateur ne peut pas se donner le rôle super-admin', async () => {
  const res = await request(app).put(`/api/users/${admin.id}`).set(as(admin)).send({ role: 'superadmin' });
  assert.equal(res.status, 403, JSON.stringify(res.body));
  assert.equal(await roleOf(admin.id), 'admin');
  const sa = await request(app).get('/api/super-admin/tenants').set({ Authorization: as(admin).Authorization });
  assert.equal(sa.status, 403);
});

test('un administrateur ne peut pas donner le rôle super-admin à un autre', async () => {
  const res = await request(app).put(`/api/users/${plain.id}`).set(as(admin)).send({ role: 'superadmin' });
  assert.equal(res.status, 403);
  assert.equal(await roleOf(plain.id), 'user');
});

test('un administrateur ne peut pas créer un compte super-admin', async () => {
  const res = await request(app).post('/api/users').set(as(admin)).send({
    email: 'escalade@test.local', username: 'escalade', password: 'motdepasse-test', firstName: 'X', lastName: 'Y', role: 'superadmin',
  });
  assert.equal(res.status, 403);
  assert.equal(await f.run(() => User.count({ where: { username: 'escalade' } })), 0);
});

test('rôle inconnu refusé', async () => {
  const res = await request(app).put(`/api/users/${plain.id}`).set(as(admin)).send({ role: 'pirate' });
  assert.equal(res.status, 400);
});

test('un administrateur attribue toujours les rôles ordinaires', async () => {
  const res = await request(app).put(`/api/users/${plain.id}`).set(as(admin)).send({ role: 'director' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(await roleOf(plain.id), 'director');
  await request(app).put(`/api/users/${plain.id}`).set(as(admin)).send({ role: 'user' });
});

test('un super-admin peut attribuer le rôle super-admin', async () => {
  const u = await f.user();
  const res = await request(app).put(`/api/users/${u.id}`).set(as(superadmin)).send({ role: 'superadmin' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(await roleOf(u.id), 'superadmin');
});

test('un administrateur ne peut pas toucher un compte super-admin', async () => {
  const put = await request(app).put(`/api/users/${superadmin.id}`).set(as(admin)).send({ email: 'pris@test.local' });
  assert.equal(put.status, 403, 'modification');
  const reset = await request(app).post(`/api/users/${superadmin.id}/reset-password`).set(as(admin)).send({ newPassword: 'nouveau-mdp-123' });
  assert.equal(reset.status, 403, 'réinitialisation du mot de passe');
  const stamp = await request(app).put(`/api/users/${superadmin.id}/stamp-size`).set(as(admin)).send({ stampWidthMm: 50, stampHeightMm: 20 });
  assert.equal(stamp.status, 403, 'taille du cachet');
  const del = await request(app).delete(`/api/users/${superadmin.id}`).set(as(admin));
  assert.equal(del.status, 403, 'suppression');
  const still = await f.run(() => User.findByPk(superadmin.id));
  assert.ok(still, 'le compte super-admin existe toujours');
  assert.notEqual(still.email, 'pris@test.local');
});

test('un administrateur gère toujours les comptes ordinaires', async () => {
  const u = await f.user();
  const reset = await request(app).post(`/api/users/${u.id}/reset-password`).set(as(admin)).send({ newPassword: 'nouveau-mdp-123' });
  assert.equal(reset.status, 200);
  const del = await request(app).delete(`/api/users/${u.id}`).set(as(admin));
  assert.equal(del.status, 200);
});
