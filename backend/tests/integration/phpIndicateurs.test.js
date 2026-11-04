// Module PHP, lot 2 : tableau du jour (infirmerie × type × service) et
// indicateurs (spécialité, secteur, mots-clés du diagnostic, repos), comme les
// tableaux croisés de l'Excel du Point Focal. L'infirmerie et le secteur sont
// ceux de la consultation ; jamais les consultations d'un autre établissement.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import sequelize from '../../src/config/database.js';
import { Infirmerie, Secteur, PatientPHP, ConsultationPHP, ReposPHP } from '../../src/models/index.js';
import { keywordsPattern, normKeyword } from '../../src/controllers/phpIndicateursController.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f; let g;
let focal; let lecteur; let focalG;
let infA; let infB; let secA; let secB;
const DAY = '2031-03-14';
const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();

before(async () => {
  f = makeFactory(await createTenant());
  g = makeFactory(await createTenant());
  focal = await f.user({ role: 'agent_accueil_php' });
  lecteur = await f.user();
  await f.poste('php_lecture', [lecteur]);
  focalG = await g.user({ role: 'agent_accueil_php' });

  await f.run(async () => {
    infA = await Infirmerie.create({ code: `INF_A${uid()}`, nom: 'Infirmerie A', isActive: true });
    infB = await Infirmerie.create({ code: `INF_B${uid()}`, nom: 'Infirmerie B', isActive: true });
    secA = await Secteur.create({ code: `SA${uid()}`, nom: 'SECTEUR A', infirmerieId: infA.id, isActive: true });
    secB = await Secteur.create({ code: `SB${uid()}`, nom: 'SECTEUR B', infirmerieId: infB.id, isActive: true });
    // Patient rattaché aujourd'hui à B, mais venu de A ce jour-là (comme la ligne de l'Excel)
    const p1 = await PatientPHP.create({ matricule: `9${uid()}`, nom: 'UN', secteurId: secB.id, infirmerieId: infB.id });
    const p2 = await PatientPHP.create({ matricule: `9${uid()}`, nom: 'DEUX', secteurId: secB.id, infirmerieId: infB.id });
    const c = (patientId, typeVisite, serviceName, diagnostic, inf, sec, day = DAY) => ConsultationPHP.create({
      patientId, dateConsultation: day, typeVisite, serviceName, diagnostic, infirmerieId: inf?.id ?? null, secteurId: sec?.id ?? null, resultat: 'en_cours',
    });
    await c(p1.id, 'CS', 'MEDECINE', 'Paludisme grave', infA, secA);
    await c(p1.id, 'RDV', 'MEDECINE', 'SUIVI PALUDISME', infA, secA, '2031-03-20');
    await c(p2.id, 'CS', 'MEDECINE', 'URÉTRITE', infB, secB);
    await c(p2.id, 'CS', 'GYNECOLOGIE', 'Persistance douleur', infB, secB);
    const rdv = await c(p2.id, 'RDV', 'GYNECOLOGIE', 'IST A INVESTIGUER', infB, secB);
    await c(p2.id, 'AUTRE', 'LABORATOIRE', null, null, null);
    await ReposPHP.create({ patientId: p2.id, consultationId: rdv.id, dateDebut: DAY, dateFin: '2031-03-16', dureeJours: 3, status: 'en_cours' });
  });
  // Autre établissement, même jour : ne doit jamais apparaître
  await g.run(async () => {
    const inf = await Infirmerie.create({ code: `INF_G${uid()}`, nom: 'Infirmerie G', isActive: true });
    const p = await PatientPHP.create({ matricule: `8${uid()}`, nom: 'AUTRE', infirmerieId: inf.id });
    await ConsultationPHP.create({ patientId: p.id, dateConsultation: DAY, typeVisite: 'CS', serviceName: 'MEDECINE', diagnostic: 'PALUDISME', infirmerieId: inf.id, resultat: 'en_cours' });
  });
});
after(async () => {
  await f.dropPostes();
  await sequelize.close();
});

const as = (u, fac = f) => authHeaders(fac.tenant, u);
const count = (rows, pred) => rows.filter(pred).reduce((s, r) => s + r.n, 0);

