// Poste « Finances » : ouvre Factures PHP (Sage) et BL PHP en attente, contrôlé
// par le serveur ; les autres utilisateurs restent refusés.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import sequelize from '../../src/config/database.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f, finances, agent, admin;
const as = (user) => authHeaders(f.tenant, user);

before(async () => {
  f = makeFactory(await createTenant());
  [finances, agent] = await Promise.all([f.user(), f.user()]);
  admin = await f.user({ role: 'admin' });
  await f.poste('finances', [finances]);
});
after(async () => {
  await f.dropPostes();
  await sequelize.close();
});

test('Factures PHP (Sage) : poste Finances et administrateurs, pas les autres', async () => {
  for (const u of [finances, admin]) {
    const r = await request(app).get('/api/sage-factures').set(as(u));
    assert.equal(r.status, 200, r.body?.message);
  }
  const r = await request(app).get('/api/sage-factures').set(as(agent));
  assert.equal(r.status, 403);
});

test('BL PHP en attente : poste Finances autorisé, sans réglage du superadmin', async () => {
  const yes = await request(app).get('/api/sage-bl/access').set(as(finances));
  assert.equal(yes.body.canAccess, true);
  assert.ok(!yes.body.allowed.includes('finances'), 'autorisé même hors de la liste réglable');
  const no = await request(app).get('/api/sage-bl/access').set(as(agent));
  assert.equal(no.body.canAccess, false);

  // Sans Sage configuré, la page répond une erreur de connexion, mais jamais 403 pour le poste Finances
  const s1 = await request(app).get('/api/sage-bl/summary').set(as(finances));
  assert.notEqual(s1.status, 403);
  const s2 = await request(app).get('/api/sage-bl/summary').set(as(agent));
  assert.equal(s2.status, 403);
});
