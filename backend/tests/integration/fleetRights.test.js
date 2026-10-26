// Parc véhicules : qui gère (fiches, tableau de bord) et qui contrôle.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import sequelize from '../../src/config/database.js';
import { Vehicle } from '../../src/models/index.js';
import { fleetAccess, canManage, canCheck } from '../../src/controllers/vehicleController.js';
import { createTenant, makeFactory } from '../helpers/fixtures.js';

let f;
let u;
let ambulance;
let serviceCar;

before(async () => {
  f = makeFactory(await createTenant());
  const [superadmin, admin, chefSecu, chefPole, nurse, driver, crewMember, nobody] = await Promise.all([
    f.user({ role: 'superadmin' }), f.user({ role: 'admin' }), f.user(), f.user(), f.user(), f.user(), f.user(), f.user(),
  ]);
  u = { superadmin, admin, chefSecu, chefPole, nurse, driver, crewMember, nobody };
  await f.poste('chef_securite_logistique', [chefSecu]);
  await f.poste('chef_pole_ro_sau', [chefPole]);
  const sau = await f.service();
  await f.member(nurse, sau);
  await f.member(driver, await f.service('Chauffeurs'));
  ambulance = await f.run(() => Vehicle.create({ label: 'Ambulance 1', immatriculation: 'IT-1', vehicleType: 'ambulance', serviceId: sau.id, managerPosteCode: 'chef_pole_ro_sau' }));
  serviceCar = await f.run(() => Vehicle.create({ label: 'Voiture', immatriculation: 'LT-2', vehicleType: 'service', managerPosteCode: null }));
});
after(() => sequelize.close());

const rights = async (user, vehicle, mission = null) => f.run(async () => {
  const acc = await fleetAccess(user);
  return { manager: acc.fleetManager, manage: canManage(acc, vehicle), check: canCheck(acc, vehicle, mission) };
});

test('superadmin et chef sécurité logistique gèrent tout le parc', async () => {
  for (const who of ['superadmin', 'chefSecu']) {
    assert.deepEqual(await rights(u[who], ambulance), { manager: true, manage: true, check: true }, who);
    assert.equal((await rights(u[who], serviceCar)).manage, true, who);
  }
});
test('administrateur : seulement si le superadmin l\'autorise', async () => {
  assert.deepEqual(await rights(u.admin, ambulance), { manager: false, manage: false, check: false });
  await f.settings({ fleetAdminAccess: true });
  assert.equal((await rights(u.admin, ambulance)).manage, true);
  await f.settings({ fleetAdminAccess: false });
  assert.equal((await rights(u.admin, ambulance)).manage, false);
});
test('cheffe de pôle RO SAU : gère les ambulances, pas les autres véhicules', async () => {
  assert.deepEqual(await rights(u.chefPole, ambulance), { manager: false, manage: true, check: true });
  assert.deepEqual(await rights(u.chefPole, serviceCar), { manager: false, manage: false, check: false });
});
test('membre du service (SAU) : contrôle l\'ambulance sans la gérer', async () => {
  assert.deepEqual(await rights(u.nurse, ambulance), { manager: false, manage: false, check: true });
  assert.equal((await rights(u.nurse, serviceCar)).check, false);
});
test('chauffeur (service « Chauffeurs ») : contrôle tous les véhicules', async () => {
  assert.deepEqual(await rights(u.driver, ambulance), { manager: false, manage: false, check: true });
  assert.equal((await rights(u.driver, serviceCar)).check, true);
});
test('équipage inscrit sur la mission : contrôle ce véhicule-là', async () => {
  const mission = { crew: [{ userId: u.crewMember.id }] };
  assert.equal((await rights(u.crewMember, ambulance, mission)).check, true);
  assert.equal((await rights(u.crewMember, ambulance, null)).check, false);
});
test('utilisateur sans lien : aucun droit', async () => {
  assert.deepEqual(await rights(u.nobody, ambulance), { manager: false, manage: false, check: false });
});
