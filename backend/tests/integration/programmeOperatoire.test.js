// Programme opératoire de la semaine rempli par tous les services :
//  - saisie (poste bloc_saisie) : ajoute ses lignes jusqu'au vendredi 12 h, ne
//    modifie que les siennes ; la direction consulte ; les autres n'ont pas accès ;
//  - responsable (bloc_responsable) : modifie tout, même après la date limite,
//    gère les services, clôture (plus aucune saisie) puis marque « envoyé » ;
//  - document « Planning Opératoire » : circuit imposé Médecin Chef → DG.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import sequelize from '../../src/config/database.js';
import { blocDeadline, parseWeekStart } from '../../src/controllers/blocController.js';
import { buildFixedPosteChain } from '../../src/utils/posteChain.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f;
let chir, gyneco, responsable, medChef, dg, director, nobody;

before(async () => {
  f = makeFactory(await createTenant());
  [chir, gyneco, responsable, medChef, dg, nobody] = await Promise.all([f.user(), f.user(), f.user(), f.user(), f.user(), f.user()]);
  director = await f.user({ role: 'director' });
  await f.poste('bloc_saisie', [chir, gyneco]);
  await f.poste('bloc_responsable', [responsable]);
  await f.poste('medecin_chef', [medChef]);
  await f.poste('dg', [dg]);
});
after(async () => {
  await f.dropPostes();
  await sequelize.close();
});

const as = (user) => authHeaders(f.tenant, user);
// Semaine lointaine : saisie encore ouverte ; semaine passée : date limite dépassée
const OPEN_WEEK = '2099-11-02';
const PAST_WEEK = '2020-11-02';
const line = (service, extra = {}) => ({ service, jour: 'MARDI', nomPatient: 'AKWO PRUDENCIA', age: '47 ANS', natureIntervention: 'HRT TOTALE', intervenant: 'DR MBOUOPDA', numeroSalle: '2', ...extra });

test('date limite : vendredi 12 h (Douala) avant le lundi ; seuls les lundis sont des semaines', () => {
  assert.equal(blocDeadline('2026-11-02').toISOString(), '2026-10-30T11:00:00.000Z');
  assert.equal(parseWeekStart('2026-11-02'), '2026-11-02');
  assert.equal(parseWeekStart('2026-11-03'), null);
  assert.equal(parseWeekStart('n-importe'), null);
});

test('accès : saisie, responsable et direction ; pas les autres', async () => {
  for (const u of [chir, responsable, director]) {
    const r = await request(app).get(`/api/bloc/semaines/${OPEN_WEEK}`).set(as(u));
    assert.equal(r.status, 200);
  }
  const r = await request(app).get(`/api/bloc/semaines/${OPEN_WEEK}`).set(as(nobody));
  assert.equal(r.status, 403);
  const add = await request(app).post(`/api/bloc/semaines/${OPEN_WEEK}/interventions`).set(as(director)).send(line('Chirurgie'));
  assert.equal(add.status, 403, 'la direction consulte sans saisir');
});

test('deux services saisissent la même semaine ; chacun ne modifie que ses lignes', async () => {
  const a = await request(app).post(`/api/bloc/semaines/${OPEN_WEEK}/interventions`).set(as(chir)).send(line('Chirurgie', { jour: 'MERCREDI' }));
  const b = await request(app).post(`/api/bloc/semaines/${OPEN_WEEK}/interventions`).set(as(gyneco)).send(line('Gynécologie', { jour: 'LUNDI' }));
  assert.equal(a.status, 201);
  assert.equal(b.status, 201);

  const week = (await request(app).get(`/api/bloc/semaines/${OPEN_WEEK}`).set(as(chir))).body.data;
  assert.deepEqual(week.interventions.map(l => [l.jour, l.service]), [['LUNDI', 'Gynécologie'], ['MERCREDI', 'Chirurgie']], 'triées par jour');
  assert.deepEqual(week.interventions.map(l => l.canEdit), [false, true]);

  const steal = await request(app).put(`/api/bloc/interventions/${b.body.data.id}`).set(as(chir)).send({ age: '12 ANS' });
  assert.equal(steal.status, 403);
  const own = await request(app).put(`/api/bloc/interventions/${a.body.data.id}`).set(as(chir)).send({ age: '50 ANS' });
  assert.equal(own.status, 200);
  const byResp = await request(app).put(`/api/bloc/interventions/${b.body.data.id}`).set(as(responsable)).send({ numeroSalle: '1' });
  assert.equal(byResp.status, 200);
});

