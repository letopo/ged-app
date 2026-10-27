// Bon de prise en charge (BPC) du personnel :
//  - création réservée (médecin du travail, RH, admins) ; bon A5 dessiné par le serveur ;
//  - circuit imposé Médecin du travail → RH → DG ;
//  - le RH complète l'assuré (sans signer), sur le PDF déjà visé par le médecin ;
//  - visas : médecin → cadre « VISA MÉDECIN », DG → cadre « VISA DG » ;
//  - visé par le DG : envoyé aux agents d'accueil (onglet « Reçus »).
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import request from 'supertest';
import { PDFDocument } from 'pdf-lib';
import { PDFExtract } from 'pdf.js-extract';
import sequelize from '../../src/config/database.js';
import { Document } from '../../src/models/index.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f;
let medecin, rh, dg, accueilPhp, accueilNormal, someone;
const createdFiles = new Set();

before(async () => {
  f = makeFactory(await createTenant());
  medecin = await f.user({ firstName: 'Dr', lastName: 'Ndoube' });
  rh = await f.user({ firstName: 'Agent', lastName: 'RH' });
  dg = await f.user({ firstName: 'Directeur', lastName: 'General', role: 'director' });
  accueilPhp = await f.user({ role: 'agent_accueil_php' });
  accueilNormal = await f.user({ role: 'agent_accueil_normal' });
  someone = await f.user();
  await f.poste('medecin_travail', [medecin]);
  await f.poste('rh', [rh]);
  await f.poste('dg', [dg]);
});
after(async () => {
  await f.dropPostes();
  for (const file of createdFiles) await fs.rm(path.resolve(process.cwd(), file), { force: true });
  await sequelize.close();
});

const as = (user) => authHeaders(f.tenant, user);
const MEDECIN_FIELDS = { nomMalade: 'MBOUA Jeanne', typeSoins: 'hospitalisation', dateSoins: '2026-10-27', diagnostic: 'Paludisme grave' };
const RH_FIELDS = { nomAssure: 'NKOLO Pierre', entreprise: 'HSJM', secteur: 'Laboratoire', matricule: 'HSJM-0421', filiation: 'conjoint' };

async function pdfText(doc) {
  const fresh = await Document.unscoped().findByPk(doc.id);
  createdFiles.add(fresh.filePath);
  const data = await new PDFExtract().extract(path.resolve(process.cwd(), fresh.filePath), {});
  return data.pages.map(p => p.content.map(c => c.str).join(' ')).join(' ');
}

const create = (user, body = MEDECIN_FIELDS) => request(app).post('/api/documents/bon-prise-en-charge').set(as(user)).send(body);
const myTask = async (user, docId) => {
  const res = await request(app).get('/api/workflows/my-tasks').set(as(user));
  const tasks = res.body.data || res.body.tasks || res.body;
  return (Array.isArray(tasks) ? tasks : []).find(t => (t.documentId || t.document?.id) === docId && t.status === 'pending');
};
const validate = (user, task, body) => request(app).put(`/api/workflows/${task.id}/validate`).set(as(user)).send(body);

async function submitted() {
  const res = await create(medecin);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const doc = res.body.data;
  createdFiles.add(doc.filePath);
  const wf = await request(app).post('/api/workflows').set(as(medecin)).send({ documentId: doc.id });
  assert.ok([200, 201].includes(wf.status), JSON.stringify(wf.body));
  return doc;
}

test('création : bon A5 paysage, rubriques du médecin, deux cadres de visa', async () => {
  const res = await create(medecin);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const doc = res.body.data;
  createdFiles.add(doc.filePath);
  assert.equal(doc.category, 'Bon de prise en charge');
  assert.equal(doc.visibility, 'personal');
  assert.equal(doc.metadata.signatureZones.length, 2);
  const pdf = await PDFDocument.load(await fs.readFile(path.resolve(process.cwd(), doc.filePath)));
  const { width, height } = pdf.getPage(0).getSize();
  assert.deepEqual([Math.round(width), Math.round(height)], [595, 420]);
  const text = await pdfText(doc);
  for (const s of ['BON DE PRISE EN CHARGE', 'MBOUA Jeanne', 'Paludisme grave', '27/10/2026', 'VISA DG', 'VISA MÉDECIN']) assert.ok(text.includes(s), `manque « ${s} »`);
  assert.ok(!/naissance/i.test(text), 'pas de date de naissance');
});

