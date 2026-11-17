// Module PHP : lien patient ↔ fiche du DME et recherche par n° de dossier
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import sequelize from '../../src/config/database.js';
import { PatientPHP, PhpPatientDme, ConsultationPHP } from '../../src/models/index.js';
import { lierAutomatiquement } from '../../src/utils/phpPatientDme.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f, lecteur, saisie, p1, p2;
const suffixe = String(Date.now()).slice(-5);
const as = (user) => authHeaders(f.tenant, user);

before(async () => {
  f = makeFactory(await createTenant());
  [lecteur, saisie] = await Promise.all([f.user(), f.user()]);
  await f.poste('php_lecture', [lecteur]);
  await f.poste('php', [saisie]);
  p1 = await PatientPHP.create({ tenantId: f.tenant.id, matricule: `91${suffixe}1`, nom: 'ESSAI', prenom: 'Premier' });
  p2 = await PatientPHP.create({ tenantId: f.tenant.id, matricule: `91${suffixe}2`, nom: 'ESSAI', prenom: 'Second' });
  await ConsultationPHP.create({ patientId: p1.id, dateConsultation: '2026-11-17', serviceName: 'Médecine' });
  await ConsultationPHP.create({ patientId: p2.id, dateConsultation: '2026-11-17', serviceName: 'Médecine' });
});
after(async () => {
  await f.dropPostes();
  await sequelize.close();
});

test('liens automatiques : même matricule seulement, pas une fiche déjà liée à un autre patient', async () => {
  const fiche = (id, raisons) => ({ id, dossier_numero: `HSJM9${id}`, nom: 'ESSAI', prenom: 'X', raisons });
  const n = await lierAutomatiquement(f.tenant.id, [
    { patientId: p1.id, recherche: { confiance: 'sure', fiches: [fiche(501, ['matricule']), fiche(502, ['nom complet', 'matricule voisin']), fiche(504, ['compte Sage'])] } },
    { patientId: p2.id, recherche: { confiance: 'sure', fiches: [fiche(504, ['matricule'])] } },
    { patientId: p2.id, recherche: { confiance: 'probable', fiches: [fiche(503, ['nom complet'])] } },
  ]);
  assert.equal(n, 1);
  const rows = await PhpPatientDme.findAll({ where: { tenantId: f.tenant.id }, order: [['dmePatientId', 'ASC']] });
  // 504 proposée aux deux patients : personne ; 502 (matricule voisin) et 503 (probable) : à confirmer à la main
  assert.ok(!rows.some((r) => r.dmePatientId === 504));
  assert.ok(rows.some((r) => r.patientId === p1.id && r.dmePatientId === 501 && r.source === 'auto' && r.statut === 'confirme'));
  assert.ok(!rows.some((r) => r.dmePatientId === 502));
  assert.ok(!rows.some((r) => r.dmePatientId === 503));
  // une 2e passe n'ajoute rien de plus pour p1
  await lierAutomatiquement(f.tenant.id, [{ patientId: p1.id, recherche: { confiance: 'sure', fiches: [fiche(501, ['matricule'])] }, liens: { confirmes: [501] } }]);
  assert.equal(await PhpPatientDme.count({ where: { patientId: p1.id, dmePatientId: 501 } }), 1);
  // 501 déjà liée à p1 : jamais liée d'office à p2
  await lierAutomatiquement(f.tenant.id, [{ patientId: p2.id, recherche: { confiance: 'sure', fiches: [fiche(501, ['matricule'])] } }]);
  assert.equal(await PhpPatientDme.count({ where: { patientId: p2.id } }), 0);
});

test('liens d’un patient, recherche par n° de dossier (patients et consultations)', async () => {
  const r = await request(app).get(`/api/php/patients/${p1.id}/dme`).set(as(lecteur));
  assert.equal(r.status, 200); assert.equal(r.body.liens[0].dossier, 'HSJM9501');
  const pats = await request(app).get('/api/php/patients?search=HSJM9501').set(as(lecteur));
  assert.deepEqual(pats.body.data.map((p) => p.id), [p1.id]);
  const cons = await request(app).get('/api/php/consultations?search=HSJM9501&date=2026-11-17').set(as(lecteur));
  assert.deepEqual(cons.body.data.map((c) => c.patientId), [p1.id]);
  // la recherche par nom de la page Consultations fonctionne aussi
  const parNom = await request(app).get('/api/php/consultations?search=second&date=2026-11-17').set(as(lecteur));
  assert.deepEqual(parNom.body.data.map((c) => c.patientId), [p2.id]);
});

test('décisions : réservées à la saisie PHP ; DME non réglé = 409 ; annulation', async () => {
  assert.equal((await request(app).post(`/api/php/patients/${p1.id}/dme`).set(as(lecteur)).send({ dmePatientId: 501, statut: 'ecarte' })).status, 403);
  const r = await request(app).post(`/api/php/patients/${p1.id}/dme`).set(as(saisie)).send({ dossier: 'HSJM1', statut: 'confirme' });
  assert.equal(r.status, 409); assert.match(r.body.message, /DME non réglée/);
  assert.equal((await request(app).post(`/api/php/patients/${p1.id}/dme`).set(as(saisie)).send({ dmePatientId: 501, statut: 'peut-etre' })).status, 400);
  assert.equal((await request(app).delete(`/api/php/patients/${p1.id}/dme/501`).set(as(lecteur))).status, 403);
  assert.equal((await request(app).delete(`/api/php/patients/${p1.id}/dme/501`).set(as(saisie))).status, 200);
  assert.equal((await request(app).delete(`/api/php/patients/${p1.id}/dme/501`).set(as(saisie))).status, 404);
});