test('champs obligatoires et service de la liste', async () => {
  const missing = await request(app).post(`/api/bloc/semaines/${OPEN_WEEK}/interventions`).set(as(chir)).send(line('Chirurgie', { nomPatient: '' }));
  assert.equal(missing.status, 400);
  const unknown = await request(app).post(`/api/bloc/semaines/${OPEN_WEEK}/interventions`).set(as(chir)).send(line('Urologie'));
  assert.equal(unknown.status, 400);
  assert.equal((await request(app).put('/api/bloc/services').set(as(chir)).send({ services: ['Urologie'] })).status, 403);
  const set = await request(app).put('/api/bloc/services').set(as(responsable)).send({ services: ['Chirurgie', 'Gynécologie', 'Urologie'] });
  assert.equal(set.status, 200);
  const ok = await request(app).post(`/api/bloc/semaines/${OPEN_WEEK}/interventions`).set(as(chir)).send(line('Urologie'));
  assert.equal(ok.status, 201);
});

test('après le vendredi 12 h : seul le responsable saisit encore', async () => {
  const late = await request(app).post(`/api/bloc/semaines/${PAST_WEEK}/interventions`).set(as(chir)).send(line('Chirurgie'));
  assert.equal(late.status, 409);
  const resp = await request(app).post(`/api/bloc/semaines/${PAST_WEEK}/interventions`).set(as(responsable)).send(line('Chirurgie'));
  assert.equal(resp.status, 201);
});

test('clôture : plus aucune saisie ; réservée au responsable ; rouvrir puis envoyer', async () => {
  assert.equal((await request(app).post(`/api/bloc/semaines/${OPEN_WEEK}/statut`).set(as(chir)).send({ status: 'cloture' })).status, 403);
  assert.equal((await request(app).post(`/api/bloc/semaines/${OPEN_WEEK}/statut`).set(as(responsable)).send({ status: 'envoye' })).status, 409, 'clôturer avant d\'envoyer');
  assert.equal((await request(app).post(`/api/bloc/semaines/${OPEN_WEEK}/statut`).set(as(responsable)).send({ status: 'cloture' })).status, 200);

  const add = await request(app).post(`/api/bloc/semaines/${OPEN_WEEK}/interventions`).set(as(chir)).send(line('Chirurgie'));
  assert.equal(add.status, 409);
  const week = (await request(app).get(`/api/bloc/semaines/${OPEN_WEEK}`).set(as(responsable))).body.data;
  assert.equal(week.status, 'cloture');
  assert.ok(week.interventions.every(l => !l.canEdit), 'clôturé : même le responsable doit rouvrir');

  assert.equal((await request(app).post(`/api/bloc/semaines/${OPEN_WEEK}/statut`).set(as(responsable)).send({ status: 'ouvert' })).status, 200);
  assert.equal((await request(app).post(`/api/bloc/semaines/${OPEN_WEEK}/interventions`).set(as(chir)).send(line('Chirurgie'))).status, 201);
  await request(app).post(`/api/bloc/semaines/${OPEN_WEEK}/statut`).set(as(responsable)).send({ status: 'cloture' });
  const sent = await request(app).post(`/api/bloc/semaines/${OPEN_WEEK}/statut`).set(as(responsable)).send({ status: 'envoye' });
  assert.equal(sent.status, 200);
});

test('document « Planning Opératoire » : Médecin Chef puis DG', async () => {
  const built = await f.run(() => buildFixedPosteChain('Planning Opératoire'));
  assert.deepEqual(built.validatorIds, [medChef.id, dg.id]);
});
