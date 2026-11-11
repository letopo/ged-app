// Rapprochement BL PHP (Sage) ↔ patients du DME par compte tiers
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normCompte, nameScore, matchBl, summarizeMatch } from '../../src/utils/dmeMatch.js';

const p = (id, nom, prenom, compte) => ({ id, dossier_numero: `D${id}`, nom, prenom, numero_compte_sage: compte, actif: 1 });
const byCompte = (pats) => { const m = new Map(); pats.forEach((x) => { const k = normCompte(x.numero_compte_sage); m.set(k, [...(m.get(k) || []), x]); }); return m; };
const bl = (compte, nomSage) => ({ bl: `BL${compte}`, date: '2026-11-10', compte, nomSage });

test('compte : espaces ignorés, majuscules', () => {
  assert.equal(normCompte(' 418 123 456 '), '418123456');
  assert.equal(normCompte('418abc'), '418ABC');
});

test('nom : accents, ordre et mentions (épse) ignorés', () => {
  assert.equal(nameScore('NGONO épse ATANGANA Hélène', { nom: 'Atangana', prenom: 'Helene' }), 2);
  assert.equal(nameScore('MBARGA PAUL', { nom: 'Essomba', prenom: 'Marie' }), 0);
});

test('statuts : trouvé, départagé par le nom, nom différent, plusieurs, absent', () => {
  const pats = byCompte([
    p(1, 'Mbarga', 'Paul', '418 000 001'),
    p(2, 'Essomba', 'Marie', '418000002'), p(3, 'Essomba', 'Jean', '418000002'),
    p(4, 'Tchoua', 'Alain', '418000003'),
    p(5, 'Owona', 'Luc', '418000004'), p(6, 'Owona', 'Luc', '418000004'),
  ]);
  const rows = matchBl([
    bl('418000001', 'MBARGA PAUL'),
    bl('418000002', 'ESSOMBA JEAN'),
    bl('418000003', 'NANGA BERTHE'),
    bl('418000004', 'OWONA LUC'),
    bl('418999999', 'X'),
  ], pats);
  assert.deepEqual(rows.map((r) => r.statut), ['trouve', 'trouve_nom', 'nom_different', 'plusieurs', 'absent']);
  assert.equal(rows[1].patient.id, 3);
  assert.equal(rows[3].candidats.length, 2);
  assert.deepEqual(summarizeMatch(rows), { total: 5, trouve: 1, trouve_nom: 1, nom_different: 1, plusieurs: 1, absent: 1, rapproches: 2, taux: 40 });
});
