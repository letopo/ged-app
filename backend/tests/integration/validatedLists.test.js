// Listes d'OM et de DT en cours ou validés (audit sécurité run-1, piste 13) :
// elles obéissent aux mêmes règles d'accès que la liste des documents.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import sequelize from '../../src/config/database.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f;
let A; let B; let V; let admin;
let om; let dt;

before(async () => {
  f = makeFactory(await createTenant());
  [A, B, V, admin] = await Promise.all([f.user(), f.user(), f.user(), f.user({ role: 'admin' })]);
  om = await f.document(A, { category: 'Ordre de mission', status: 'approved', title: 'OM personnel de A' });
  dt = await f.document(A, { category: 'Demande de travaux', status: 'in_progress', title: 'DT personnelle de A' });
  await f.validator(om, V);
});
after(() => sequelize.close());

const ids = async (u, url) => {
  const res = await request(app).get(url).set(authHeaders(f.tenant, u));
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body.data.map((d) => d.id);
};

for (const [label, url, doc] of [['OM', '/api/documents/ordres-mission/valides', () => om], ['DT', '/api/documents/demandes-travaux/validees', () => dt]]) {
  test(`${label} : un utilisateur sans lien avec le document ne le voit pas`, async () => {
    assert.ok(!(await ids(B, url)).includes(doc().id));
  });
  test(`${label} : le propriétaire et l'administrateur le voient`, async () => {
    assert.ok((await ids(A, url)).includes(doc().id));
    assert.ok((await ids(admin, url)).includes(doc().id));
  });
}

test('OM : le validateur du circuit le voit', async () => {
  assert.ok((await ids(V, '/api/documents/ordres-mission/valides')).includes(om.id));
});
