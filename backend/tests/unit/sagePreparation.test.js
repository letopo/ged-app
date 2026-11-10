// Facturation assistée : rapprochement préparation ↔ factures Sage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePreparation } from '../../src/utils/sagePreparation.js';

const prep = ['BL1', 'BL2', 'BL3'];

test('rien de facturé : à transformer, les BL non préparés du BPC sont signalés', () => {
  const r = evaluatePreparation(prep, [], [{ piece: 'BL1' }, { piece: 'BL2' }, { piece: 'BL3' }, { piece: 'BL9', montant: 500 }]);
  assert.equal(r.status, 'a_transformer');
  assert.deepEqual(r.manquants, prep);
  assert.deepEqual(r.oublies.map((b) => b.piece), ['BL9']);
});

test('les 3 BL dans une seule facture : facturée', () => {
  const lines = prep.map((bl) => ({ facture: 'FA100', comptabilisee: false, dateFacture: '2026-11-10', bl, montant: 1000 }));
  const r = evaluatePreparation(prep, lines, []);
  assert.equal(r.status, 'facturee');
  assert.equal(r.factures.length, 1);
  assert.equal(r.factures[0].montant, 3000);
  assert.deepEqual(r.manquants, []);
});

test('un BL oublié dans la facture : incomplète, BL manquant nommé', () => {
  const lines = ['BL1', 'BL2'].map((bl) => ({ facture: 'FA100', dateFacture: '2026-11-10', bl, montant: 1000 }));
  const r = evaluatePreparation(prep, lines, [{ piece: 'BL3' }]);
  assert.equal(r.status, 'incomplete');
  assert.deepEqual(r.manquants, ['BL3']);
  assert.deepEqual(r.oublies, []); // BL3 est préparé : il est « manquant », pas « oublié »
});

test('BPC facturé en deux factures : incomplète', () => {
  const lines = [
    { facture: 'FA100', bl: 'BL1', montant: 1 }, { facture: 'FA100', bl: 'BL2', montant: 1 },
    { facture: 'FA101', bl: 'BL3', montant: 1 },
  ];
  const r = evaluatePreparation(prep, lines, []);
  assert.equal(r.status, 'incomplete');
  assert.deepEqual(r.factures.map((f) => f.piece), ['FA100', 'FA101']);
});

test('une autre facture du patient sans BL préparé est ignorée ; BL en plus repérés', () => {
  const lines = [
    { facture: 'FA090', bl: 'BL0', montant: 1 },
    ...prep.map((bl) => ({ facture: 'FA100', bl, montant: 1 })), { facture: 'FA100', bl: 'BL7', montant: 1 },
  ];
  const r = evaluatePreparation(prep, lines, []);
  assert.equal(r.status, 'facturee');
  assert.deepEqual(r.factures.map((f) => f.piece), ['FA100']);
  assert.deepEqual(r.factures[0].autresBl, ['BL7']);
});
