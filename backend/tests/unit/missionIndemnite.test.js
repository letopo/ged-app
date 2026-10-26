// Indemnités de mission (note de service « Frais de mission », confirmée le 18/09).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculerIndemnite } from '../../src/utils/missionIndemniteCalculator.js';

const rate = { montantPetitDejeuner: 1000, montantDejeuner: 2000, montantDiner: 3000, montantHebergement: 10000 };
const thresholds = { montantPrimeSecurite: 5000 };
const calc = (heureDepart, heureRetour, dateDepart = '2026-10-26', dateRetour = dateDepart) =>
  calculerIndemnite({ rate, thresholds, heureDepart, heureRetour, dateDepart, dateRetour });

test('catégorie inconnue : rien, signalé', () => {
  const r = calculerIndemnite({ rate: null, thresholds, heureDepart: '06:00', heureRetour: '22:00', dateDepart: '2026-10-26', dateRetour: '2026-10-27' });
  assert.equal(r.total, 0);
  assert.equal(r.categorieInconnue, true);
});
test('petit-déjeuner si départ ≤ 07:30 (inclus)', () => {
  assert.equal(calc('07:30', '10:00').petitDejeuner, true);
  assert.equal(calc('07:31', '10:00').petitDejeuner, false);
});
test('déjeuner si la mission couvre [12h, 14h]', () => {
  assert.equal(calc('09:00', '12:00').dejeuner, true);
  assert.equal(calc('14:00', '16:00').dejeuner, true);
  assert.equal(calc('08:00', '11:59').dejeuner, false);
  assert.equal(calc('14:01', '17:00').dejeuner, false);
});
test('dîner si la mission couvre [18h, 20h]', () => {
  assert.equal(calc('15:00', '18:00').diner, true);
  assert.equal(calc('17:00', '17:59').diner, false);
  assert.equal(calc('20:01', '23:00').diner, false);
});
test('prime de sécurité si retour ≥ 20h', () => {
  assert.equal(calc('15:00', '20:00').primeSecurite, true);
  assert.equal(calc('15:00', '19:59').primeSecurite, false);
});
test('hébergement seulement sur plusieurs jours', () => {
  assert.equal(calc('08:00', '10:00').hebergement, false);
  assert.equal(calc('08:00', '10:00', '2026-10-26', '2026-10-27').hebergement, true);
});
test('cas complet : petit-déj + 2 repas + prime + hébergement', () => {
  const r = calc('06:30', '21:00', '2026-10-26', '2026-10-27');
  assert.deepEqual([r.petitDejeuner, r.dejeuner, r.diner, r.primeSecurite, r.hebergement], [true, true, true, true, true]);
  assert.equal(r.total, 1000 + 2000 + 3000 + 5000 + 10000);
});
test('prime de sécurité par défaut à 5 000 si non réglée', () => {
  const r = calculerIndemnite({ rate, thresholds: {}, heureDepart: '15:00', heureRetour: '21:00', dateDepart: '2026-10-26', dateRetour: '2026-10-26' });
  assert.equal(r.montantPrimeSecurite, 5000);
});
