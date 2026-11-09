// Prise de poste RO SAU : seuils d'oxygène, anomalies → manques.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { oxygenStatus, oxygenWorsened, shortagesFromShift, shiftAnsweredIds } from '../../src/utils/vehicleShift.js';
import { reconcileShortages } from '../../src/utils/vehicleShortages.js';

const amb = (it, lt) => [{ label: 'IT', bottles: it }, { label: 'LT', bottles: lt }];

test('oxygène : au moins une pleine en réserve → normal', () => {
  assert.equal(oxygenStatus({ reserveFull: 1, reserveEmpty: 3, onboard: amb(2, 2) }).level, 'ok');
  assert.equal(oxygenStatus({ reserveFull: 4, reserveEmpty: 0, onboard: amb(2, 2) }).total, 8);
});

test('oxygène : 0 pleine en réserve, 2 + 2 dans les ambulances → commander', () => {
  assert.equal(oxygenStatus({ reserveFull: 0, reserveEmpty: 4, onboard: amb(2, 2) }).level, 'commander');
});

test('oxygène : 0 pleine en réserve et une ambulance sous 2 → urgent', () => {
  const r = oxygenStatus({ reserveFull: 0, reserveEmpty: 5, onboard: amb(1, 2) });
  assert.equal(r.level, 'urgent');
  assert.deepEqual(r.short, ['IT']);
});

test('oxygène : réserve non comptée → pas de niveau', () => {
  assert.equal(oxygenStatus({ reserveFull: '', reserveEmpty: 4, onboard: amb(2, 2) }).level, null);
});

test('alerte oxygène seulement quand ça se dégrade', () => {
  assert.equal(oxygenWorsened('ok', 'commander'), true);
  assert.equal(oxygenWorsened('commander', 'commander'), false);
  assert.equal(oxygenWorsened('commander', 'urgent'), true);
  assert.equal(oxygenWorsened('urgent', 'commander'), false);
  assert.equal(oxygenWorsened(null, 'urgent'), true);
});

test('anomalies de prise de poste → manques suivis, fermés quand le point repasse OK', () => {
  const items = [{ id: 'dsa', label: 'DSA', kind: 'check', critical: true }, { id: 'o2', label: 'O2', kind: 'level', unit: 'bar', min: 50, critical: true }];
  const answers = [{ itemId: 'dsa', status: 'ko' }, { itemId: 'o2', status: 'ko', value: 10 }];
  const found = shortagesFromShift(items, answers);
  assert.deepEqual(found.map((f) => f.key), ['pp_dsa|panne', 'pp_o2|niveau']);
  const open = [{ id: 's1', itemId: 'pp_dsa', kind: 'panne', quantity: null, orderedQty: 0, status: 'a_commander' }];
  const r = reconcileShortages(open, [], shiftAnsweredIds([{ itemId: 'dsa', status: 'ok' }]));
  assert.deepEqual(r.close, ['s1']);
});
