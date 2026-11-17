// Parc véhicules : oxygène des ambulances (retours de la responsable RO SAU,
// 17/11/2026) — carte oxygène et consommation, commandes passées par le
// Biomédical (prévenu au manque), plus de départ / retour pour les ambulances.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import request from 'supertest';
import sharp from 'sharp';
import sequelize from '../../src/config/database.js';
import { Vehicle, VehicleShiftCheck, VehicleChecklistTemplate, VehicleMission } from '../../src/models/index.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';
import { oxygenConsumption } from '../../src/utils/vehicleShift.js';

const { default: app } = await import('../../src/server.js');

const POSTE = `chef_pole_ro_sau_o${Date.now() % 100000}`;
let f; let infirmier; let biomed; let agent; let chefPole; let amb1; let amb2; let signature;

before(async () => {
  f = makeFactory(await createTenant());
  // Noms de service uniques dans toute la base de test
  const n = Date.now() % 100000;
  const sau = await f.service(`SAU O2 ${n}`);
  const bio = await f.service(`Biomédical ${n}`);
  infirmier = await f.user();
  await f.member(infirmier, sau);
  biomed = await f.user();
  await f.member(biomed, bio);
  agent = await f.user();
  chefPole = await f.user();
  await f.poste(POSTE, [chefPole]);
  amb1 = await f.run(() => Vehicle.create({ label: 'Ambulance IT', immatriculation: `IT ${Date.now() % 100000}`, vehicleType: 'ambulance', serviceId: sau.id, managerPosteCode: POSTE }));
  amb2 = await f.run(() => Vehicle.create({ label: 'Ambulance LT', immatriculation: `LT ${Date.now() % 100000}`, vehicleType: 'ambulance', serviceId: sau.id, managerPosteCode: POSTE }));
  const png = await sharp({ create: { width: 300, height: 120, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: Buffer.from('<svg width="300" height="120"><path d="M10 80 C 60 10, 120 120, 290 40" stroke="#123" stroke-width="5" fill="none"/></svg>') }])
    .png().toBuffer();
  signature = `data:image/png;base64,${png.toString('base64')}`;
});
after(async () => {
  const shifts = await f.run(() => VehicleShiftCheck.findAll());
  for (const s of shifts) if (s.signaturePath) await fs.rm(path.resolve(process.cwd(), s.signaturePath), { force: true });
  await f.dropPostes();
  await sequelize.close();
});

const shift = (bottles1, bottles2, reserveFull, reserveEmpty) => request(app).post('/api/vehicles/shift').set(authHeaders(f.tenant, infirmier))
  .send({ part: 'soignant', vehicles: [{ vehicleId: amb1.id, answers: [], bottles: bottles1 }, { vehicleId: amb2.id, answers: [], bottles: bottles2 }], reserveFull, reserveEmpty, signature });

test('consommation : pleines avant + reçues − pleines après', () => {
  const s = (at, r, a, b) => ({ at, reserveFull: r, vehicles: [{ bottles: a }, { bottles: b }] });
  const iv = oxygenConsumption([s('2026-11-10T07:00Z', 4, 2, 2), s('2026-11-11T07:00Z', 2, 2, 1), s('2026-11-12T07:00Z', 4, 2, 2)], [{ at: '2026-11-11T15:00Z', quantity: 4 }]);
  assert.deepEqual(iv.map((x) => x.used), [3, 1]);
});

test('accès : le Biomédical entre dans le module (onglet Oxygène) et commande ; un agent n\'a pas accès', async () => {
  const me = await request(app).get('/api/vehicles/me').set(authHeaders(f.tenant, biomed));
  assert.equal(me.status, 200);
  assert.equal(me.body.data.hasModule, true);
  assert.equal(me.body.data.oxygen.canOrder, true);
  const soignant = await request(app).get('/api/vehicles/oxygen').set(authHeaders(f.tenant, infirmier));
  assert.equal(soignant.status, 200);
  assert.equal(soignant.body.data.access.canOrder, false, 'le soignant consulte et réceptionne, sans commander');
  const no = await request(app).get('/api/vehicles/oxygen').set(authHeaders(f.tenant, agent));
  assert.equal(no.status, 403);
  const noOrder = await request(app).post('/api/vehicles/oxygen/orders').set(authHeaders(f.tenant, infirmier)).send({ quantity: 4 });
  assert.equal(noOrder.status, 403);
});

