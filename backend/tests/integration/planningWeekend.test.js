// Planning du week-end (18/11/2026) : un planning par week-end choisi, plusieurs
// dans le même mois ; le même week-end ne peut pas être créé deux fois.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import sequelize from '../../src/config/database.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f; let admin;
const creer = (startDate, endDate, scheduleType = 'weekend') => request(app).post('/api/schedules').set(authHeaders(f.tenant, admin))
  .send({ title: `Planning ${startDate}`, scheduleType, month: 11, year: 2031, startDate, endDate });

before(async () => {
  f = makeFactory(await createTenant());
  admin = await f.user({ role: 'admin' });
});
after(async () => { await sequelize.close(); });

test('deux week-ends du même mois : deux plannings', async () => {
  const a = await creer('2031-11-01', '2031-11-02');
  assert.equal(a.status, 201, JSON.stringify(a.body));
  const b = await creer('2031-11-08', '2031-11-09');
  assert.equal(b.status, 201, JSON.stringify(b.body));
});

test('le même week-end deux fois : refusé', async () => {
  const res = await creer('2031-11-08', '2031-11-09');
  assert.equal(res.status, 400);
});

test('autres plannings : toujours un seul par mois', async () => {
  assert.equal((await creer('2031-11-01', '2031-11-30', 'administrative')).status, 201);
  assert.equal((await creer('2031-11-01', '2031-11-30', 'administrative')).status, 400);
});

// Programme du week-end au format du modèle papier (19/11/2026)
const creerProgramme = (startDate, endDate, extra = {}) => request(app).post('/api/schedules').set(authHeaders(f.tenant, admin))
  .send({ title: `Programme ${startDate}`, scheduleType: 'weekend', month: 8, year: 2032, startDate, endDate, ...extra });
const enregistrer = (id, content) => request(app).put(`/api/schedules/${id}/programme`).set(authHeaders(f.tenant, admin)).send({ content });

test('premier programme : structure du modèle (services, Radiologie d’astreinte sur tout le week-end)', async () => {
  const res = await creerProgramme('2032-08-07', '2032-08-08');
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const c = res.body.content;
  assert.ok(c.services.length >= 10);
  const radio = c.services.find((s) => s.nom === 'RADIOLOGIE');
  assert.equal(radio.astreinte, true);
  assert.deepEqual(radio.lignes[0].map((x) => x.span), [5, 0, 0, 0, 0]);
  assert.equal(c.services.find((s) => s.nom === 'S.A.U.').lignes.length, 2);
  // Programme vide : pas de soumission
  const vide = await creerProgramme('2032-08-28', '2032-08-29');
  assert.equal((await enregistrer(vide.body.id, { services: [{ nom: 'S.A.U.', lignes: [[{ texte: '' }]] }] })).status, 200);
  const sub = await request(app).post(`/api/schedules/${vide.body.id}/submit`).set(authHeaders(f.tenant, admin));
  assert.equal(sub.status, 400);
});

test('enregistrer puis créer le week-end suivant : tout est repris du précédent', async () => {
  const premier = (await request(app).get('/api/schedules').set(authHeaders(f.tenant, admin)).query({ year: 2032 }))
    .body;
  const liste = Array.isArray(premier) ? premier : premier.schedules || premier.data || [];
  const sched = liste.find((s) => s.startDate === '2032-08-07');
  assert.ok(sched, 'programme du 07/08 introuvable');
  const content = {
    entete: { direction: [{ label: 'DS', valeur: '600 000 001' }], superviseurManagement: 'DDS', responsables: [{ label: 'SUPERVISEUR', valeur: 'DR TEST' }] },
    services: [
      { nom: 'S.A.U.', lignes: [[{ texte: 'AGENT A/AGENT B' }, { texte: 'AGENT C' }, { texte: '' }, { texte: 'AGENT C' }, { texte: '' }]] },
      // span trop grand et case recouverte envoyée : remis d'aplomb
      { nom: 'RADIOLOGIE', astreinte: true, lignes: [[{ texte: 'AGENT D', span: 9 }, { texte: 'x', span: 0 }]] },
      { nom: '', lignes: [] },
    ],
  };
  const res = await enregistrer(sched.id, content);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.schedule.content.services.length, 2);
  assert.deepEqual(res.body.schedule.content.services[1].lignes[0], [
    { texte: 'AGENT D', span: 5 }, { texte: '', span: 0 }, { texte: '', span: 0 }, { texte: '', span: 0 }, { texte: '', span: 0 },
  ]);

  const suivant = await creerProgramme('2032-08-14', '2032-08-15');
  assert.equal(suivant.status, 201, JSON.stringify(suivant.body));
  assert.equal(suivant.body.content.entete.direction[0].valeur, '600 000 001');
  assert.equal(suivant.body.content.services[0].lignes[0][0].texte, 'AGENT A/AGENT B');

  // Soumis : il n'est plus modifiable
  const sub = await request(app).post(`/api/schedules/${sched.id}/submit`).set(authHeaders(f.tenant, admin));
  assert.equal(sub.status, 200, JSON.stringify(sub.body));
  assert.equal((await enregistrer(sched.id, content)).status, 409);
});
