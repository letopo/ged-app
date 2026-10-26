// Demande de permission : 2 jours ouvrables de prévenance (heure de Douala),
// le week-end ne compte pas ; administrateurs exemptés.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { permissionEarliestStart, isPermissionNoticeExempt } from '../../src/utils/permissionRules.js';

// Heure de Douala = UTC+1
const douala = (iso) => new Date(`${iso}+01:00`);

test('lundi → mercredi', () => {
  assert.equal(permissionEarliestStart(douala('2026-10-26T10:00:00')), '2026-10-28');
});
test('jeudi → lundi', () => {
  assert.equal(permissionEarliestStart(douala('2026-10-29T10:00:00')), '2026-11-02');
});
test('vendredi → mardi (le week-end ne compte pas)', () => {
  assert.equal(permissionEarliestStart(douala('2026-10-30T16:00:00')), '2026-11-03');
});
test('samedi et dimanche → mardi', () => {
  assert.equal(permissionEarliestStart(douala('2026-10-31T09:00:00')), '2026-11-03');
  assert.equal(permissionEarliestStart(douala('2026-11-01T09:00:00')), '2026-11-03');
});
test('la date du jour est celle de Douala, pas UTC', () => {
  // Jeudi 23h30 UTC = vendredi 00h30 à Douala → règle du vendredi
  assert.equal(permissionEarliestStart(new Date('2026-10-29T23:30:00Z')), '2026-11-03');
});
test('administrateurs exemptés, pas les autres rôles', () => {
  assert.equal(isPermissionNoticeExempt({ role: 'admin' }), true);
  assert.equal(isPermissionNoticeExempt({ role: 'superadmin' }), true);
  for (const role of ['user', 'director', 'manager', undefined]) assert.equal(isPermissionNoticeExempt({ role }), false);
  assert.equal(isPermissionNoticeExempt(null), false);
});
