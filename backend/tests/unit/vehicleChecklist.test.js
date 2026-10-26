// Parc véhicules : résultat d'un contrôle de mission et d'un inventaire d'ambulance.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateAnswers, evaluateInventory, sanitizeSections, sanitizeInventorySections, sanitizeInventoryDays,
  completionPct, completionLevel, weekStart, doualaDay, DEFAULT_INVENTORY_SECTIONS, DEFAULT_INVENTORY_DAYS,
} from '../../src/utils/vehicleChecklist.js';

const items = [
  { id: 'freins', label: 'Freins', kind: 'check', critical: true },
  { id: 'feux', label: 'Feux', kind: 'check', critical: false },
  { id: 'carburant', label: 'Carburant', kind: 'level', min: 25, critical: true },
  { id: 'o2', label: 'O2', kind: 'level', unit: 'bar', min: 50, max: 300, critical: true },
];

test('contrôle : OK partout, aucune anomalie', () => {
  const r = evaluateAnswers(items, [
    { itemId: 'freins', status: 'ok' }, { itemId: 'feux', status: 'ok' },
    { itemId: 'carburant', value: 80 }, { itemId: 'o2', value: 180 },
  ]);
  assert.deepEqual([r.answered, r.anomalies, r.critical, r.total], [4, 0, false, 4]);
});
test('contrôle : point non critique en défaut → anomalie sans criticité', () => {
  const r = evaluateAnswers(items, [{ itemId: 'feux', status: 'ko' }]);
  assert.deepEqual([r.answered, r.anomalies, r.critical], [1, 1, false]);
});
test('contrôle : point critique absent → critique', () => {
  const r = evaluateAnswers(items, [{ itemId: 'freins', status: 'absent' }]);
  assert.equal(r.critical, true);
});
test('contrôle : niveau sous le minimum → Pas OK', () => {
  const r = evaluateAnswers(items, [{ itemId: 'carburant', value: 20 }]);
  assert.equal(r.answers.find((a) => a.itemId === 'carburant').status, 'ko');
  assert.equal(r.critical, true);
});
test('contrôle : pression en bar bornée à max, pas à 100', () => {
  const r = evaluateAnswers(items, [{ itemId: 'o2', value: 180 }, { itemId: 'carburant', value: 180 }]);
  assert.equal(r.answers.find((a) => a.itemId === 'o2').value, 180);
  assert.equal(r.answers.find((a) => a.itemId === 'carburant').value, 100);
});
test('contrôle : photo hors du dossier des contrôles ignorée', () => {
  const r = evaluateAnswers(items, [{ itemId: 'feux', status: 'ko', photoPath: '../../etc/passwd' }, { itemId: 'freins', status: 'ko', photoPath: 'uploads/vehicle-checks/photo-1.jpg' }]);
  assert.equal(r.answers.find((a) => a.itemId === 'feux').photoPath, null);
  assert.equal(r.answers.find((a) => a.itemId === 'freins').photoPath, 'uploads/vehicle-checks/photo-1.jpg');
});
test('code couleur : complet / moitié / quart / aucun', () => {
  assert.equal(completionLevel(completionPct(4, 4)), 'complet');
  assert.equal(completionLevel(completionPct(2, 4)), 'moitie');
  assert.equal(completionLevel(completionPct(1, 4)), 'quart');
  assert.equal(completionLevel(completionPct(0, 4)), 'aucun');
  assert.equal(completionPct(0, 0), 0);
});
test('check-list : sections nettoyées (clé, doublons, types inconnus)', () => {
  const s = sanitizeSections([
    { label: 'Véhicule', items: [{ id: 'a', label: 'A' }, { id: 'a', label: 'A bis' }, { label: '' }] },
    { label: 'Véhicule', items: [] },
    { key: 'o2', label: 'O2', items: [{ label: 'Pression', kind: 'level', unit: 'bar', min: 400 }] },
  ]);
  assert.equal(s.length, 2);
  assert.equal(s[0].key, 'vehicule');
  assert.equal(s[0].items.length, 2);
  assert.notEqual(s[0].items[0].id, s[0].items[1].id);
  assert.deepEqual(s[1].items[0], { id: 'p1', label: 'Pression', kind: 'level', critical: false, unit: 'bar', min: 300, max: 300 });
});

