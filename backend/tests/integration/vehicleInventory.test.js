// Parc véhicules : inventaire des ambulances RO SAU (demande du 03/11/2026).
// Ouvert tous les jours, visible dans la modale de l'ambulance une fois fait,
// et la fiche PDF part chez le responsable (Chef de pôle RO SAU).
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import request from 'supertest';
import sharp from 'sharp';
import sequelize from '../../src/config/database.js';
import { Vehicle, VehicleInventory, Document, DocumentTransmission } from '../../src/models/index.js';
import { doualaDay } from '../../src/utils/vehicleChecklist.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

// Code de poste propre au fichier (les codes sont uniques dans toute la base)
const POSTE = `chef_pole_ro_sau_t${Date.now() % 100000}`;
let f; let infirmier; let chefPole; let amb; let signature;
const files = [];

before(async () => {
  f = makeFactory(await createTenant());
  const sau = await f.service('SAU');
  infirmier = await f.user();
  await f.member(infirmier, sau);
  chefPole = await f.user();
  await f.poste(POSTE, [chefPole]);
  amb = await f.run(() => Vehicle.create({ label: 'Ambulance IT', immatriculation: `IT ${Date.now() % 100000}`, vehicleType: 'ambulance', serviceId: sau.id, managerPosteCode: POSTE }));
  const png = await sharp({ create: { width: 300, height: 120, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: Buffer.from('<svg width="300" height="120"><path d="M10 80 C 60 10, 120 120, 290 40" stroke="#123" stroke-width="5" fill="none"/></svg>') }])
    .png().toBuffer();
  signature = `data:image/png;base64,${png.toString('base64')}`;
});
after(async () => {
  for (const p of files) await fs.rm(path.resolve(process.cwd(), p), { force: true });
  await f.dropPostes();
  await sequelize.close();
});

test('inventaire ouvert tous les jours, marqué fait dans la modale, fiche transmise au Chef de pôle RO SAU', async () => {
  const state = await request(app).get(`/api/vehicles/${amb.id}/inventory`).set(authHeaders(f.tenant, infirmier));
  assert.equal(state.status, 200, state.body?.message);
  assert.deepEqual([...state.body.data.days].sort(), [0, 1, 2, 3, 4, 5, 6]);
  assert.equal(state.body.data.today.due, true, 'à faire aujourd\'hui, quel que soit le jour');

  const item = state.body.data.sections[0].items.find((it) => it.kind === 'qty');
  const res = await request(app).post(`/api/vehicles/${amb.id}/inventory`).set(authHeaders(f.tenant, infirmier))
    .send({ answers: [{ itemId: item.id, present: item.required }], signature });
  assert.equal(res.status, 201, res.body?.message);

  const after1 = await request(app).get(`/api/vehicles/${amb.id}/inventory`).set(authHeaders(f.tenant, infirmier));
  const today = doualaDay().date;
  assert.equal(after1.body.data.today.due, false);
  assert.ok(after1.body.data.week[today], 'l\'inventaire du jour apparaît dans la semaine');

  const docId = res.body.data.inventory.documentId;
  assert.ok(docId, 'fiche PDF générée');
  const doc = await f.run(() => Document.findByPk(docId));
  files.push(doc.filePath, (await f.run(() => VehicleInventory.findByPk(res.body.data.inventory.id))).signaturePath);
  const tr = await f.run(() => DocumentTransmission.findAll({ where: { documentId: docId } }));
  assert.deepEqual(tr.map((t) => t.toUserId), [chefPole.id]);
  const read = await request(app).get(`/api/documents/${docId}`).set(authHeaders(f.tenant, chefPole));
  assert.equal(read.status, 200, 'le Chef de pôle peut ouvrir la fiche');

  const grid = await request(app).get('/api/vehicles/inventories').set(authHeaders(f.tenant, chefPole));
  assert.equal(grid.status, 200, grid.body?.message);
  assert.equal(grid.body.data.days.length, 7);
  assert.ok(grid.body.data.vehicles[0].cells[today]);
});
