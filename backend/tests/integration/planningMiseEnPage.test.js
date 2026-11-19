// Planning mensuel au format papier (Moyens Généraux, 19/11/2026) : ordre des
// agents et lignes vides entre équipes, gardés avec le planning ; la soumission
// compte toujours les affectations (pas le programme du week-end).
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import request from 'supertest';
import sequelize from '../../src/config/database.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f; let admin; let planning;
const as = () => authHeaders(f.tenant, admin);

before(async () => {
  f = makeFactory(await createTenant());
  admin = await f.user({ role: 'admin' });
  const res = await request(app).post('/api/schedules').set(as())
    .send({ title: 'Planning MG', scheduleType: 'general_services', month: 4, year: 2033, startDate: '2033-04-01', endDate: '2033-04-30' });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  planning = res.body;
});
after(async () => { await sequelize.close(); });

test('ordre des agents et lignes vides : enregistrés, identifiants invalides écartés', async () => {
  const a = crypto.randomUUID(); const b = crypto.randomUUID();
  const res = await request(app).put(`/api/schedules/${planning.id}/mise-en-page`).set(as())
    .send({ ordre: [b, a, 'pas-un-id', b], separations: [b] });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.deepEqual(res.body.miseEnPage, { ordre: [b, a], separations: [b] });
  const lu = await request(app).get(`/api/schedules/${planning.id}`).set(as());
  assert.deepEqual(lu.body.content.miseEnPage.ordre, [b, a]);
});

test('la présentation ne remplace pas les affectations : planning vide toujours refusé à la soumission', async () => {
  const res = await request(app).post(`/api/schedules/${planning.id}/submit`).set(as());
  assert.equal(res.status, 400);
  assert.match(res.body.message, /affectation/);
});
