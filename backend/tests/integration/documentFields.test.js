// Champs d'un document (audit sécurité run-1, piste 3) : le propriétaire ne
// modifie que les champs descriptifs ; l'emplacement du fichier, l'établissement,
// le propriétaire et le statut sont réservés au serveur, et tout chemin de
// fichier reste confiné au dossier uploads/.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import request from 'supertest';
import sequelize from '../../src/config/database.js';
import { Document } from '../../src/models/index.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f;
let owner;
let other;
let canary;

before(async () => {
  f = makeFactory(await createTenant());
  other = makeFactory(await createTenant());
  owner = await f.user();
  canary = path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'ged-canary-')), 'canary.txt');
  await fs.writeFile(canary, 'canary');
});
after(async () => {
  await fs.rm(path.dirname(canary), { recursive: true, force: true });
  await sequelize.close();
});

const as = (u) => authHeaders(f.tenant, u);
const reload = (id) => f.run(() => Document.findByPk(id));

async function ownDoc() {
  // fichier réel dans uploads/ pour les routes de téléchargement
  const name = `test-champs-${Date.now()}-${Math.random().toString(16).slice(2)}.txt`;
  await fs.mkdir(path.resolve('uploads'), { recursive: true });
  await fs.writeFile(path.resolve('uploads', name), 'contenu');
  return f.document(owner, { filePath: `uploads/${name}`, fileName: name, fileType: 'text/plain' });
}

test('le propriétaire modifie toujours le titre et la catégorie', async () => {
  const d = await ownDoc();
  const res = await request(app).put(`/api/documents/${d.id}`).set(as(owner)).send({ title: 'Nouveau titre', category: 'Note' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const x = await reload(d.id);
  assert.equal(x.title, 'Nouveau titre');
  assert.equal(x.category, 'Note');
});

test('filePath pointant hors de uploads/ : refusé, fichier extérieur ni lu ni supprimé', async () => {
  const d = await ownDoc();
  const put = await request(app).put(`/api/documents/${d.id}`).set(as(owner)).send({ filePath: canary, fileName: 'x.txt' });
  assert.equal(put.status, 400, JSON.stringify(put.body));
  assert.equal((await reload(d.id)).filePath, d.filePath);
  const dl = await request(app).get(`/api/documents/${d.id}/download`).set(as(owner));
  assert.ok(!String(dl.text || '').includes('canary'));
  const del = await request(app).delete(`/api/documents/${d.id}`).set(as(owner));
  assert.ok([200, 204].includes(del.status), `suppression ${del.status}`);
  assert.equal(await fs.readFile(canary, 'utf8'), 'canary', 'le fichier extérieur existe toujours');
});

for (const [field, value] of [['status', 'approved'], ['userId', '00000000-0000-4000-8000-000000000000'], ['tenantId', 'AUTRE'], ['fileType', 'text/html']]) {
  test(`champ réservé « ${field} » : refusé`, async () => {
    const d = await ownDoc();
    const v = field === 'tenantId' ? other.tenant.id : value;
    const res = await request(app).put(`/api/documents/${d.id}`).set(as(owner)).send({ [field]: v });
    assert.equal(res.status, 400, JSON.stringify(res.body));
    const x = await reload(d.id);
    assert.ok(x, 'document toujours dans l\'établissement');
    assert.equal(x[field], d[field]);
  });
}

test('métadonnées : la preuve de signature et le hachage de vérification ne sont pas modifiables', async () => {
  const d = await f.document(owner, { metadata: { verification_hash: 'abc123', manualSignature: { sha256: 'x' }, note: 'a' } });
  const res = await request(app).put(`/api/documents/${d.id}`).set(as(owner)).send({ metadata: { note: 'b', verification_hash: 'forge', manualSignature: null } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const x = await reload(d.id);
  assert.equal(x.metadata.note, 'b');
  assert.equal(x.metadata.verification_hash, 'abc123');
  assert.deepEqual(x.metadata.manualSignature, { sha256: 'x' });
});

test('modèle : un chemin hors de uploads/ ne peut pas être enregistré', async () => {
  for (const bad of ['/etc/passwd', 'uploads/../server.js', '../uploads/x.pdf', 'dist/server.js', 'uploads\\..\\x']) {
    await assert.rejects(f.document(owner, { filePath: bad }), /filePath|chemin/i, bad);
  }
  const ok = await f.document(owner, { filePath: 'uploads/sous-dossier/fichier.pdf' });
  assert.ok(ok.id);
});

test('ligne déjà altérée en base : téléchargement et suppression refusent le chemin extérieur', async () => {
  const d = await ownDoc();
  await sequelize.query('UPDATE documents SET file_path = :p WHERE id = :id', { replacements: { p: canary, id: d.id } });
  const dl = await request(app).get(`/api/documents/${d.id}/download`).set(as(owner));
  assert.notEqual(dl.status, 200);
  assert.ok(!String(dl.text || '').includes('canary'));
  await request(app).delete(`/api/documents/${d.id}`).set(as(owner));
  assert.equal(await fs.readFile(canary, 'utf8'), 'canary');
});
