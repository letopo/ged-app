// Modules activables par tenant (config/modules.js) : un module coupé ne répond
// plus côté serveur ; l'admin ne gère que les modules autorisés par sa licence,
// le superadmin peut tout accorder.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import sequelize from '../../src/config/database.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';
import { signSessionToken } from '../../src/utils/sessionTokens.js';

const { default: app } = await import('../../src/server.js');

let f, nu, admin, agent, superadmin, nuAdmin;
const as = (factory, user) => authHeaders(factory.tenant, user);
// Routes super-admin : jeton de session complet (type: 'session'), comme après une vraie connexion
const asSession = (factory, user) => ({ Host: factory.tenant.domain, Authorization: `Bearer ${signSessionToken(user, '1h')}` });

before(async () => {
  f = makeFactory(await createTenant());
  admin = await f.user({ role: 'admin' });
  agent = await f.user();
  superadmin = await f.user({ role: 'superadmin' });
  // Nouvel établissement : ni licence ni module accordé
  nu = makeFactory(await createTenant({ modules: [] }));
  nuAdmin = await nu.user({ role: 'admin' });
});
after(async () => { await sequelize.close(); });

test('établissement existant : tout est actif, la liste est dans le profil', async () => {
  const r = await request(app).get('/api/auth/profile').set(as(f, admin));
  assert.equal(r.status, 200);
  for (const k of ['sage', 'caisse_pharmacie', 'vehicules', 'trello']) assert.ok(r.body.user.modules.includes(k), k);
});

test('couper Sage : routes Sage et Caisse pharmacie refusées (403 MODULE_DISABLED), réactivation', async () => {
  const off = await request(app).put('/api/modules/sage').set(as(f, admin)).send({ enabled: false });
  assert.equal(off.status, 200, off.body?.message);
  assert.match(off.body.message, /Caisse pharmacie/);
  for (const url of ['/api/sage-bl/access', '/api/sage-factures', '/api/sage-bons-commande', '/api/caisse-pharmacie/permanence']) {
    const r = await request(app).get(url).set(as(f, admin));
    assert.equal(r.status, 403, url);
    assert.equal(r.body.code, 'MODULE_DISABLED', url);
  }
  // Prérequis : Caisse pharmacie ne se rallume pas sans Sage
  const dep = await request(app).put('/api/modules/caisse_pharmacie').set(as(f, admin)).send({ enabled: true });
  assert.equal(dep.status, 400);

  const on = await request(app).put('/api/modules/sage').set(as(f, admin)).send({ enabled: true });
  assert.equal(on.status, 200);
  const r = await request(app).get('/api/sage-factures').set(as(f, admin));
  assert.notEqual(r.status, 403);
});

test('droits : un utilisateur ne modifie rien, un admin n’accorde pas hors licence', async () => {
  const u = await request(app).put('/api/modules/vehicules').set(as(f, agent)).send({ enabled: false });
  assert.equal(u.status, 403);
  const g = await request(app).put('/api/modules/vehicules').set(as(f, admin)).send({ granted: true });
  assert.equal(g.status, 403);
  const sa = await request(app).get(`/api/super-admin/tenants/${nu.tenant.id}/modules`).set(asSession(f, admin));
  assert.equal(sa.status, 403);
});

test('nouvel établissement sans licence : modules verrouillés, le superadmin peut les accorder', async () => {
  const v = await request(app).get('/api/vehicles').set(as(nu, nuAdmin));
  assert.equal(v.status, 403);
  assert.equal(v.body.code, 'MODULE_DISABLED');

  const refuse = await request(app).put('/api/modules/vehicules').set(as(nu, nuAdmin)).send({ enabled: true });
  assert.equal(refuse.status, 403);
  assert.equal(refuse.body.code, 'MODULE_NOT_LICENSED');

  const grant = await request(app).put(`/api/super-admin/tenants/${nu.tenant.id}/modules/vehicules`)
    .set(asSession(f, superadmin)).send({ enabled: true });
  assert.equal(grant.status, 200, grant.body?.message);
  const mod = grant.body.modules.find(m => m.key === 'vehicules');
  assert.equal(mod.granted, true);
  assert.equal(mod.active, true);

  const ok = await request(app).get('/api/vehicles').set(as(nu, nuAdmin));
  assert.notEqual(ok.status, 403);
});

test('étape 2 : PHP, Bloc, GMAO et Demandes d’achat coupés → 403 MODULE_DISABLED, puis réactivés', async () => {
  const cas = { php: '/api/php/patients', bloc: '/api/bloc/me', gmao: '/api/gmao/equipements', achats: '/api/demande-achat' };
  for (const [key, url] of Object.entries(cas)) {
    const off = await request(app).put(`/api/modules/${key}`).set(as(f, admin)).send({ enabled: false });
    assert.equal(off.status, 200, `${key} : ${off.body?.message}`);
    const r = await request(app).get(url).set(as(f, admin));
    assert.equal(r.status, 403, url);
    assert.equal(r.body.code, 'MODULE_DISABLED', url);
    const on = await request(app).put(`/api/modules/${key}`).set(as(f, admin)).send({ enabled: true });
    assert.equal(on.status, 200);
    const back = await request(app).get(url).set(as(f, admin));
    assert.notEqual(back.body?.code, 'MODULE_DISABLED', url);
  }
});