test('création réservée : refusée à un utilisateur ordinaire, permise au RH', async () => {
  assert.equal((await create(someone)).status, 403);
  const ok = await create(rh);
  assert.equal(ok.status, 201);
  createdFiles.add(ok.body.data.filePath);
});

test('création : rubriques obligatoires', async () => {
  assert.equal((await create(medecin, { ...MEDECIN_FIELDS, diagnostic: '' })).status, 400);
  assert.equal((await create(medecin, { ...MEDECIN_FIELDS, typeSoins: 'autre' })).status, 400);
  assert.equal((await create(medecin, { ...MEDECIN_FIELDS, dateSoins: 'demain' })).status, 400);
});

test('circuit complet : médecin vise, RH complète, DG vise, accueil prévenu', async () => {
  const doc = await submitted();

  // 1. Médecin du travail : visa (cadre VISA MÉDECIN)
  const t1 = await myTask(medecin, doc.id);
  assert.ok(t1, 'tâche du médecin');
  const v1 = await validate(medecin, t1, { validationType: 'signature' });
  assert.equal(v1.status, 200, JSON.stringify(v1.body));

  // 2. RH : ne peut pas signer ni approuver sans compléter
  const t2 = await myTask(rh, doc.id);
  assert.ok(t2, 'tâche du RH');
  assert.equal((await validate(rh, t2, { validationType: 'signature' })).status, 400);
  assert.equal((await validate(rh, t2, { status: 'approved' })).status, 400);
  assert.equal((await validate(rh, t2, { validationType: 'completer', bpcFields: { ...RH_FIELDS, filiation: '' } })).status, 400);
  const v2 = await validate(rh, t2, { validationType: 'completer', bpcFields: RH_FIELDS });
  assert.equal(v2.status, 200, JSON.stringify(v2.body));
  const afterRh = await Document.unscoped().findByPk(doc.id);
  assert.equal(afterRh.metadata.nomAssure, 'NKOLO Pierre');
  assert.equal(afterRh.metadata.filiation, 'conjoint');
  const text = await pdfText(doc);
  for (const s of ['NKOLO Pierre', 'HSJM-0421', 'Laboratoire', 'MBOUA Jeanne']) assert.ok(text.includes(s), `manque « ${s} »`);

  // 3. DG : visa (cadre VISA DG), puis bon approuvé et envoyé à l'accueil
  const t3 = await myTask(dg, doc.id);
  assert.ok(t3, 'tâche du DG');
  const v3 = await validate(dg, t3, { validationType: 'signature' });
  assert.equal(v3.status, 200, JSON.stringify(v3.body));
  assert.equal((await Document.unscoped().findByPk(doc.id)).status, 'approved');

  for (const agent of [accueilPhp, accueilNormal]) {
    let ids = [];
    for (let i = 0; i < 20 && !ids.includes(doc.id); i++) {
      await new Promise(r => setTimeout(r, 100));
      ids = (await request(app).get('/api/documents/transmissions/received').set(as(agent))).body.transmissions.map(x => x.document.id);
    }
    assert.ok(ids.includes(doc.id), `accueil (${agent.role}) prévenu`);
    assert.equal((await request(app).get(`/api/documents/${doc.id}`).set(as(agent))).status, 200);
  }
  // Un utilisateur sans rôle dans le circuit ne voit pas le bon (diagnostic médical)
  assert.equal((await request(app).get(`/api/documents/${doc.id}`).set(as(someone))).status, 403);
});

test('« Compléter » refusé hors étape RH d\'un BPC', async () => {
  const doc = await submitted();
  const t1 = await myTask(medecin, doc.id);
  const res = await validate(medecin, t1, { validationType: 'completer', bpcFields: RH_FIELDS });
  assert.equal(res.status, 400);
});
