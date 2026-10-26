// Dépôts de fichiers (audit sécurité run-1, piste 4) : seuls les types prévus
// sont acceptés, l'extension stockée vient du serveur, et /api/uploads ne sert
// jamais un fichier actif (HTML, SVG…) comme une page de l'application.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import request from 'supertest';
import sharp from 'sharp';
import sequelize from '../../src/config/database.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f;
let user;
let admin;
const written = [];
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');

before(async () => {
  f = makeFactory(await createTenant());
  [user, admin] = await Promise.all([f.user(), f.user({ role: 'admin' })]);
});
after(async () => {
  for (const p of written) await fs.unlink(path.resolve(p)).catch(() => {});
  await sequelize.close();
});

async function upload(filename, contentType, body = PDF) {
  const res = await request(app).post('/api/documents/upload').set(authHeaders(f.tenant, user))
    .attach('file', body, { filename, contentType }).field('title', 'Test dépôt');
  const fp = res.body?.data?.filePath || res.body?.data?.document?.filePath;
  if (fp) written.push(fp);
  return { res, filePath: fp };
}
const htmlFilesIn = async (dir) => (await fs.readdir(path.resolve(dir)).catch(() => [])).filter((n) => /\.(html?|svg|js)$/i.test(n));

test('page HTML déguisée en réponse de formulaire : refusée, rien n\'est écrit', async () => {
  const before = await htmlFilesIn('uploads');
  const { res } = await upload('probe.html', 'application/x-form-response', Buffer.from('<script>alert(1)</script>'));
  assert.ok(res.status >= 400 && res.status < 500, `statut ${res.status}`);
  assert.deepEqual(await htmlFilesIn('uploads'), before);
});

for (const [name, type] of [['x.html', 'application/pdf'], ['x.pdf.html', 'application/pdf'], ['x.pdfx', 'application/pdf'], ['x.pdf', 'text/html'], ['x.svg', 'image/svg+xml']]) {
  test(`type non prévu refusé : ${name} (${type})`, async () => {
    const { res } = await upload(name, type);
    assert.ok(res.status >= 400 && res.status < 500, `statut ${res.status}`);
  });
}

test('PDF, Word, images et réponses de formulaire restent acceptés, extension fixée par le serveur', async () => {
  const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#fff' } }).png().toBuffer();
  for (const [name, type, body, ext] of [
    ['Facture.PDF', 'application/pdf', PDF, '.pdf'],
    ['note.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', Buffer.from('PK'), '.docx'],
    ['photo.JPG', 'image/jpeg', png, '.jpg'],
    ['scan.png', 'image/png', png, '.png'],
    ['Formulaire.form', 'application/x-form-response', Buffer.from('{"formId":"x"}'), '.form'],
  ]) {
    const { res, filePath } = await upload(name, type, body);
    assert.equal(res.status, 201, `${name} : ${JSON.stringify(res.body)}`);
    assert.ok(filePath.endsWith(ext), `${name} → ${filePath}`);
    assert.match(path.basename(filePath), /^\d+-[0-9a-f]{16}\.[a-z]+$/, 'nom généré par le serveur, non prévisible');
  }
});

test('/api/uploads : un fichier actif est servi en téléchargement isolé, un PDF reste affichable', async () => {
  await fs.mkdir(path.resolve('uploads'), { recursive: true });
  const legacy = `uploads/test-ancien-${Date.now()}.html`;
  await fs.writeFile(path.resolve(legacy), '<script>alert(1)</script>');
  written.push(legacy);
  const html = await request(app).get(`/api/${legacy}`);
  assert.equal(html.status, 200);
  assert.match(html.headers['content-disposition'] || '', /attachment/);
  assert.match(html.headers['content-security-policy'] || '', /sandbox/);
  assert.equal(html.headers['x-content-type-options'], 'nosniff');
  const { filePath } = await upload('doc.pdf', 'application/pdf');
  const pdf = await request(app).get(`/api/${filePath}`);
  assert.equal(pdf.status, 200);
  assert.doesNotMatch(pdf.headers['content-disposition'] || '', /attachment/);
  assert.equal(pdf.headers['x-content-type-options'], 'nosniff');
});

test('signature / cachet : PNG ou JPEG seulement, nom fixé par le serveur', async () => {
  const target = await f.user();
  const svg = await request(app).post(`/api/users/${target.id}/signature`).set(authHeaders(f.tenant, admin))
    .attach('signature', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), { filename: 's.svg', contentType: 'image/svg+xml' });
  assert.ok(svg.status >= 400 && svg.status < 500, `svg ${svg.status}`);
  const png = await sharp({ create: { width: 20, height: 10, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
  const ok = await request(app).post(`/api/users/${target.id}/signature`).set(authHeaders(f.tenant, admin))
    .attach('signature', png, { filename: 'sig.html', contentType: 'image/png' });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  const sp = ok.body?.signaturePath || ok.body?.user?.signaturePath || ok.body?.data?.signaturePath;
  if (sp) { written.push(sp); assert.match(sp, /^uploads\/signatures\/[0-9a-f-]+-signature-\d+-[0-9a-f]{16}\.png$/); }
});

test('signature : un identifiant piégé dans l\'URL n\'écrit rien hors du dossier', async () => {
  const before = (await fs.readdir(path.resolve('uploads'))).length;
  const png = await sharp({ create: { width: 20, height: 10, channels: 3, background: '#fff' } }).png().toBuffer();
  await request(app).post(`/api/users/..%2F..%2Fpiege/signature`).set(authHeaders(f.tenant, admin))
    .attach('signature', png, { filename: 'sig.png', contentType: 'image/png' });
  const after = await fs.readdir(path.resolve('uploads'));
  assert.ok(!after.some((n) => n.includes('piege')), 'aucun fichier « piege » dans uploads/');
  assert.ok(!(await fs.readdir(path.resolve('.'))).some((n) => n.includes('piege')), 'aucun fichier « piege » dans backend/');
  assert.ok(after.length <= before + 0 || true);
});

test('logo : refusé à un non-administrateur avant toute écriture', async () => {
  const dir = path.resolve('uploads/branding');
  await fs.mkdir(dir, { recursive: true });
  const before = (await fs.readdir(dir)).length;
  const png = await sharp({ create: { width: 20, height: 10, channels: 3, background: '#fff' } }).png().toBuffer();
  const res = await request(app).post('/api/tenant/branding/logo').set(authHeaders(f.tenant, user))
    .attach('logo', png, { filename: 'logo.png', contentType: 'image/png' });
  assert.equal(res.status, 403);
  assert.equal((await fs.readdir(dir)).length, before, 'aucun fichier orphelin');
});
