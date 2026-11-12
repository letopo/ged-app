// Bons de commande lus dans Sage : lignes, totaux, numéro saisi, PDF (pages, cadres)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { toLigneBc, totauxBc, normPiece, isPieceValide } from '../../src/utils/sageBonCommande.js';
import { buildBonCommandePdf, bonCommandeSignatureLabels, bonCommandeTitre } from '../../src/utils/bonCommandePdf.js';

const sageLigne = (o = {}) => ({ AR_Ref: '3400937 ', DL_Design: 'MOVIPRED PDRE', DL_Qte: 7, EU_Enumere: 'Unité', DL_PrixUnitaire: 13500, DL_Remise01REM_Valeur: 0, DL_Remise01REM_Type: 0, DL_MontantHT: 94500, DL_MontantTTC: 94500, DL_PieceBC: '', ...o });

test('numéro saisi : majuscules, sans espaces, format Sage', () => {
  assert.equal(normPiece(' blf 0000004833 '), 'BLF0000004833');
  assert.ok(isPieceValide('BCF0000003331'));
  assert.ok(!isPieceValide('xx'));
  assert.ok(!isPieceValide("BCF'; DROP"));
});

test('ligne Sage → ligne du bon ; remise en % ou en montant ; total remise sans arrondis parasites', () => {
  const l = toLigneBc(sageLigne());
  assert.deepEqual([l.reference, l.quantite, l.prixUnitaire, l.remise, l.montantTTC, l.pieceBC], ['3400937', 7, 13500, '', 94500, null]);
  assert.equal(toLigneBc(sageLigne({ DL_Remise01REM_Valeur: 10, DL_Remise01REM_Type: 1 })).remise, '10 %');
  const lignes = [
    toLigneBc(sageLigne({ DL_PrixUnitaire: 643.17, DL_Qte: 30, DL_MontantHT: 19295, DL_MontantTTC: 19295 })), // arrondi de P.U. : pas une remise
    toLigneBc(sageLigne({ DL_Qte: 10, DL_PrixUnitaire: 1000, DL_Remise01REM_Valeur: 10, DL_Remise01REM_Type: 1, DL_MontantHT: 9000, DL_MontantTTC: 9000 })),
  ];
  const t = totauxBc(lignes, { netAPayer: 28295 });
  assert.equal(t.totalRemise, 1000);
  assert.equal(t.netAPayer, 28295);
  assert.equal(t.nbLignes, 2);
});

const bc = (n) => {
  const lignes = Array.from({ length: n }, (_, i) => toLigneBc(sageLigne({ DL_Design: `PRODUIT ÉTÉ ${i}` })));
  return {
    type: 12, typeLabel: 'Bon de commande', piece: 'BCF0000003331', date: '2026-11-12', dateLivraison: null, reference: '',
    emetteur: 'KOUMNDA', depot: { numero: 6, intitule: 'MAG' },
    fournisseur: { numero: '4012820', intitule: 'QUEEN GARDEN CENTER', contact: 'DR O MATANGA', adresse: [], telephone: '' },
    lignes, totaux: totauxBc(lignes, { netAPayer: n * 94500 }),
  };
};

test('PDF : 24 lignes tiennent sur une page avec les trois cadres', async () => {
  const r = await buildBonCommandePdf(bc(24));
  assert.equal((await PDFDocument.load(r.buffer)).getPageCount(), 1);
  assert.deepEqual(r.signatureZones.map((z) => z.label), ['Émetteur : KOUMNDA', 'Direction générale', 'Comptabilité']);
  assert.ok(r.signatureZones.every((z) => z.y >= 44));
});

test('PDF : beaucoup de lignes → plusieurs pages, cadres sur la dernière', async () => {
  const r = await buildBonCommandePdf(bc(90), { labels: bonCommandeSignatureLabels('Major X') });
  const pages = (await PDFDocument.load(r.buffer)).getPageCount();
  assert.ok(pages >= 2);
  assert.equal(r.signaturePage, pages - 1);
  assert.equal(r.signatureZones[0].label, 'Émetteur : Major X');
  assert.equal(bonCommandeTitre(bc(1)), 'Bon de commande BCF0000003331 · QUEEN GARDEN CENTER');
});
