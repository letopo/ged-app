// Planning des médecins au format du modèle papier (19/11/2026) : astreintes et
// services × périodes du mois, repris du mois précédent, modifiable en brouillon.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import sequelize from '../../src/config/database.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';
import { periodesDuMois } from '../../src/utils/planningMedecins.js';

const { default: app } = await import('../../src/server.js');

let f; let admin;
const as = () => authHeaders(f.tenant, admin);
const creer = (month, year) => request(app).post('/api/schedules').set(as()).send({
  title: `Médecins ${month}/${year}`, scheduleType: 'medical_duties', month, year,
  startDate: `${year}-${String(month).padStart(2, '0')}-01`, endDate: `${year}-${String(month).padStart(2, '0')}-28`,
});

before(async () => {
  f = makeFactory(await createTenant());
  admin = await f.user({ role: 'admin' });
});
after(async () => { await sequelize.close(); });

test('périodes de mars 2026 : comme le planning papier (dimanche 1er seul, semaines, week-ends)', () => {
  assert.deepEqual(periodesDuMois(2026, 3).map((p) => `${p.debut}-${p.fin}${p.weekEnd ? 'we' : ''}`),
    ['1-1we', '2-6', '7-8we', '9-13', '14-15we', '16-20', '21-22we', '23-27', '28-29we', '30-31']);
});

test('premier planning : lignes du modèle, week-ends des services grisés ; vide = pas de soumission', async () => {
  const res = await creer(3, 2034);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const t = res.body.content.tableau;
  assert.equal(t.lignes.length, 9);
  const sau = t.lignes.find((l) => l.nom === 'SAU*');
  assert.equal(sau.cases.filter((c) => c.grise).length, 4); // 4 week-ends en mars 2034
  assert.equal((await request(app).post(`/api/schedules/${res.body.id}/submit`).set(as())).status, 400);
});

test('enregistrer puis créer le mois suivant : noms repris semaine par semaine', async () => {
  const liste = (await request(app).get('/api/schedules').set(as()).query({ year: 2034 })).body;
  const sched = (Array.isArray(liste) ? liste : liste.schedules || []).find((s) => s.scheduleType === 'medical_duties' && s.month === 3);
  const lu = (await request(app).get(`/api/schedules/${sched.id}`).set(as())).body.content.tableau;
  lu.lignes[0].superviseur = 'Dr X';
  lu.lignes[0].cases = lu.lignes[0].cases.map((c, i) => ({ ...c, texte: `Dr ${i}` }));
  // cases fusionnées : 2 premières périodes en une seule
  const [a, b, ...reste] = lu.lignes[1].cases;
  lu.lignes[1].cases = [{ debut: a.debut, fin: b.fin, texte: 'Dr FUSION', grise: false }, ...reste];
  const res = await request(app).put(`/api/schedules/${sched.id}/tableau`).set(as()).send({ tableau: lu });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.schedule.content.tableau.lignes[1].cases[0].fin, b.fin);

  // Cases trouées : découpage par défaut rétabli
  const troue = structuredClone(lu); troue.lignes[2].cases = [{ debut: 3, fin: 5, texte: 'x' }];
  const r2 = await request(app).put(`/api/schedules/${sched.id}/tableau`).set(as()).send({ tableau: troue });
  assert.equal(r2.body.schedule.content.tableau.lignes[2].cases[0].debut, 1);

  const avril = await creer(4, 2034);
  assert.equal(avril.status, 201, JSON.stringify(avril.body));
  const l0 = avril.body.content.tableau.lignes[0];
  assert.equal(l0.superviseur, 'Dr X');
  assert.ok(l0.cases.every((c) => c.texte.startsWith('Dr ')));
  assert.equal(avril.body.content.tableau.mois, '2034-04');
  assert.equal((await request(app).post(`/api/schedules/${sched.id}/submit`).set(as())).status, 200);
  assert.equal((await request(app).put(`/api/schedules/${sched.id}/tableau`).set(as()).send({ tableau: lu })).status, 409);
});
