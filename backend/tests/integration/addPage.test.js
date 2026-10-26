// Ajout de pages (audit sécurité run-1, piste 10) : fusionner des pages réécrit
// le fichier du document, c'est donc une modification réservée au propriétaire
// (ou à un administrateur), comme la mise à jour et la suppression. Lire un
// document ne suffit pas, et un document approuvé n'est plus modifiable.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import request from 'supertest';
import { PDFDocument } from 'pdf-lib';
import sequelize from '../../src/config/database.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f;
let owner; let colleague; let validator; let admin;
const written = [];

async function pdf(pages) {
  const d = await PDFDocument.create();
  for (let i = 0; i < pages; i++) d.addPage([200, 200]);
  return Buffer.from(await d.save());
}
async function docWithFile(attrs = {}) {
  await fs.mkdir(path.resolve('uploads'), { recursive: true });
  const rel = `uploads/test-addpage-${crypto.randomBytes(6).toString('hex')}.pdf`;
  await fs.writeFile(path.resolve(rel), await pdf(1));
  written.push(rel);
  return f.document(owner, { filePath: rel, ...attrs });
}
const pageCount = async (doc) => (await PDFDocument.load(await fs.readFile(path.resolve(doc.filePath)))).getPageCount();
const addPage = async (actor, doc) => request(app).post(`/api/documents/${doc.id}/add-page`).set(authHeaders(f.tenant, actor))
  .attach('file', await pdf(1), { filename: 'page.pdf', contentType: 'application/pdf' }).field('position', 'after');

before(async () => {
  f = makeFactory(await createTenant());
  [owner, colleague, validator, admin] = await Promise.all([f.user(), f.user(), f.user(), f.user({ role: 'admin' })]);
});
after(async () => {
  for (const p of written) await fs.unlink(path.resolve(p)).catch(() => {});
  await sequelize.close();
});

test('un destinataire qui peut seulement lire ne modifie pas le fichier', async () => {
  const doc = await docWithFile();
  await f.transmit(doc, owner, colleague);
  assert.equal((await request(app).get(`/api/documents/${doc.id}`).set(authHeaders(f.tenant, colleague))).status, 200, 'il peut lire');
  assert.equal((await addPage(colleague, doc)).status, 403);
  assert.equal(await pageCount(doc), 1, 'fichier inchangé');
});

test('un validateur du circuit ne réécrit pas le document', async () => {
  const doc = await docWithFile({ status: 'pending_validation' });
  await f.validator(doc, validator);
  assert.equal((await addPage(validator, doc)).status, 403);
  assert.equal(await pageCount(doc), 1);
});

test('le propriétaire et un administrateur ajoutent des pages', async () => {
  const doc = await docWithFile();
  const own = await addPage(owner, doc);
  assert.equal(own.status, 200, JSON.stringify(own.body));
  assert.equal(await pageCount(doc), 2);
  assert.equal((await addPage(admin, doc)).status, 200);
  assert.equal(await pageCount(doc), 3);
});

test('un document approuvé est verrouillé', async () => {
  const doc = await docWithFile({ status: 'approved' });
  assert.equal((await addPage(owner, doc)).status, 409);
  assert.equal(await pageCount(doc), 1);
});

test('un refus ne laisse pas de fichier déposé derrière lui', async () => {
  const doc = await docWithFile();
  const before = (await fs.readdir(path.resolve('uploads'))).length;
  await addPage(colleague, doc);
  assert.equal((await fs.readdir(path.resolve('uploads'))).length, before);
});
