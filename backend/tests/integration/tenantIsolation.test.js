// Isolation entre établissements : dans le contexte d'un établissement, les
// lectures, comptages et modifications / suppressions en masse ne touchent
// que ses propres lignes (hooks globaux de config/database.js).
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Op } from 'sequelize';
import request from 'supertest';
import sequelize, { tenantNamespace } from '../../src/config/database.js';
import { Document, User } from '../../src/models/index.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let A;
let B;
let userA;
let userB;
let adminB;
let docA;
let docB;

before(async () => {
  A = makeFactory(await createTenant());
  B = makeFactory(await createTenant());
  [userA, userB, adminB] = await Promise.all([A.user({ role: 'admin' }), B.user(), B.user({ role: 'admin' })]);
  docA = await A.document(userA, { title: 'Secret A' });
  docB = await B.document(userB, { title: 'Doc B' });
});
after(() => sequelize.close());

test('lecture : findAll / findOne / findByPk restent dans l\'établissement', async () => {
  await B.run(async () => {
    const all = await Document.findAll({ where: { id: [docA.id, docB.id] } });
    assert.deepEqual(all.map((d) => d.id), [docB.id]);
    assert.equal(await Document.findByPk(docA.id), null);
    assert.equal(await Document.findOne({ where: { title: 'Secret A' } }), null);
    assert.equal((await Document.findAll()).every((d) => d.tenantId === B.tenant.id), true);
  });
});
test('lecture : where complexe (Op.or, sequelize.where) aussi limité', async () => {
  await B.run(async () => {
    const rows = await Document.findAll({ where: { [Op.or]: [{ id: docA.id }, { id: docB.id }] } });
    assert.deepEqual(rows.map((d) => d.id), [docB.id]);
    const w = sequelize.where(sequelize.col('title'), { [Op.like]: '%' });
    const all = await Document.findAll({ where: w });
    assert.ok(all.length >= 1 && all.every((d) => d.tenantId === B.tenant.id));
  });
});
test('comptage et pagination : count / findAndCountAll limités', async () => {
  await B.run(async () => {
    assert.equal(await Document.count({ where: { id: [docA.id, docB.id] } }), 1);
    const { count, rows } = await Document.findAndCountAll({ where: { id: [docA.id, docB.id] } });
    assert.equal(count, 1);
    assert.equal(rows.length, 1);
  });
});
test('modification et suppression en masse : sans effet sur l\'autre établissement', async () => {
  await B.run(async () => {
    const [n] = await Document.update({ title: 'Piraté' }, { where: { id: [docA.id, docB.id] } });
    assert.equal(n, 1);
    await Document.destroy({ where: { id: docA.id }, force: true });
  });
  await A.run(async () => {
    const a = await Document.findByPk(docA.id);
    assert.ok(a, 'le document de A existe toujours');
    assert.equal(a.title, 'Secret A');
  });
});
test('création : le document prend l\'établissement courant', async () => {
  const d = await B.document(userB);
  assert.equal(d.tenantId, B.tenant.id);
});
test('tenantId explicite respecté (ex. super-admin)', async () => {
  await B.run(async () => {
    const rows = await Document.findAll({ where: { id: docA.id, tenantId: A.tenant.id } });
    assert.equal(rows.length, 1);
  });
});
test('hors contexte (tâches système, super-admin) : aucun filtre ajouté', async () => {
  await tenantNamespace.runPromise(async () => {
    tenantNamespace.set('tenantId', undefined); // comme une route super-admin
    const rows = await Document.findAll({ where: { id: [docA.id, docB.id] } });
    assert.equal(rows.length, 2);
  });
});
test('API : un compte de A ne s\'authentifie pas sur le domaine de B', async () => {
  const res = await request(app).get('/api/documents').set(authHeaders(B.tenant, userA));
  assert.equal(res.status, 401);
});
test('API : l\'administrateur de B n\'ouvre pas un document de A', async () => {
  const res = await request(app).get(`/api/documents/${docA.id}`).set(authHeaders(B.tenant, adminB));
  assert.equal(res.status, 404);
  const list = await request(app).get('/api/documents?limit=100').set(authHeaders(B.tenant, adminB));
  assert.equal(list.status, 200);
  const ids = JSON.stringify(list.body);
  assert.ok(!ids.includes(docA.id), 'le document de A n\'apparaît pas dans la liste de B');
});
test('utilisateurs : B ne voit pas les comptes de A', async () => {
  await B.run(async () => {
    assert.equal(await User.findByPk(userA.id), null);
    assert.equal(await User.count({ where: { id: userA.id } }), 0);
  });
});
