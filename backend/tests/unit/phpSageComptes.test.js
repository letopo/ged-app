// Comptes tiers Sage d'un patient PHP : propositions par matricule + décisions
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normMatricule, comptesDuPatient, toTiers } from '../../src/utils/phpSageComptes.js';

const tiers = (CT_Num, CG_NumPrinc, matricule, d) => toTiers({ CT_Num, CT_Intitule: `NOM ${CT_Num}`, CG_NumPrinc, matricule, dateEntree: d });

test('matricule : espaces, zéros en tête, suffixe après « / », trop court', () => {
  assert.equal(normMatricule('123 456'), '123456');
  assert.equal(normMatricule('012345'), '12345');
  assert.equal(normMatricule('123456/ABCD1234'), '123456');
  assert.equal(normMatricule('7'), '');
  assert.equal(normMatricule(null), '');
});

test('propositions : comptes employé et famille au matricule de l’agent', () => {
  const all = [
    tiers('418001', '4127000', '123456', '2026-10-01'),
    tiers('418002', '4127000', '123 456', '2026-11-01'),
    tiers('418003', '4122000', '123456'),
    tiers('418004', '4127000', '999999'),
  ];
  const r = comptesDuPatient('123456', all, []);
  assert.deepEqual(r.employe.map((c) => c.compte), ['418002', '418001']); // le plus récent d'abord
  assert.deepEqual(r.famille.map((c) => c.compte), ['418003']);
  assert.ok(r.employe.every((c) => c.etat === 'propose' && c.source === 'auto'));
});

test('décisions : confirmé en tête, écarté en fin, compte manuel sans le matricule', () => {
  const all = [tiers('418001', '4127000', '123456'), tiers('418002', '4127000', '123456'), tiers('418009', '4127000', '000')];
  const r = comptesDuPatient('123456', all, [
    { compteTiers: '418002', statut: 'ecarte', source: 'auto' },
    { compteTiers: '418009', statut: 'confirme', source: 'manuel', decidedByName: 'Point Focal' },
  ]);
  assert.deepEqual(r.employe.map((c) => [c.compte, c.etat, c.source]), [['418009', 'confirme', 'manuel'], ['418001', 'propose', 'auto'], ['418002', 'ecarte', 'auto']]);
  assert.equal(r.employe[0].decidePar, 'Point Focal');
});

test('compte confirmé qui n’existe plus dans Sage : affiché « introuvable »', () => {
  const r = comptesDuPatient('123456', [], [{ compteTiers: '418777', statut: 'confirme', source: 'manuel' }]);
  assert.equal(r.employe[0].introuvable, true);
});
