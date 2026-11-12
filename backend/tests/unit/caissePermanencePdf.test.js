// Fiche PDF d'une séance de la caisse de permanence : génération, cadres de signature
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { buildCaissePermanencePdf, permanenceSignatureLabels, seanceTitre } from '../../src/utils/caissePermanencePdf.js';
import { totauxSeance, soldesCourants } from '../../src/utils/caissePermanence.js';

function seance(n, extra = {}) {
  const mouvements = Array.from({ length: n }, (_, i) => ({
    id: `m${i}`, type: ['caution', 'recette', 'sortie'][i % 3], mode: i % 4 === 1 ? 'orange_money' : 'especes',
    libelle: 'Caution', patientNom: `PATIENT ÉLÉONORE ${i}`, montant: 1000 + i, heure: new Date(Date.UTC(2026, 10, 12, 8, i % 60)),
    annule: i === 2, motifAnnulation: i === 2 ? 'saisi deux fois' : null,
  }));
  const soldes = soldesCourants(50000, mouvements);
  const totaux = totauxSeance(50000, mouvements);
  return {
    id: 's1', date: '2026-11-12', periode: 'nuit', caissiereNom: 'Dorette N.', soldeOuverture: 50000, montantRecu: 50000, ecartReception: 0,
    ouverteAt: new Date(), clotureeAt: new Date(), especesComptees: totaux.especesTheoriques - 500, ecartCloture: -500, noteCloture: 'pièce manquante',
    billetage: { 10000: 3, 500: 2 }, mouvements: mouvements.map((m, i) => ({ ...m, solde: soldes[i] })), totaux, ...extra,
  };
}

test('fiche PDF : une page, deux cadres Caissière pharmacie → Caissière', async () => {
  const { buffer, signatureZones, signaturePage } = await buildCaissePermanencePdf(seance(8));
  const doc = await PDFDocument.load(buffer);
  assert.equal(doc.getPageCount(), 1);
  assert.equal(signaturePage, 0);
  assert.deepEqual(signatureZones.map((z) => z.label), ['Caissière pharmacie : Dorette N.', 'Caissière']);
  for (const z of signatureZones) assert.ok(z.y > 36 && z.x + z.width <= 595.28 - 36 + 0.01);
});

test('fiche PDF : beaucoup de mouvements → plusieurs pages, cadres sur la dernière', async () => {
  const { buffer, signaturePage, signatureZones } = await buildCaissePermanencePdf(seance(120));
  const doc = await PDFDocument.load(buffer);
  assert.ok(doc.getPageCount() >= 3);
  assert.equal(signaturePage, doc.getPageCount() - 1);
  assert.ok(signatureZones.every((z) => z.y > 36));
});

test('fiche PDF : séance sans mouvement et libellés', async () => {
  const s = seance(0, { billetage: null, noteCloture: null, ecartCloture: 0, especesComptees: 50000 });
  const { buffer } = await buildCaissePermanencePdf(s);
  assert.ok(buffer.length > 1000);
  assert.deepEqual(permanenceSignatureLabels(), ['Caissière pharmacie', 'Caissière']);
  assert.match(seanceTitre(s), /^Caisse de permanence nuit du jeudi 12 novembre 2026$/);
});
