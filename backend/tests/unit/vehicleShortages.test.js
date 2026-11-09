// Manques ouverts des ambulances : rapprochement inventaire ↔ manques, réarmement.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shortagesFromRestock, answeredItemIds, reconcileShortages, applyRestock } from '../../src/utils/vehicleShortages.js';

const sections = [{ key: 'm', label: 'Matériel', items: [
  { id: 'gants', kind: 'qty', required: 2 }, { id: 'adre', kind: 'qty', required: 1, expiry: true },
  { id: 'dsa', kind: 'check', critical: true }, { id: 'o2', kind: 'level', min: 50, critical: true },
] }];

test('lignes de réassort → manques (manque + péremption séparés, criticité)', () => {
  const f = shortagesFromRestock([
    { itemId: 'adre', label: 'Adrénaline', missing: 1, expiring: true },
    { itemId: 'dsa', label: 'DSA', ko: true },
    { itemId: 'o2', label: 'O2', low: true, value: 10, min: 50, unit: 'bar' },
  ], sections);
  assert.deepEqual(f.map((x) => x.key), ['adre|manque', 'adre|peremption', 'dsa|panne', 'o2|niveau']);
  assert.equal(f.find((x) => x.kind === 'panne').critical, true);
  assert.equal(f.find((x) => x.kind === 'peremption').critical, false);
});

test('inventaire suivant : retrouve le manque au lieu de le recréer, pas de nouvelle alerte', () => {
  const open = [{ id: 's1', itemId: 'gants', kind: 'manque', quantity: 2, orderedQty: 2, status: 'commande' }];
  const found = shortagesFromRestock([{ itemId: 'gants', label: 'Gants', missing: 2 }], sections);
  const r = reconcileShortages(open, found, answeredItemIds([{ itemId: 'gants', present: 0 }]));
  assert.equal(r.create.length, 0);
  assert.deepEqual(r.update, [{ id: 's1', quantity: 2 }]);
  assert.equal(r.fresh.length, 0);
  assert.deepEqual(r.close, []);
});

test('sortie entre-temps : seul le surplus non commandé est nouveau', () => {
  const open = [{ id: 's1', itemId: 'gants', kind: 'manque', quantity: 1, orderedQty: 1, status: 'commande' }];
  const found = shortagesFromRestock([{ itemId: 'gants', label: 'Gants', missing: 2 }], sections);
  const r = reconcileShortages(open, found, new Set(['gants']));
  assert.equal(r.fresh.length, 1);
  assert.equal(r.fresh[0].added, 1);
  // Le lendemain, même relevé : plus rien de nouveau
  const r2 = reconcileShortages([{ ...open[0], quantity: 2 }], found, new Set(['gants']));
  assert.equal(r2.fresh.length, 0);
});

test('article relevé au complet → manque fermé ; article non relevé → manque gardé', () => {
  const open = [
    { id: 's1', itemId: 'gants', kind: 'manque', quantity: 2, orderedQty: 0, status: 'a_commander' },
    { id: 's2', itemId: 'dsa', kind: 'panne', quantity: null, orderedQty: 0, status: 'commande' },
  ];
  const r = reconcileShortages(open, [], answeredItemIds([{ itemId: 'gants', present: 2 }, { itemId: 'dsa', status: null }]));
  assert.deepEqual(r.close, ['s1']);
});

test('réarmement partiel puis complet', () => {
  assert.deepEqual(applyRestock({ quantity: 3 }, 1), { quantity: 2, restocked: 1, closed: false });
  assert.deepEqual(applyRestock({ quantity: 3 }, 5), { quantity: 0, restocked: 3, closed: true });
  assert.deepEqual(applyRestock({ quantity: null }, null), { quantity: null, restocked: 0, closed: true });
});
