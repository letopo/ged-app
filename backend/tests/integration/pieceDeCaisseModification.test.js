// Modifier une pièce de caisse soumise (demande de la Comptable, 18/11/2026) :
// possible pour sa créatrice tant que personne ne l'a validée ; impossible dès
// la première validation, pour une autre personne, ou une fois payée.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import request from 'supertest';
import { PDFDocument } from 'pdf-lib';
import sequelize from '../../src/config/database.js';
import { Document, Workflow } from '../../src/models/index.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f; let comptable; let collegue; let dg; let caissiere; let beneficiaire;
const written = [];
const as = (u) => authHeaders(f.tenant, u);

async function pdf(pages = 1) {
  const d = await PDFDocument.create();
  for (let i = 0; i < pages; i++) d.addPage([200, 200]);
  return Buffer.from(await d.save());
}
async function fichier(pages = 1) {
  await fs.mkdir(path.resolve('uploads'), { recursive: true });
  const rel = `uploads/test-pc-modif-${crypto.randomBytes(6).toString('hex')}.pdf`;
  await fs.writeFile(path.resolve(rel), await pdf(pages));
  written.push(rel);
  return rel;
}
const lignes = (montant) => [{ refCompta: '', libelle: 'Carburant', refGage: '', entrees: '', sorties: String(montant) }];
async function pieceSoumise({ metadata = {}, ...attrs } = {}) {
  const doc = await f.document(comptable, {
    category: 'Pièce de caisse', filePath: await fichier(), ...attrs,
    metadata: { numero: 'PC-001', nom: 'Agent test', concerne: 'Mission', lines: lignes(10000), ...metadata },
  });
  const wf = await request(app).post('/api/workflows').set(as(comptable)).send({ documentId: doc.id });
  assert.equal(wf.status, 201, JSON.stringify(wf.body));
  return doc;
}
const etapes = async (docId) => f.run(() => Workflow.findAll({ where: { documentId: docId }, order: [['step', 'ASC']] }));
const modifier = async (actor, doc, metadata, pages = 1) => request(app).put(`/api/documents/${doc.id}/piece-de-caisse`).set(as(actor))
  .attach('file', await pdf(pages), { filename: 'pc.pdf', contentType: 'application/pdf' })
  .field('metadata', JSON.stringify(metadata)).field('title', 'Pièce de caisse - corrigée');

before(async () => {
  f = makeFactory(await createTenant());
  comptable = await f.user();
  collegue = await f.user();
  dg = await f.user({ role: 'director' });
  caissiere = await f.user({ role: 'caissier' });
  beneficiaire = await f.user();
  await f.poste('comptable', [comptable]);
  await f.poste('dg', [dg]);
  await f.member(comptable, await f.service('Comptabilité'));
});
after(async () => {
  await f.dropPostes();
  for (const rel of written) await fs.unlink(path.resolve(rel)).catch(() => {});
  await sequelize.close();
});

test('avant toute validation : la créatrice corrige la pièce, le circuit reste en place', async () => {
  const doc = await pieceSoumise();
  const etat = await request(app).get(`/api/documents/${doc.id}/piece-de-caisse/modification`).set(as(comptable));
  assert.equal(etat.status, 200);
  assert.equal(etat.body.data.modifiable, true);

  const avant = await etapes(doc.id);
  const res = await modifier(comptable, doc, { numero: 'PC-001', nom: 'Agent test', concerne: 'Mission', lines: lignes(12500), paye: true, circuitPC: 'pharmacie' });
  assert.equal(res.status, 200, JSON.stringify(res.body));

  const saved = await f.run(() => Document.findByPk(doc.id));
  assert.notEqual(saved.filePath, doc.filePath);
  written.push(saved.filePath);
  assert.equal(saved.title, 'Pièce de caisse - corrigée');
  assert.equal(saved.metadata.lines[0].sorties, '12500');
  // Clés du serveur jamais reprises du formulaire
  assert.equal(saved.metadata.paye, undefined);
  assert.equal(saved.metadata.circuitPC, 'standard');
  assert.equal(saved.metadata.modifications.length, 1);
  assert.equal(saved.metadata.modifications[0].ancienTotal, 10000);
  assert.equal(saved.metadata.modifications[0].nouveauTotal, 12500);
  assert.equal(saved.metadata.modifications[0].ancienFichier, doc.filePath);
  const apres = await etapes(doc.id);
  assert.deepEqual(apres.map((w) => [w.validatorId, w.status]), avant.map((w) => [w.validatorId, w.status]));
});

test('après la première validation : modification refusée', async () => {
  const doc = await pieceSoumise();
  const [premiere] = await etapes(doc.id);
  await f.run(() => premiere.update({ status: 'approved', validatedAt: new Date() }));

  const etat = await request(app).get(`/api/documents/${doc.id}/piece-de-caisse/modification`).set(as(comptable));
  assert.equal(etat.body.data.modifiable, false);
  assert.match(etat.body.data.raison, /déjà validée/);

  const res = await modifier(comptable, doc, { lines: lignes(1) });
  assert.equal(res.status, 409, JSON.stringify(res.body));
  const saved = await f.run(() => Document.findByPk(doc.id));
  assert.equal(saved.filePath, doc.filePath);
  assert.equal(saved.metadata.lines[0].sorties, '10000');
});

test('une autre personne ne peut pas modifier la pièce', async () => {
  const doc = await pieceSoumise();
  const res = await modifier(collegue, doc, { lines: lignes(1) });
  assert.equal(res.status, 403, JSON.stringify(res.body));
});

test('pièce payée ou importée (sans formulaire) : refusée', async () => {
  const payee = await pieceSoumise({ metadata: { paye: true } });
  assert.equal((await modifier(comptable, payee, { lines: lignes(1) })).status, 409);

  const importee = await f.document(comptable, { category: 'Pièce de caisse', filePath: await fichier(), metadata: {} });
  const etat = await request(app).get(`/api/documents/${importee.id}/piece-de-caisse/modification`).set(as(comptable));
  assert.equal(etat.body.data.modifiable, false);
});

test('liasse : la pièce justificative reste en tête du nouveau PDF', async () => {
  const om = await f.document(comptable, { category: 'Ordre de mission', filePath: await fichier(2) });
  const doc = await pieceSoumise({ linkedDocumentId: om.id, metadata: { fusionné: true, linkedDocumentId: om.id } });
  const res = await modifier(comptable, doc, { lines: lignes(5000) });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const saved = await f.run(() => Document.findByPk(doc.id));
  written.push(saved.filePath);
  const pages = (await PDFDocument.load(await fs.readFile(path.resolve(saved.filePath)))).getPageCount();
  assert.equal(pages, 3);
  assert.equal(saved.metadata.fusionné, true);
});

test('nouveau bénéficiaire avec un compte : son étape est ajoutée au circuit', async () => {
  const doc = await pieceSoumise();
  assert.deepEqual((await etapes(doc.id)).map((w) => w.validatorId), [dg.id, comptable.id, caissiere.id]);
  const res = await modifier(comptable, doc, { lines: lignes(3000), beneficiaire_id: beneficiaire.id, beneficiaire_source: 'user' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  written.push((await f.run(() => Document.findByPk(doc.id))).filePath);
  const apres = await etapes(doc.id);
  assert.deepEqual(apres.map((w) => w.validatorId), [dg.id, comptable.id, beneficiaire.id, caissiere.id]);
  assert.deepEqual(apres.map((w) => w.status), ['pending', 'queued', 'queued', 'queued']);
});
