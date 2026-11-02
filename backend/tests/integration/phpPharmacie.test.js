// Module PHP, lot 3 : registre de pharmacie. Saisie d'une ordonnance (produits,
// source, quantités), reste à servir, consommation par produit ; saisie réservée
// au poste PHP complet ; jamais les lignes d'un autre établissement.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import sequelize from '../../src/config/database.js';
import { PatientPHP, ConsultationPHP } from '../../src/models/index.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f; let g;
let focal; let lecteur; let focalG;
let p1; let p2; let pG; let consult; let consultP2;
const DAY = '2020-05-12';
const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const as = (u, fac = f) => authHeaders(fac.tenant, u);
const period = { du: '2020-05-01', au: '2020-05-31' };

before(async () => {
  f = makeFactory(await createTenant());
  g = makeFactory(await createTenant());
  focal = await f.user({ role: 'agent_accueil_php' });
  lecteur = await f.user();
  await f.poste('php_lecture', [lecteur]);
  focalG = await g.user({ role: 'agent_accueil_php' });
  await f.run(async () => {
    p1 = await PatientPHP.create({ matricule: `6${uid()}`, nom: 'PHARMA', prenom: 'UN' });
    p2 = await PatientPHP.create({ matricule: `6${uid()}`, nom: 'PHARMA', prenom: 'DEUX' });
    consult = await ConsultationPHP.create({ patientId: p1.id, dateConsultation: DAY, serviceName: 'MEDECINE', typeVisite: 'CS', resultat: 'en_cours' });
    consultP2 = await ConsultationPHP.create({ patientId: p2.id, dateConsultation: DAY, serviceName: 'MEDECINE', typeVisite: 'CS', resultat: 'en_cours' });
  });
  await g.run(async () => {
    pG = await PatientPHP.create({ matricule: `5${uid()}`, nom: 'AUTRE' });
  });
});
after(async () => {
  await f.dropPostes();
  await sequelize.close();
});

test('ordonnance : saisie, contrôles, droits', async () => {
  const body = {
    patientId: p1.id, consultationId: consult.id, datePrescription: DAY,
    lignes: [
      { produit: '  doliprane   500mg ', quantitePrescrite: 2, quantiteServie: 2 },
      { produit: 'Omeprazole 20', quantitePrescrite: 3, quantiteServie: 1 },
      { produit: 'Revital', source: 'medecin_travail', quantitePrescrite: 1, quantiteServie: 0 },
    ],
  };
  assert.equal((await request(app).post('/api/php/pharmacie').set(as(lecteur)).send(body)).status, 403, 'consultation seule : pas de saisie');
  const bad = async (patch, msg) => {
    const r = await request(app).post('/api/php/pharmacie').set(as(focal)).send({ ...body, ...patch });
    assert.equal(r.status, 400, msg);
  };
  await bad({ lignes: [{ produit: 'X', quantitePrescrite: 1, quantiteServie: 2 }] }, 'servi > prescrit');
  await bad({ lignes: [{ produit: 'X', source: 'pirate' }] }, 'source inconnue');
  await bad({ lignes: [] }, 'ordonnance vide');
  await bad({ datePrescription: '2999-01-01' }, 'date future');
  await bad({ consultationId: consultP2.id }, 'consultation d\'un autre patient');
  await bad({ patientId: pG.id, consultationId: null }, 'patient d\'un autre établissement');

  const ok = await request(app).post('/api/php/pharmacie').set(as(focal)).send(body);
  assert.equal(ok.status, 201, JSON.stringify(ok.body));
  assert.equal(ok.body.data.length, 3);
  assert.equal(ok.body.data[0].produit, 'DOLIPRANE 500MG');
  // un 2e patient, un produit déjà connu
  await request(app).post('/api/php/pharmacie').set(as(focal)).send({ patientId: p2.id, datePrescription: '2020-05-13', lignes: [{ produit: 'DOLIPRANE 500MG', quantitePrescrite: 1, quantiteServie: 1 }] }).expect(201);
});

