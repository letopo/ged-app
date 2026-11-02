// Module PHP (données médicales) : accès contrôlé par le serveur.
//  - utilisateur sans rôle ni poste : toutes les routes /api/php refusées ;
//  - poste « php_lecture » : lecture (patients, statistiques), pas de saisie ;
//  - poste « php » et rôle Point Focal PHP : lecture et saisie.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import sequelize from '../../src/config/database.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f, agent, lecteur, saisie, pointFocal;
const as = (user) => authHeaders(f.tenant, user);

before(async () => {
  f = makeFactory(await createTenant());
  [agent, lecteur, saisie] = await Promise.all([f.user(), f.user(), f.user()]);
  pointFocal = await f.user({ role: 'agent_accueil_php' });
  await f.poste('php_lecture', [lecteur]);
  await f.poste('php', [saisie]);
});
after(async () => {
  await f.dropPostes();
  await sequelize.close();
});

const READS = ['/api/php/patients', '/api/php/consultations', '/api/php/stats/dashboard', '/api/php/reference/infirmeries', '/api/php/rendez-vous', '/api/php/factures'];

test('sans accès au module : lectures et saisies refusées', async () => {
  for (const url of READS) assert.equal((await request(app).get(url).set(as(agent))).status, 403, url);
  assert.equal((await request(app).post('/api/php/patients').set(as(agent)).send({})).status, 403);
  assert.equal((await request(app).post('/api/php/rendez-vous').set(as(agent)).send({})).status, 403);
});

test('consultation seule (php_lecture) : lit, ne saisit pas', async () => {
  for (const url of READS) assert.equal((await request(app).get(url).set(as(lecteur))).status, 200, url);
  const r = await request(app).post('/api/php/patients').set(as(lecteur)).send({});
  assert.equal(r.status, 403);
  assert.match(r.body.message, /Consultation seule/);
  assert.equal((await request(app).post('/api/php/rendez-vous').set(as(lecteur)).send({})).status, 403);
  assert.equal((await request(app).post('/api/php/import-excel').set(as(lecteur))).status, 403);
});

test('poste php et rôle Point Focal : lecture et saisie', async () => {
  for (const u of [saisie, pointFocal]) {
    assert.equal((await request(app).get('/api/php/patients').set(as(u))).status, 200);
    const r = await request(app).post('/api/php/patients').set(as(u)).send({});
    assert.notEqual(r.status, 403, 'saisie autorisée (refus éventuel pour données incomplètes seulement)');
  }
});
