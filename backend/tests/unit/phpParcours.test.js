// Parcours hospitalier : regroupement des lignes Sage et contrôles croisés
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupSageLines, controlesCroises, AGENT } from '../../src/utils/phpParcours.js';

test('Sage : BL non facturé (type 3) et BL facturé (DL_PieceBL de la facture)', () => {
  const { bls, factures } = groupSageLines([
    { DO_Type: 3, DO_Piece: 'BL10 ', DL_PieceBL: '', DL_DateBL: '2026-11-02', DO_Date: '2026-11-02', CT_Num: '418001', DO_Ref: 'LABO', DL_Design: 'NFS', DL_MontantTTC: 5000 },
    { DO_Type: 3, DO_Piece: 'BL10', DL_PieceBL: '', DL_DateBL: '2026-11-02', DO_Date: '2026-11-02', CT_Num: '418001', DO_Ref: 'LABO', DL_Design: 'GE', DL_MontantTTC: 2000 },
    { DO_Type: 7, DO_Piece: 'FA5', DL_PieceBL: 'BL08', DL_DateBL: '2026-10-20', DO_Date: '2026-10-25', CT_Num: '418001', DO_Ref: '', DL_Design: 'Consultation', DL_MontantTTC: 10000 },
  ]);
  const bl10 = bls.find((b) => b.piece === 'BL10');
  assert.equal(bl10.montant, 7000); assert.equal(bl10.facture, null); assert.equal(bl10.service, 'LABO');
  assert.deepEqual(bl10.actes, ['NFS', 'GE']);
  const bl08 = bls.find((b) => b.piece === 'BL08');
  assert.equal(bl08.facture, 'FA5'); assert.equal(bl08.comptabilisee, true);
  assert.deepEqual(factures, [{ piece: 'FA5', compte: '418001', date: '2026-10-25', montant: 10000, comptabilisee: true, bls: ['BL08'] }]);
});

test('contrôles : BL sans passage DME, passage DME sans BL, hospitalisation couvrant le BL', () => {
  const ev = [
    { kind: 'bl', source: 'sage', date: '2026-11-02', personne: AGENT },           // consultation la veille → OK
    { kind: 'bl', source: 'sage', date: '2026-11-20', personne: AGENT },           // rien dans le DME → à vérifier
    { kind: 'bl', source: 'sage', date: '2026-10-12', personne: AGENT },           // pendant l'hospitalisation → OK
    { kind: 'bl', source: 'sage', date: '2026-11-05', personne: '418009' },        // famille absente du DME → pas de contrôle
    { kind: 'consultation_dme', source: 'dme', date: '2026-11-01', personne: AGENT },
    { kind: 'consultation_dme', source: 'dme', date: '2026-09-01', personne: AGENT }, // aucun BL → à vérifier
    { kind: 'consultation_dme', source: 'dme', date: '2026-09-15', personne: AGENT, annule: true },
    { kind: 'hospitalisation', source: 'dme', date: '2026-10-10', fin: '2026-10-14', personne: AGENT },
  ];
  controlesCroises(ev, new Set([AGENT]));
  assert.deepEqual(ev.map((e) => e.controle || null), [null, 'sans_dme', null, null, null, 'sans_bl', null, null]);
});
