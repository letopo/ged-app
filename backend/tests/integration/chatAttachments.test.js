// Discussion — pièces jointes : fichiers envoyés depuis l'ordinateur, rangés
// hors de /api/uploads et téléchargés par les seuls membres ; documents de la
// GED partagés, ouverts seulement par qui a déjà le droit de les lire.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import request from 'supertest';
import sequelize from '../../src/config/database.js';
import { chatFilePath } from '../../src/utils/chatAttachments.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f;
let A; let B; let outsider;
let conv;
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');

before(async () => {
  f = makeFactory(await createTenant());
  [A, B, outsider] = await Promise.all([f.user(), f.user(), f.user()]);
  conv = (await request(app).post('/api/chat/conversations').set(as(A)).send({ type: 'channel', name: 'Pièces jointes', memberIds: [B.id] })).body.data;
});
after(async () => {
  await sequelize.query(`DELETE FROM chat_conversations WHERE id = :id`, { replacements: { id: conv.id } });
  fs.rmSync(chatFilePath(`${conv.id}/x`).replace(/\/x$/, ''), { recursive: true, force: true });
  await sequelize.close();
});

const as = (u) => authHeaders(f.tenant, u);
const upload = (u, name = 'Compte rendu été.pdf', buf = PDF, convId = conv.id) => request(app)
  .post(`/api/chat/conversations/${convId}/attachments`).set(as(u))
  .field('content', 'Voici le fichier').attach('file', buf, name);
const messages = async (u) => (await request(app).get(`/api/chat/conversations/${conv.id}/messages`).set(as(u))).body.data;

test('un membre envoie un fichier, les membres le téléchargent', async () => {
  const res = await upload(A);
  assert.equal(res.status, 201);
  assert.equal(res.body.data.hasFile, true);
  assert.equal(res.body.data.attachmentName, 'Compte rendu été.pdf');
  assert.equal(res.body.data.content, 'Voici le fichier');
  assert.equal(res.body.data.attachmentPath, undefined, 'le chemin sur le disque n\'est pas exposé');

  const dl = await request(app).get(`/api/chat/messages/${res.body.data.id}/attachment`).set(as(B));
  assert.equal(dl.status, 200);
  assert.equal(dl.headers['x-content-type-options'], 'nosniff');
  assert.match(dl.headers['content-disposition'], /^inline;.*filename\*=UTF-8''Compte%20rendu%20%C3%A9t%C3%A9\.pdf/);
  assert.equal(Buffer.compare(dl.body, PDF), 0);

  const list = await messages(B);
  const row = list.find((m) => m.id === res.body.data.id);
  assert.equal(row.has_file, true);
  assert.equal(row.attachment_path, undefined);
});

test('un non-membre ne peut ni envoyer ni télécharger', async () => {
  assert.equal((await upload(outsider)).status, 403);
  const sent = await upload(A, 'note.txt', Buffer.from('confidentiel'));
  assert.equal(sent.status, 201);
  const url = `/api/chat/messages/${sent.body.data.id}/attachment`;
  assert.equal((await request(app).get(url).set(as(outsider))).status, 403);
  assert.equal((await request(app).get(url).set('Host', f.tenant.domain)).status, 401);
  // un type non affiché par le navigateur est servi en téléchargement, sans script
  const dl = await request(app).get(url).set(as(B));
  assert.match(dl.headers['content-disposition'], /^attachment;/);
  assert.match(dl.headers['content-security-policy'], /sandbox/);
});

test('les fichiers de la discussion ne sont pas servis par /api/uploads', async () => {
  const sent = await upload(A);
  const [row] = await sequelize.query('SELECT attachment_path FROM chat_messages WHERE id = :id', { replacements: { id: sent.body.data.id }, type: sequelize.QueryTypes.SELECT });
  assert.equal((await request(app).get(`/api/uploads/.chat/${row.attachment_path}`).set(as(B))).status, 404);
});

test('types refusés et chemin fourni par le client ignoré', async () => {
  assert.equal((await upload(A, 'outil.exe', Buffer.from('MZ'))).status, 400);
  assert.equal((await upload(A, 'page.html', Buffer.from('<script>alert(1)</script>'))).status, 400);
  const res = await request(app).post(`/api/chat/conversations/${conv.id}/messages`).set(as(A))
    .send({ content: 'lien', attachmentPath: '../../../etc/passwd', attachmentName: 'passwd' });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.hasFile, false);
  assert.equal((await request(app).get(`/api/chat/messages/${res.body.data.id}/attachment`).set(as(B))).status, 404);
});

test('document de la GED : seuls ceux qui ont le droit de le lire l\'ouvrent', async () => {
  const doc = await f.document(A, { title: 'Dossier confidentiel' });
  const res = await request(app).post(`/api/chat/conversations/${conv.id}/messages`).set(as(A)).send({ documentId: doc.id });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.attachmentDocumentId, doc.id);

  const forA = (await messages(A)).find((m) => m.id === res.body.data.id);
  assert.equal(forA.document_accessible, true);
  assert.equal(forA.attachment_name, 'Dossier confidentiel');
  const forB = (await messages(B)).find((m) => m.id === res.body.data.id);
  assert.equal(forB.document_accessible, false);
  assert.equal(forB.attachment_name, null, 'le titre n\'est pas révélé');
  const single = await request(app).get(`/api/chat/messages/${res.body.data.id}`).set(as(B));
  assert.equal(single.body.data.document_accessible, false);
  assert.equal(single.body.data.attachment_name, null);
  assert.equal((await request(app).get(`/api/chat/messages/${res.body.data.id}`).set(as(outsider))).status, 403);

  // après une transmission, B y a droit
  await f.transmit(doc, A, B);
  assert.equal((await messages(B)).find((m) => m.id === res.body.data.id).document_accessible, true);
});

test('on ne partage pas un document que l\'on ne peut pas lire', async () => {
  const doc = await f.document(outsider);
  const res = await request(app).post(`/api/chat/conversations/${conv.id}/messages`).set(as(A)).send({ documentId: doc.id });
  assert.equal(res.status, 403);
});

test('supprimer le message efface le fichier', async () => {
  const sent = await upload(A);
  const [row] = await sequelize.query('SELECT attachment_path FROM chat_messages WHERE id = :id', { replacements: { id: sent.body.data.id }, type: sequelize.QueryTypes.SELECT });
  const file = chatFilePath(row.attachment_path);
  assert.ok(fs.existsSync(file));
  assert.equal((await request(app).delete(`/api/chat/messages/${sent.body.data.id}`).set(as(A))).status, 200);
  assert.equal((await request(app).get(`/api/chat/messages/${sent.body.data.id}/attachment`).set(as(B))).status, 404);
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(fs.existsSync(file), false);
  const gone = (await messages(B)).find((m) => m.id === sent.body.data.id);
  assert.equal(gone.has_file, false);
  assert.equal(gone.attachment_name, null);
});
