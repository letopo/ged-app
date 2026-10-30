// Factures (dossiers de factures fournisseurs) : réservées aux administrateurs et
// à la direction, contrôlé par le serveur. Avant, seule la connexion était
// vérifiée : tout utilisateur pouvait lister les factures et déplacer des documents.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import sequelize from '../../src/config/database.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f, agent, validator, director, admin;
const as = (user) => authHeaders(f.tenant, user);

before(async () => {
  f = makeFactory(await createTenant());
  agent = await f.user();
  validator = await f.user({ role: 'validator' });
  director = await f.user({ role: 'director' });
  admin = await f.user({ role: 'admin' });
});
after(async () => {
  await sequelize.close();
});

test('utilisateurs sans rôle de direction : toutes les routes refusées', async () => {
  for (const u of [agent, validator]) {
    assert.equal((await request(app).get('/api/invoices/board').set(as(u))).status, 403);
    assert.equal((await request(app).post('/api/invoices/folders').set(as(u)).send({ name: 'Intrus' })).status, 403);
    assert.equal((await request(app).put('/api/invoices/folders/00000000-0000-0000-0000-000000000000').set(as(u)).send({ name: 'x' })).status, 403);
    assert.equal((await request(app).delete('/api/invoices/folders/00000000-0000-0000-0000-000000000000').set(as(u))).status, 403);
    assert.equal((await request(app).post('/api/invoices/move-document').set(as(u)).send({ documentId: 'x', targetFolderId: null })).status, 403);
  }
});

test('direction et administrateurs : accès au tableau des factures', async () => {
  for (const u of [director, admin]) {
    const r = await request(app).get('/api/invoices/board').set(as(u));
    assert.equal(r.status, 200, r.body?.message);
  }
});
