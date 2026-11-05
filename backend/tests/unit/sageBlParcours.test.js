// Finances : patients externes / hospitalisés (demande du 05/11/2026). Un BPC est
// « hospitalisé » dès qu'un de ses BL contient un acte de séjour ou de bloc.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupIntoBpc, summarize, parcoursOf, HOSPI_FAMILLES, NON_HOSPI_ARTICLES } from '../../src/utils/sageBl.js';

const bl = (tiers, piece, date, montant, hospi) => ({
  DO_Tiers: tiers, DO_Piece: piece, DO_Date: new Date(`${date}T08:00:00Z`), DO_Ref: 'MED', DO_TotalTTC: montant,
  CT_Intitule: tiers, CG_NumPrinc: '4127000', dateEntree: null, hospi,
});

test('parcours d\'un BPC : hospitalisé si un seul de ses BL l\'est, sinon externe', () => {
  const bpcs = groupIntoBpc([
    bl('A', 'BL1', '2026-10-01', 5000, false), bl('A', 'BL2', '2026-10-02', 90000, true),
    bl('B', 'BL3', '2026-10-01', 3000, false), bl('B', 'BL4', '2026-10-02', 2000, false),
  ], new Date('2026-11-05T12:00:00Z'));
  const byTiers = Object.fromEntries(bpcs.map(b => [b.patient.compteTiers, b.parcours]));
  assert.deepEqual(byTiers, { A: 'hospitalise', B: 'externe' });
  assert.deepEqual(summarize(bpcs).parParcours, [
    { parcours: 'externe', bpc: 1, bl: 2, montant: 5000 },
    { parcours: 'hospitalise', bpc: 1, bl: 2, montant: 95000 },
  ]);
});

test('règle : chambres, bloc, anesthésie et morgue ; la consultation d\'anesthésie reste externe', () => {
  assert.equal(parcoursOf(true), 'hospitalise');
  assert.equal(parcoursOf(false), 'externe');
  for (const f of ['H511', 'G411', 'F311', 'E211', 'E214', 'E215', 'D131']) assert.ok(HOSPI_FAMILLES.includes(f), f);
  assert.ok(NON_HOSPI_ARTICLES.includes('CONSO32'));
});
