// Caisse de permanence : séances jour/nuit, chaîne des séances, totaux, billetage
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { periodeAt, nextSeance, seanceKey, seancesSautees, totauxSeance, soldesCourants, totalBilletage, parseMontant } from '../../src/utils/caissePermanence.js';

// Heures de Douala (UTC+1) → instant UTC
const at = (iso, hhmm) => { const [h, m] = hhmm.split(':').map(Number); return new Date(Date.parse(`${iso}T00:00:00Z`) + ((h - 1) * 60 + m) * 60_000); };

test('séance en cours : jour 7 h-16 h 30, nuit 16 h 30-7 h datée du soir', () => {
  assert.deepEqual(periodeAt(at('2026-11-11', '07:00')), { date: '2026-11-11', periode: 'jour' });
  assert.deepEqual(periodeAt(at('2026-11-11', '16:29')), { date: '2026-11-11', periode: 'jour' });
  assert.deepEqual(periodeAt(at('2026-11-11', '16:30')), { date: '2026-11-11', periode: 'nuit' });
  assert.deepEqual(periodeAt(at('2026-11-12', '02:00')), { date: '2026-11-11', periode: 'nuit' });
  assert.deepEqual(periodeAt(at('2026-11-12', '06:59')), { date: '2026-11-11', periode: 'nuit' });
});

test('chaîne : jour → nuit → jour du lendemain ; séances sautées', () => {
  assert.deepEqual(nextSeance({ date: '2026-11-11', periode: 'jour' }), { date: '2026-11-11', periode: 'nuit' });
  assert.deepEqual(nextSeance({ date: '2026-11-30', periode: 'nuit' }), { date: '2026-12-01', periode: 'jour' });
  assert.ok(seanceKey({ date: '2026-11-11', periode: 'nuit' }) > seanceKey({ date: '2026-11-11', periode: 'jour' }));
  assert.equal(seancesSautees({ date: '2026-11-11', periode: 'jour' }, { date: '2026-11-11', periode: 'nuit' }), 0);
  assert.equal(seancesSautees({ date: '2026-11-11', periode: 'jour' }, { date: '2026-11-12', periode: 'nuit' }), 2);
});

test('totaux : espèces et Orange Money séparés, annulations exclues (exemple du samedi jour)', () => {
  const m = [
    { type: 'recette', mode: 'orange_money', montant: 5000 },
    { type: 'caution', mode: 'especes', montant: 50000 },
    { type: 'caution', mode: 'especes', montant: 30000, annule: true },
    { type: 'recette', mode: 'especes', montant: 1000 },
    { type: 'sortie', mode: 'especes', montant: 3000 },
    { type: 'sortie', mode: 'especes', montant: 725000 },
  ];
  const t = totauxSeance(504078, m);
  assert.equal(t.cautions, 50000); assert.equal(t.recettes, 6000); assert.equal(t.sorties, 728000);
  assert.equal(t.orangeMoney, 5000); assert.equal(t.nbMouvements, 5);
  assert.equal(t.especesTheoriques, 504078 + 51000 - 728000);
  assert.deepEqual(soldesCourants(1000, [{ type: 'caution', montant: 500 }, { type: 'sortie', montant: 200 }, { type: 'caution', montant: 9, annule: true }]), [1500, 1300, 1300]);
});

test('billetage et montants saisis', () => {
  assert.equal(totalBilletage({ 10000: 3, 5000: 1, 500: 2, 25: 4 }), 36100);
  assert.ok(Number.isNaN(totalBilletage({ 10000: -1 })));
  assert.equal(parseMontant('1 250 000'), 1250000);
  assert.equal(parseMontant('0'), null);
  assert.equal(parseMontant('0', { allowZero: true }), 0);
  assert.equal(parseMontant('12,5'), null);
  assert.equal(parseMontant('abc'), null);
  assert.equal(parseMontant('', { allowZero: true }), null);
  assert.equal(parseMontant(undefined, { allowZero: true }), null);
});