test('tableau du jour : infirmerie de la visite, type et service', async () => {
  const res = await request(app).get('/api/php/stats/tableau-jour').query({ date: DAY }).set(as(lecteur));
  assert.equal(res.status, 200);
  const { rows, infirmeries, navigation } = res.body.data;
  assert.deepEqual(infirmeries.map((i) => i.nom), ['Infirmerie A', 'Infirmerie B']);
  assert.equal(count(rows, (r) => r.infirmerieId === infA.id), 1, 'compté à A (lieu de la visite), pas à B (fiche actuelle)');
  assert.equal(count(rows, (r) => r.infirmerieId === infB.id && r.type === 'CS'), 2);
  assert.equal(count(rows, (r) => r.infirmerieId === infB.id && r.type === 'RDV' && r.service === 'GYNECOLOGIE'), 1);
  assert.equal(count(rows, (r) => r.infirmerieId === null && r.type === 'AUTRE'), 1);
  assert.equal(count(rows, () => true), 5, 'pas la consultation de l\'autre établissement');
  assert.equal(navigation.next, '2031-03-20');
});

test('indicateurs par mots-clés : configurables, sans accents ni faux positifs', async () => {
  assert.equal((await request(app).put('/api/php/stats/indicateurs/config').set(as(lecteur)).send({ indicateurs: [] })).status, 403);
  const save = await request(app).put('/api/php/stats/indicateurs/config').set(as(focal)).send({
    indicateurs: [{ libelle: 'Paludisme', motsCles: ['palu'] }, { libelle: 'IST', motsCles: ['IST', 'urétrit'] }],
  });
  assert.equal(save.status, 200, JSON.stringify(save.body));
  assert.deepEqual(save.body.data[1].motsCles, ['IST', 'URETRIT']);
  assert.equal((await request(app).put('/api/php/stats/indicateurs/config').set(as(focal)).send({ indicateurs: [{ libelle: 'Vide', motsCles: [] }] })).status, 400);

  const res = await request(app).get('/api/php/stats/indicateurs').query({ du: '2031-03-01', au: '2031-03-31' }).set(as(lecteur));
  assert.equal(res.status, 200);
  const { indicateurs, parService, parSecteur, repos } = res.body.data;
  const palu = indicateurs.find((i) => i.libelle === 'Paludisme').rows;
  assert.equal(count(palu, (r) => r.libelle === 'SECTEUR A'), 2, 'CS + RDV de suivi');
  assert.equal(count(palu, () => true), 2, 'pas l\'autre établissement');
  const ist = indicateurs.find((i) => i.libelle === 'IST').rows;
  assert.equal(count(ist, () => true), 2, 'URÉTRITE (accent) + IST A INVESTIGUER, pas « Persistance »');
  assert.equal(count(parService, (r) => r.libelle === 'MEDECINE'), 3);
  assert.equal(count(parService, (r) => r.libelle === 'GYNECOLOGIE' && r.type === 'RDV'), 1);
  assert.equal(count(parSecteur, (r) => r.libelle === 'SECTEUR B'), 3);
  assert.equal(count(parSecteur, (r) => r.libelle === 'SECTEUR NON PRÉCISÉ'), 1);
  assert.deepEqual(repos, [{ libelle: 'GYNECOLOGIE', n: 1, jours: 3 }]);

  // l'autre établissement n'a pas ces indicateurs
  const other = await request(app).get('/api/php/stats/indicateurs/config').set(as(focalG, g));
  assert.deepEqual(other.body.data, []);
});

test('mots-clés : début de mot, caractères spéciaux pris à la lettre', () => {
  assert.equal(normKeyword('  urétrite  aiguë '), 'URETRITE AIGUE');
  assert.equal(keywordsPattern(['palu', 'PALU', '']), '\\m(PALU)');
  assert.equal(keywordsPattern(['a.b', 'c+']), '\\m(A\\.B|C\\+)');
  assert.equal(keywordsPattern([]), null);
});

test('créer une consultation : elle garde l\'infirmerie et le secteur du patient', async () => {
  const p = await f.run(() => PatientPHP.create({ matricule: `7${uid()}`, nom: 'TROIS', secteurId: secA.id, infirmerieId: infA.id }));
  const res = await request(app).post('/api/php/consultations').set(as(focal)).send({ patientId: p.id, typeVisite: 'CS', serviceName: 'MEDECINE', dateConsultation: '2021-04-02' });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const row = await ConsultationPHP.findByPk(res.body.data.id);
  assert.equal(row.infirmerieId, infA.id);
  assert.equal(row.secteurId, secA.id);
});
