// Planning du week-end (18/11/2026) : un planning par week-end choisi, plusieurs
// dans le même mois ; le même week-end ne peut pas être créé deux fois.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import sequelize from '../../src/config/database.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f; let admin;
const creer = (startDate, endDate, scheduleType = 'weekend') => request(app).post('/api/schedules').set(authHeaders(f.tenant, admin))
  .send({ title: `Planning ${startDate}`, scheduleType, month: 11, year: 2031, startDate, endDate });

before(async () => {
  f = makeFactory(await createTenant());
  admin = await f.user({ role: 'admin' });
});
after(async () => { await sequelize.close(); });

test('deux week-ends du même mois : deux plannings', async () => {
  const a = await creer('2031-11-01', '2031-11-02');
  assert.equal(a.status, 201, JSON.stringify(a.body));
  const b = await creer('2031-11-08', '2031-11-09');
  assert.equal(b.status, 201, JSON.stringify(b.body));
});

test('le même week-end deux fois : refusé', async () => {
  const res = await creer('2031-11-08', '2031-11-09');
  assert.equal(res.status, 400);
});

test('autres plannings : toujours un seul par mois', async () => {
  assert.equal((await creer('2031-11-01', '2031-11-30', 'administrative')).status, 201);
  assert.equal((await creer('2031-11-01', '2031-11-30', 'administrative')).status, 400);
});