test('registre : filtres, reste à servir, servir le reste', async () => {
  const all = await request(app).get('/api/php/pharmacie').query(period).set(as(lecteur));
  assert.equal(all.status, 200);
  assert.equal(all.body.data.rows.length, 4);
  const omep = all.body.data.rows.find(r => r.produit === 'OMEPRAZOLE 20');
  assert.equal(omep.reste, 2);
  assert.equal(omep.consultationService, 'MEDECINE');
  assert.equal(omep.matricule, p1.matricule);

  const reste = await request(app).get('/api/php/pharmacie').query({ ...period, reste: '1' }).set(as(lecteur));
  assert.deepEqual(reste.body.data.rows.map(r => r.produit).sort(), ['OMEPRAZOLE 20', 'REVITAL']);
  const src = await request(app).get('/api/php/pharmacie').query({ ...period, source: 'medecin_travail' }).set(as(lecteur));
  assert.deepEqual(src.body.data.rows.map(r => r.produit), ['REVITAL']);
  const q = await request(app).get('/api/php/pharmacie').query({ ...period, q: p2.matricule }).set(as(lecteur));
  assert.equal(q.body.data.rows.length, 1);
  const like = await request(app).get('/api/php/pharmacie').query({ ...period, q: '%' }).set(as(lecteur));
  assert.equal(like.body.data.rows.length, 0, '% pris à la lettre');

  assert.equal((await request(app).put(`/api/php/pharmacie/${omep.id}`).set(as(lecteur)).send({ quantiteServie: 3 })).status, 403);
  assert.equal((await request(app).put(`/api/php/pharmacie/${omep.id}`).set(as(focal)).send({ quantiteServie: 4 })).status, 400);
  const served = await request(app).put(`/api/php/pharmacie/${omep.id}`).set(as(focal)).send({ quantiteServie: 3 });
  assert.equal(served.status, 200, JSON.stringify(served.body));
  assert.ok(served.body.data.serviLe);
  const after = await request(app).get('/api/php/pharmacie').query({ ...period, reste: '1' }).set(as(lecteur));
  assert.deepEqual(after.body.data.rows.map(r => r.produit), ['REVITAL']);

  // un autre établissement ne voit ni ne modifie rien
  const other = await request(app).get('/api/php/pharmacie').query(period).set(as(focalG, g));
  assert.equal(other.body.data.rows.length, 0);
  assert.equal((await request(app).put(`/api/php/pharmacie/${omep.id}`).set(as(focalG, g)).send({ quantiteServie: 0 })).status, 404);
  assert.equal((await request(app).delete(`/api/php/pharmacie/${omep.id}`).set(as(focalG, g))).status, 404);
});

test('consommation par produit, saisie assistée, consultations du jour', async () => {
  const res = await request(app).get('/api/php/pharmacie/stats').query(period).set(as(lecteur));
  assert.equal(res.status, 200);
  const { produits, sources, total } = res.body.data;
  const doli = produits.find(p => p.produit === 'DOLIPRANE 500MG');
  assert.deepEqual([doli.patients, doli.prescrit, doli.servi, doli.reste, doli.hsjm], [2, 3, 3, 0, 3]);
  assert.equal(produits[0].produit, 'DOLIPRANE 500MG', 'les plus prescrits d\'abord');
  assert.deepEqual([total.lignes, total.ordonnances, total.patients, total.reste], [4, 2, 2, 1]);
  assert.equal(sources.find(s => s.source === 'medecin_travail').prescrit, 1);

  const prod = await request(app).get('/api/php/pharmacie/produits').query({ q: 'doli' }).set(as(lecteur));
  assert.deepEqual(prod.body.data, ['DOLIPRANE 500MG']);
  const otherProd = await request(app).get('/api/php/pharmacie/produits').query({ q: 'doli' }).set(as(focalG, g));
  assert.deepEqual(otherProd.body.data, []);

  const cs = await request(app).get('/api/php/pharmacie/consultations').query({ patientId: p1.id, date: DAY }).set(as(focal));
  assert.deepEqual(cs.body.data.map(c => c.id), [consult.id]);
  const csG = await request(app).get('/api/php/pharmacie/consultations').query({ patientId: p1.id, date: DAY }).set(as(focalG, g));
  assert.deepEqual(csG.body.data, []);
});

test('supprimer une ligne', async () => {
  const all = await request(app).get('/api/php/pharmacie').query({ ...period, source: 'medecin_travail' }).set(as(focal));
  const id = all.body.data.rows[0].id;
  assert.equal((await request(app).delete(`/api/php/pharmacie/${id}`).set(as(lecteur))).status, 403);
  assert.equal((await request(app).delete(`/api/php/pharmacie/${id}`).set(as(focal))).status, 200);
  assert.equal((await request(app).delete(`/api/php/pharmacie/${id}`).set(as(focal))).status, 404);
});
