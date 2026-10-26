// Accès aux fichiers déposés (audit sécurité run-1, piste 5) : /api/uploads et
// /api/signatures exigent une session valable (cookie de fichiers ou jeton) ;
// le fichier d'un document n'est servi qu'à qui peut lire ce document ; les
// liens signés (OnlyOffice) expirent.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import sequelize from '../../src/config/database.js';
import { User } from '../../src/models/index.js';
import { signFileUrl } from '../../src/utils/fileAccess.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f;
let owner;
let stranger;
let doc;
let rel;
const written = [];

before(async () => {
  f = makeFactory(await createTenant());
  [owner, stranger] = await Promise.all([f.user(), f.user()]);
  await fs.mkdir(path.resolve('uploads'), { recursive: true });
  rel = `test-acces-${Date.now()}.pdf`;
  await fs.writeFile(path.resolve('uploads', rel), '%PDF-1.4 test');
  written.push(`uploads/${rel}`);
  doc = await f.document(owner, { filePath: `uploads/${rel}`, fileName: rel });
});
after(async () => {
  for (const p of written) await fs.unlink(path.resolve(p)).catch(() => {});
  await sequelize.close();
});

const bearer = (u) => ({ Authorization: authHeaders(f.tenant, u).Authorization });
const cookieOf = (u) => `ged_files=${bearer(u).Authorization.split(' ')[1]}`;

test('sans session : refusé', async () => {
  const res = await request(app).get(`/api/uploads/${rel}`);
  assert.equal(res.status, 401);
});

test('propriétaire (jeton ou cookie de fichiers) : servi', async () => {
  assert.equal((await request(app).get(`/api/uploads/${rel}`).set(bearer(owner))).status, 200);
  assert.equal((await request(app).get(`/api/uploads/${rel}`).set('Cookie', cookieOf(owner))).status, 200);
});

test('utilisateur sans droit de lecture sur le document : refusé', async () => {
  const res = await request(app).get(`/api/uploads/${rel}`).set('Cookie', cookieOf(stranger));
  assert.equal(res.status, 403);
});

test('jeton 2FA provisoire, compte désactivé : refusés', async () => {
  const pending = jwt.sign({ id: owner.id, type: '2fa_pending' }, process.env.JWT_SECRET, { expiresIn: '5m' });
  assert.equal((await request(app).get(`/api/uploads/${rel}`).set('Cookie', `ged_files=${pending}`)).status, 401);
  const off = await f.user();
  const offDoc = `test-acces-off-${Date.now()}.pdf`;
  await fs.writeFile(path.resolve('uploads', offDoc), '%PDF-1.4');
  written.push(`uploads/${offDoc}`);
  await f.document(off, { filePath: `uploads/${offDoc}`, fileName: offDoc });
  const cookie = cookieOf(off);
  await f.run(() => User.update({ isActive: false }, { where: { id: off.id } }));
  assert.equal((await request(app).get(`/api/uploads/${offDoc}`).set('Cookie', cookie)).status, 401);
});

test('lien signé (OnlyOffice) : valable avant expiration, refusé ensuite ou altéré', async () => {
  const url = signFileUrl(`uploads/${rel}`, 60);
  assert.equal((await request(app).get(url)).status, 200);
  assert.equal((await request(app).get(url.replace(/sig=[^&]+/, 'sig=00'))).status, 401);
  const expired = signFileUrl(`uploads/${rel}`, -10);
  assert.equal((await request(app).get(expired)).status, 401);
  const other = `test-acces-autre-${Date.now()}.pdf`;
  await fs.writeFile(path.resolve('uploads', other), '%PDF-1.4');
  written.push(`uploads/${other}`);
  assert.equal((await request(app).get(url.replace(rel, other))).status, 401, 'la signature ne vaut que pour son fichier');
});

test('fichier hors document (pièce jointe, signature) : réservé aux sessions valables', async () => {
  await fs.mkdir(path.resolve('uploads/signatures'), { recursive: true });
  const sig = `signatures/test-sig-${Date.now()}.png`;
  await fs.writeFile(path.resolve('uploads', sig), 'png');
  written.push(`uploads/${sig}`);
  assert.equal((await request(app).get(`/api/uploads/${sig}`)).status, 401);
  assert.equal((await request(app).get(`/api/uploads/${sig}`).set('Cookie', cookieOf(stranger))).status, 200);
});

test('une requête authentifiée de l\'API dépose le cookie de fichiers (HttpOnly, limité à /api)', async () => {
  const res = await request(app).get('/api/auth/profile').set(authHeaders(f.tenant, owner));
  assert.equal(res.status, 200);
  const set = [].concat(res.headers['set-cookie'] || []).find((c) => c.startsWith('ged_files='));
  assert.ok(set, 'cookie ged_files posé');
  assert.match(set, /HttpOnly/i);
  assert.match(set, /Path=\/api/);
  assert.match(set, /SameSite=Lax/i);
});

test('utilisateur d\'un autre établissement : refusé même avec une session valable', async () => {
  const other = makeFactory(await createTenant());
  const outsider = await other.user({ role: 'admin' });
  const cookie = `ged_files=${authHeaders(other.tenant, outsider).Authorization.split(' ')[1]}`;
  assert.equal((await request(app).get(`/api/uploads/${rel}`).set('Cookie', cookie)).status, 403);
});
