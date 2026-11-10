// État de la caisse pharmacie : lignes du relevé et TOTAL GÉNÉRAL, comme Sage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toLigne, totauxCaisse } from '../../src/utils/caissePharmacie.js';
import { buildCaissePharmaciePdf } from '../../src/utils/caissePharmaciePdf.js';

const row = (piece, ht, net = ht) => ({ DO_Piece: `FA${piece} `, DO_Type: 7, DO_Date: '2026-11-10T00:00:00Z', DO_Tiers: '4199996', CT_Intitule: 'CLIENT COMPTANT PHARMACIE', DO_TotalHT: ht, DO_TotalTTC: ht, DO_NetAPayer: net });

test('ligne : acomptes = TTC − net à payer ; net absent → TTC', () => {
  assert.deepEqual(toLigne(row('1', 5000, 3000)), { date: '2026-11-10', piece: 'FA1', comptabilisee: true, client: '4199996', intitule: 'CLIENT COMPTANT PHARMACIE', totalHT: 5000, acomptes: 2000, net: 3000 });
  assert.equal(toLigne({ ...row('2', 120), DO_NetAPayer: null }).net, 120);
});

test('total général du relevé du 10/11/2026 : 25 factures, 102 913 FCFA', () => {
  const m = [2910, 3735, 120, 5360, 3735, 5090, 945, 1780, 6180, 2658, 3390, 2720, 3030, 1875, 12035, 2680, 1510, 1050, 1050, 12840, 6560, 3740, 3580, 13565, 775];
  const t = totauxCaisse(m.map((v, i) => toLigne(row(String(i), v))));
  assert.deepEqual(t, { totalHT: 102913, acomptes: 0, net: 102913, count: 25 });
});

test('PDF : deux cadres de signature, Caissière puis Comptable', async () => {
  const r = await buildCaissePharmaciePdf({ from: '2026-11-10', to: '2026-11-10', payeur: '4199996', payeurNom: 'X', lignes: [toLigne(row('1', 100))] });
  assert.deepEqual(r.signatureZones.map((z) => [z.index, z.label]), [[1, 'Caissière'], [2, 'Comptable']]);
  assert.ok(r.buffer.length > 1000);
});