// ── Inventaire ──────────────────────────────────────────────────────────────
const inv = [
  { key: 'mat', label: 'Matériels', items: [
    { id: 'ballon', label: 'Ballon', kind: 'qty', required: 1, critical: true },
    { id: 'draps', label: 'Draps', kind: 'qty', required: 2 },
    { id: 'pression', label: 'Pression O2', kind: 'level', unit: 'bar', min: 50, max: 300, critical: true },
    { id: 'o2_utilise', label: 'O2 utilisé ?', kind: 'yesno' },
  ] },
  { key: 'med', label: 'Médicaments', items: [
    { id: 'adre', label: 'Adrénaline', kind: 'qty', required: 1, expiry: true },
    { id: 'dsa', label: 'DSA', kind: 'check', critical: true },
  ] },
];

test('inventaire complet : rien à réapprovisionner', () => {
  const r = evaluateInventory(inv, [
    { itemId: 'ballon', present: 1 }, { itemId: 'draps', present: 3 }, { itemId: 'pression', value: 180 },
    { itemId: 'o2_utilise', value: true }, { itemId: 'adre', present: 1 }, { itemId: 'dsa', status: 'ok' },
  ]);
  assert.deepEqual([r.total, r.answered, r.shortages, r.expiring, r.critical, r.restock.length], [5, 5, 0, 0, false, 0]);
  assert.equal(r.answers.find((a) => a.itemId === 'o2_utilise').value, true);
});
test('inventaire : manque non critique → réassort, pas critique', () => {
  const r = evaluateInventory(inv, [{ itemId: 'draps', present: 0 }]);
  assert.equal(r.shortages, 1);
  assert.equal(r.critical, false);
  assert.deepEqual(r.restock[0], { itemId: 'draps', section: 'Matériels', label: 'Draps', unit: '', required: 2, present: 0, missing: 2, expiring: false });
});
test('inventaire : article critique manquant → critique', () => {
  assert.equal(evaluateInventory(inv, [{ itemId: 'ballon', present: 0 }]).critical, true);
});
test('inventaire : O2 sous 50 bar → critique et dans le réassort', () => {
  const r = evaluateInventory(inv, [{ itemId: 'pression', value: 40 }]);
  assert.equal(r.critical, true);
  assert.equal(r.restock[0].low, true);
});
test('inventaire : DSA Pas OK → critique', () => {
  const r = evaluateInventory(inv, [{ itemId: 'dsa', status: 'ko' }]);
  assert.equal(r.critical, true);
  assert.equal(r.restock[0].ko, true);
});
test('inventaire : « périme ce mois » seulement sur les articles à péremption', () => {
  const r = evaluateInventory(inv, [{ itemId: 'adre', present: 1, expiring: true }, { itemId: 'draps', present: 2, expiring: true }]);
  assert.equal(r.expiring, 1);
  assert.equal(r.shortages, 0);
  assert.equal(r.critical, false);
  assert.deepEqual(r.restock.map((x) => x.itemId), ['adre']);
});
test('inventaire : Oui / Non n\'est jamais compté ni une anomalie', () => {
  const r = evaluateInventory(inv, [{ itemId: 'o2_utilise', value: false }]);
  assert.deepEqual([r.answered, r.shortages], [0, 0]);
});
test('inventaire : quantités négatives ou invalides', () => {
  const r = evaluateInventory(inv, [{ itemId: 'draps', present: -3 }, { itemId: 'ballon', present: 'abc' }]);
  assert.equal(r.answers.find((a) => a.itemId === 'draps').present, 0);
  assert.equal(r.answers.find((a) => a.itemId === 'ballon').present, null);
});
test('fiche RO SAU par défaut : 74 lignes, lun / mer / ven, valide une fois nettoyée', () => {
  const lines = DEFAULT_INVENTORY_SECTIONS.reduce((n, s) => n + s.items.length, 0);
  assert.equal(lines, 74);
  assert.deepEqual(DEFAULT_INVENTORY_DAYS, [1, 3, 5]);
  assert.deepEqual(sanitizeInventorySections(DEFAULT_INVENTORY_SECTIONS), DEFAULT_INVENTORY_SECTIONS);
});
test('jours d\'inventaire : nettoyés, défaut lun / mer / ven', () => {
  assert.deepEqual(sanitizeInventoryDays([5, 1, 1, 9, 'x']), [1, 5]);
  assert.deepEqual(sanitizeInventoryDays([]), [1, 3, 5]);
});
test('semaine : lundi de la semaine, jour de Douala', () => {
  assert.equal(weekStart('2026-10-26'), '2026-10-26');
  assert.equal(weekStart('2026-11-01'), '2026-10-26');
  assert.equal(weekStart('2026-10-30'), '2026-10-26');
  assert.deepEqual(doualaDay(new Date('2026-10-25T23:30:00Z')), { date: '2026-10-26', weekday: 1 });
});
