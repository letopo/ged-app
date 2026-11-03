// Module PHP : activité des infirmeries (Tableau PHP 2026, une feuille par mois).
// Par infirmerie de la visite et par jour : consultations et rendez-vous
// (généraliste, spécialiste de l'hôpital, spécialiste externe), labo, pharmacie,
// présentation de résultats ; semaines du lundi au dimanche ; jamais les
// consultations d'un autre établissement.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import sequelize from '../../src/config/database.js';
import { Infirmerie, PatientPHP, ConsultationPHP } from '../../src/models/index.js';
import { semainesDuMois } from '../../src/controllers/phpIndicateursController.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f; let g; let lecteur; let focalG; let infA; let infB;
const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();

before(async () => {
  f = makeFactory(await createTenant());
  g = makeFactory(await createTenant());
  lecteur = await f.user();
  await f.poste('php_lecture', [lecteur]);
  focalG = await g.user({ role: 'agent_accueil_php' });
  await f.run(async () => {
    infA = await Infirmerie.create({ code: `INF_A${uid()}`, nom: 'Infirmerie A', isActive: true });
    infB = await Infirmerie.create({ code: `INF_B${uid()}`, nom: 'Infirmerie B', isActive: true });
    const p = await PatientPHP.create({ matricule: `7${uid()}`, nom: 'ACTIVITE', infirmerieId: infB.id });
    const c = (day, typeVisite, serviceName, inf = infA) => ConsultationPHP.create({
      patientId: p.id, dateConsultation: day, typeVisite, serviceName, infirmerieId: inf?.id ?? null, resultat: 'en_cours',
    });
    await c('2030-09-02', 'CS', 'MEDECINE');
    await c('2030-09-02', 'CS', 'Médecine Générale');
    await c('2030-09-02', 'CS', 'MEDCINE');
    await c('2030-09-02', 'CS', 'CHIRURGIE');
    await c('2030-09-02', 'CS', 'OPHTALMOLOGIE');
    await c('2030-09-02', 'CS', 'Chirurgie pédiatrique');
    await c('2030-09-03', 'RDV', 'GYNECOLOGIE');
    await c('2030-09-03', 'RDV', 'DENTISTE');
    await c('2030-09-03', 'RDV', 'MEDECINE');
    await c('2030-09-03', 'AUTRE', 'LABORATOIRE');
    await c('2030-09-03', 'AUTRE', 'RADIOLOGIE');
    await c('2030-09-03', 'RDV', 'PHARMACIE');
    await c('2030-09-03', 'AUTRE', 'UROLOGIE');
    await c('2030-09-30', null, 'ORL', infB);
    await c('2030-09-30', 'CS', 'MEDECINE', null);
    await c('2030-10-01', 'CS', 'MEDECINE');
  });
  await g.run(async () => {
    const inf = await Infirmerie.create({ code: `INF_G${uid()}`, nom: 'Infirmerie G', isActive: true });
    const p = await PatientPHP.create({ matricule: `8${uid()}`, nom: 'AUTRE', infirmerieId: inf.id });
    await ConsultationPHP.create({ patientId: p.id, dateConsultation: '2030-09-02', typeVisite: 'CS', serviceName: 'MEDECINE', infirmerieId: inf.id, resultat: 'en_cours' });
  });
});
after(async () => {
  await f.dropPostes();
  await sequelize.close();
});

const sum = (rows, pred) => rows.filter(pred).reduce((s, r) => s + r.n, 0);

test('semaines du lundi au dimanche', () => {
  const s = semainesDuMois('2030-09'); // 1er septembre 2030 = dimanche
  assert.deepEqual(s[0].jours, ['2030-09-01']);
  assert.equal(s[1].jours[0], '2030-09-02');
  assert.equal(s[1].jours.length, 7);
  assert.equal(s.at(-1).jours.at(-1), '2030-09-30');
  assert.equal(s.reduce((n, w) => n + w.jours.length, 0), 30);
});

test('activité du mois : colonnes du tableau du Point Focal', async () => {
  const res = await request(app).get('/api/php/stats/activite').query({ mois: '2030-09' }).set(authHeaders(f.tenant, lecteur));
  assert.equal(res.status, 200);
  const { rows, infirmeries, colonnes, sansType, semaines } = res.body.data;
  assert.equal(colonnes.length, 9);
  assert.equal(semaines.length, 6);
  assert.deepEqual(infirmeries.map((i) => i.nom), ['Infirmerie A', 'Infirmerie B']);
  const at = (col, inf = infA.id) => sum(rows, (r) => r.col === col && r.infirmerieId === inf);
  assert.equal(at('cs_gen'), 3, 'médecine générale, fautes de frappe comprises');
  assert.equal(at('cs_int'), 1, 'chirurgie : spécialiste de l\'hôpital');
  assert.equal(at('cs_ext'), 2, 'ophtalmologie, chirurgie pédiatrique : spécialistes externes');
  assert.deepEqual([at('rdv_gen'), at('rdv_int'), at('rdv_ext')], [1, 1, 1]);
  assert.equal(at('labo'), 2, 'laboratoire et radiologie');
  assert.equal(at('pharmacie'), 1, 'pharmacie, même saisie en RDV');
  assert.equal(at('resultat'), 1, 'visite AUTRE vers un médecin : présentation de résultats');
  assert.equal(at('cs_ext', infB.id), 1, 'sans type saisi : compté en consultation');
  assert.equal(sansType, 1);
  assert.equal(at('cs_gen', null), 1, 'infirmerie non renseignée');
  assert.equal(sum(rows, () => true), 15, 'ni le mois suivant, ni l\'autre établissement');

  const other = await request(app).get('/api/php/stats/activite').query({ mois: '2030-09' }).set(authHeaders(g.tenant, focalG));
  assert.equal(sum(other.body.data.rows, () => true), 1);
  assert.equal(other.body.data.infirmeries.length, 1);
});