test('prise de poste, commande du Biomédical, « bouteilles commandées », réception et consommation', async () => {
  const r1 = await shift(2, 2, 4, 0);
  assert.equal(r1.status, 201, r1.body?.message);
  const r2 = await shift(2, 1, 0, 5); // plus de pleine en réserve + une ambulance à 1 → urgent
  assert.equal(r2.status, 201, r2.body?.message);
  assert.equal(r2.body.data.oxygen.level, 'urgent');

  const order = await request(app).post('/api/vehicles/oxygen/orders').set(authHeaders(f.tenant, biomed))
    .send({ quantity: 4, supplier: 'Air Liquide', source: 'externe', expectedOn: null });
  assert.equal(order.status, 201, order.body?.message);
  assert.equal(order.body.data.source, 'externe');

  // La fiche suivante relève les bouteilles commandées
  const st = await request(app).get('/api/vehicles/shift').set(authHeaders(f.tenant, infirmier));
  assert.equal(st.body.data.oxygen.ordered.quantity, 4);
  const r3 = await shift(2, 1, 0, 5);
  assert.equal(r3.body.data.shift.reserveOrdered, 4);

  const rec = await request(app).post(`/api/vehicles/oxygen/orders/${order.body.data.id}/receive`).set(authHeaders(f.tenant, infirmier)).send({ quantity: 4 });
  assert.equal(rec.status, 200, rec.body?.message);
  assert.equal(rec.body.data.status, 'recue');
  const again = await request(app).post(`/api/vehicles/oxygen/orders/${order.body.data.id}/receive`).set(authHeaders(f.tenant, infirmier)).send({});
  assert.equal(again.status, 409);

  await shift(2, 2, 3, 1); // 4 reçues : 3 pleines + 1 dans l'ambulance LT
  const ox = await request(app).get('/api/vehicles/oxygen').set(authHeaders(f.tenant, biomed));
  assert.equal(ox.status, 200);
  assert.equal(ox.body.data.ordered, 0);
  assert.equal(ox.body.data.stock.reserveFull, 3);
  // 8 → 3 (5) ; 3 → 3 (0) ; 3 + 4 reçues → 7 (0)
  assert.equal(ox.body.data.consumption.month, 5);
});

test('annulation : motif obligatoire, réservée au Biomédical et aux responsables', async () => {
  const o = await request(app).post('/api/vehicles/oxygen/orders').set(authHeaders(f.tenant, chefPole)).send({ quantity: 2 });
  assert.equal(o.status, 201, o.body?.message);
  assert.equal((await request(app).post(`/api/vehicles/oxygen/orders/${o.body.data.id}/cancel`).set(authHeaders(f.tenant, infirmier)).send({ reason: 'x' })).status, 403);
  assert.equal((await request(app).post(`/api/vehicles/oxygen/orders/${o.body.data.id}/cancel`).set(authHeaders(f.tenant, biomed)).send({})).status, 400);
  const c = await request(app).post(`/api/vehicles/oxygen/orders/${o.body.data.id}/cancel`).set(authHeaders(f.tenant, biomed)).send({ reason: 'Doublon' });
  assert.equal(c.body.data.status, 'annulee');
});

test('ambulances : pas de départ / retour au tableau de bord, et l\'option ne se réactive pas', async () => {
  await f.run(() => VehicleMission.create({ vehicleId: amb1.id, title: 'Référence Douala', status: 'terminee', plannedDepartureAt: new Date(Date.now() - 5 * 3600000), departedAt: new Date(Date.now() - 5 * 3600000), returnedAt: new Date(Date.now() - 3600000), crew: [] }));
  const dash = await request(app).get('/api/vehicles/missions').set(authHeaders(f.tenant, chefPole));
  assert.equal(dash.status, 200, dash.body?.message);
  const m = dash.body.data.missions.find((x) => x.title === 'Référence Douala');
  assert.ok(m);
  assert.equal(m.missionChecks, false);
  assert.equal(m.alerts.retourMissing, false);
  assert.equal(m.alerts.departMissing, false);

  const tpl = await f.run(() => VehicleChecklistTemplate.findOne({ where: { vehicleType: 'ambulance' } }));
  const put = await request(app).put(`/api/vehicles/templates/${tpl.id}`).set(authHeaders(f.tenant, chefPole))
    .send({ sections: tpl.sections, missionChecks: true });
  assert.equal(put.status, 200, put.body?.message);
  assert.equal(put.body.data.missionChecks, false);
});
