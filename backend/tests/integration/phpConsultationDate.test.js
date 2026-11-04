// Module PHP (demande du 04/11/2026) : Laboratoire et Pharmacie dans la liste
// des services, et consultation enregistrée à une date antérieure (rattrapage
// de la période où l'Excel ne fonctionnait pas) — jamais dans le futur.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import sequelize from '../../src/config/database.js';
import { PatientPHP, ConsultationPHP, HospitalisationPHP } from '../../src/models/index.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f; let focal;
const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const as = (u) => authHeaders(f.tenant, u);
const PASSE = '2022-05-10';

before(async () => {
  f = makeFactory(await createTenant());
  focal = await f.user({ role: 'agent_accueil_php' });
});
after(async () => { await sequelize.close(); });

test('Laboratoire et Pharmacie figurent dans la liste des services', async () => {
  const res = await request(app).get('/api/php/reference/services-medicaux').set(as(focal));
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const noms = res.body.data.map((s) => s.nom);
  assert.ok(noms.includes('Laboratoire'), noms.join(', '));
  assert.ok(noms.includes('Pharmacie'), noms.join(', '));
});

test('consultation antidatée : enregistrée à sa date, n° d\'ordre de ce jour-là, suites datées du même jour', async () => {
  const p = await f.run(() => PatientPHP.create({ matricule: `8${uid()}`, nom: 'ANTIDATE' }));
  const res = await request(app).post('/api/php/consultations').set(as(focal))
    .send({ patientId: p.id, typeVisite: 'AUTRE', serviceName: 'Laboratoire', motif: 'Bilan', dateConsultation: PASSE });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const row = await ConsultationPHP.findByPk(res.body.data.id);
  assert.equal(row.dateConsultation, PASSE);
  assert.equal(row.serviceName, 'Laboratoire');
  assert.ok(row.numeroOrdre >= 1);

  const clo = await request(app).put(`/api/php/consultations/${row.id}/cloturer`).set(as(focal))
    .send({ resultats: ['hospitalisation'], serviceHospitalisation: 'MEDECINE' });
  assert.equal(clo.status, 200, JSON.stringify(clo.body));
  const hosp = await HospitalisationPHP.findOne({ where: { consultationId: row.id } });
  assert.equal(hosp.dateEntree, PASSE);
});

test('date dans le futur ou invalide : refusée', async () => {
  const p = await f.run(() => PatientPHP.create({ matricule: `8${uid()}`, nom: 'FUTUR' }));
  const futur = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  for (const d of [futur, '10/05/2022']) {
    const res = await request(app).post('/api/php/consultations').set(as(focal))
      .send({ patientId: p.id, serviceName: 'Pharmacie', motif: 'X', dateConsultation: d });
    assert.equal(res.status, 400, `${d} : ${JSON.stringify(res.body)}`);
  }
});
