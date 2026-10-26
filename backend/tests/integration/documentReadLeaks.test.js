// Fuites en lecture autour des documents (audit sécurité run-1, pistes 14 et 16) :
// la miniature respecte le plafond de confidentialité par catégorie, et la liste
// des catégories ne mélange pas les établissements.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import sequelize from '../../src/config/database.js';
import { CategoryAccessRule } from '../../src/models/index.js';
import { invalidateCategoryRules } from '../../src/utils/categoryAccess.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f; let g;
let A; let B;

before(async () => {
  f = makeFactory(await createTenant());
  g = makeFactory(await createTenant());
  A = await f.user();
  B = await g.user();
});
after(() => sequelize.close());

test('miniature : refusée quand la catégorie est hors plafond, comme le document', async () => {
  await CategoryAccessRule.create({ tenantId: f.tenant.id, category: 'Confidentiel test', allowedPostes: ['direction'], includeParticipants: false });
  invalidateCategoryRules(f.tenant.id);
  const doc = await f.document(A, { category: 'Confidentiel test' });
  assert.equal((await request(app).get(`/api/documents/${doc.id}`).set(authHeaders(f.tenant, A))).status, 403, 'le document est refusé');
  assert.equal((await request(app).get(`/api/documents/${doc.id}/thumbnail`).set(authHeaders(f.tenant, A))).status, 403, 'la miniature aussi');
});

test('catégories : seulement celles de son établissement', async () => {
  const mine = `Catégorie A ${Date.now()}`;
  const theirs = `Catégorie B ${Date.now()}`;
  await f.document(A, { category: mine });
  await g.document(B, { category: theirs });
  const res = await request(app).get('/api/documents/categories').set(authHeaders(f.tenant, A));
  assert.equal(res.status, 200);
  assert.ok(res.body.data.includes(mine));
  assert.ok(!res.body.data.includes(theirs), 'pas de catégorie d\'un autre établissement');
});
