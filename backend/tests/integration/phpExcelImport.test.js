// Import du classeur Excel du Point Focal (module PHP) :
//  - les deux formats de la feuille Consultations (Devenir/Repos jusqu'en mars,
//    n° d'ordre / type CS-RDV-AUTRE / heures depuis avril) ;
//  - simulation sans écriture, puis import, puis réimport sans doublon ;
//  - infirmeries mal saisies ramenées à la liste, dates jour/mois inversées corrigées ;
//  - feuille PHARMACIE : source, quantité écrite dans la cellule du produit,
//    servi / reste, faute sur l'année, lien à la consultation du jour ;
//  - route réservée aux administrateurs et au Point Focal PHP.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import request from 'supertest';
import sequelize from '../../src/config/database.js';
import {
  toTime, toTypeVisite, normalizeService, normalizeInfirmerie, fixSwappedDay, fixTypoDay, splitProduit, importPhpExcel,
} from '../../src/utils/phpExcelImport.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f, pointFocal, agent;
const as = (user) => authHeaders(f.tenant, user);
// Matricules et codes propres à ce test (colonnes uniques dans toute la base)
const M1 = '9900101', M2 = '9900102';
const INF = 'INF_TESTIMPORT';
const INF2 = 'INF_TESTIMPORT2';
const SEC = 'TESTIMPORT SECTEUR';

async function workbook() {
  const wb = new ExcelJS.Workbook();
  const sheet = (name, header, rows) => {
    const ws = wb.addWorksheet(name);
    ws.getRow(1).getCell(1).value = name;
    ws.getRow(3).values = header;
    rows.forEach((r, i) => { ws.getRow(4 + i).values = r; });
  };
  sheet('DB_Infirmeries', ['N°', 'Code Infirmerie', 'Localisation'], [[1, INF, 'TESTIMPORT'], [2, INF2, 'TESTIMPORT 2']]);
  sheet('DB_Secteurs', ['N°', 'Secteur', 'Infirmerie'], [[1, SEC, INF]]);
  sheet('DB_Patients', ['Matricule', 'Nom et Prénoms', 'Secteur', 'Infirmerie', 'Statut'], [
    [M1, 'TESTIMPORT JEAN PAUL', SEC, INF, 'ACTIF'],
  ]);
  const d = (s) => new Date(`${s}T00:00:00Z`);
  sheet('Consultations', ['N°', 'Date', 'Matricule', 'Nom et Prénoms', 'Secteur', 'Infirmerie', 'Diagnostic', 'Service', 'Devenir', 'Repos (jrs)', 'Utilisateur'], [
    // ancien format : Devenir = REPOS
    [990001, d('2026-02-10'), M1, 'TESTIMPORT JEAN PAUL', SEC, INF, 'PALUDISME', 'MEDECINE', 'REPOS', 3, 'IMPORT'],
    // nouveau format : n° d'ordre, type, arrivée, passage ; service et infirmerie mal saisis
    [990002, d('2026-10-29'), Number(M2), 'TESTIMPORT MARIE', SEC, 'INF_TESTIMPORT ', 'SUIVI HTA', 'GASTROLOGUE', 1, 'RDV', '07H33', '10H08'],
    [990003, d('2026-10-29'), Number(M1), 'TESTIMPORT JEAN PAUL', SEC, INF, 'BILANS', 'LABO 100%', 2, 'autres', '08H', '09:15'],
    // jour et mois inversés : 06/11 saisi pour le 11/06, entre deux lignes de juin
    // venu ce jour-là d'une autre infirmerie que celle de sa fiche
    [990010, d('2026-06-10'), M1, 'TESTIMPORT JEAN PAUL', SEC, INF2, 'SUIVI', 'MEDECINE', 1, 'RDV', '', ''],
    [990004, d('2026-11-06'), M1, 'TESTIMPORT JEAN PAUL', SEC, INF, 'BAV', 'OPTALMO', 3, 'CS', '', ''],
    // 01/07 compris comme le 7 janvier, au milieu de juillet : corrigé aussi (date passée)
    [990011, d('2026-07-01'), M1, 'TESTIMPORT JEAN PAUL', SEC, INF, 'SUIVI', 'MEDECINE', 1, 'RDV', '', ''],
    [990012, d('2026-01-07'), M2, 'TESTIMPORT MARIE', SEC, INF, 'SUIVI', 'MEDECINE', 2, 'RDV', '', ''],
    // matricule non numérique : ignoré
    [990005, d('2026-10-29'), 'PHP', 'INCONNU', SEC, INF, 'X', 'MEDECINE', 4, 'CS'],
  ]);
  sheet('Hospitalisations', ['N°', 'Date Entrée', 'Matricule', 'Nom et Prénoms', 'Secteur', 'Infirmerie', 'Service', 'Chambre/Lit', 'Diagnostic', 'Date Sortie', 'Repos Maladie (jrs)'], [
    [99001, d('2026-10-01'), M1, 'TESTIMPORT JEAN PAUL', SEC, INF, 'CHIRURGIE', 'Chambre/Lit', 'HERNIE', d('2026-10-04'), 'Nombre de jours de repos'],
  ]);
  sheet('Repos', ['N°', 'ID_Consultation', 'Matricule', 'Nom', 'Secteur', 'Infirmerie', 'Service', 'Diagnostic', 'Date Debut', 'Nb Jours', 'Date Fin', 'Date RDV', 'Statut', 'Nb Prolongations', 'Total Jours Cumules', 'Historique Periodes'], [
    [99001, 990001, M1, 'TESTIMPORT JEAN PAUL', SEC, INF, 'MEDECINE', 'PALUDISME', d('2026-02-10'), 3, d('2026-02-13'), null, 'CLOTURE', 0, 3, '10/02/2026 > 13/02/2026 (3j)'],
  ]);
  // PHARMACIE : titre en ligne 1, en-tête en ligne 4, données dès la ligne 5
  const pharma = wb.addWorksheet('PHARMACIE');
  pharma.getRow(1).getCell(1).value = 'REGISTRE DE PHARMACIE';
  pharma.getRow(4).values = ['No', 'DATE', 'MATRICULE', 'NOM ET PRENOM', 'SECTEUR', 'HSJM', 'QTE', 'HOPITAL EXT', 'QTE', 'MEDECIN DU TRAVAIL', 'QTE', 'NBRE SERVI', 'RESTE'];
  [
    [1, d('2026-10-29'), Number(M1), 'TESTIMPORT JEAN PAUL', SEC, 'TESTPHARMA ANTALGEX-T                  1', null, null, null, null, null, 1, 0],
    [1, d('2026-10-29'), Number(M1), 'TESTIMPORT JEAN PAUL', SEC, 'TESTPHARMA OMEPRAZOLE 20', 2, null, null, null, null, 1, 1],
    // 2025 saisi pour 2026 ; médecin du travail, rien de servi
    [2, d('2025-10-30'), Number(M2), 'TESTIMPORT MARIE', SEC, null, null, null, null, 'TESTPHARMA REVITAL', 2, null, null],
    [3, d('2026-10-30'), Number(M2), 'TESTIMPORT MARIE', SEC],
  ].forEach((r, i) => { pharma.getRow(5 + i).values = r; });
  return Buffer.from(await wb.xlsx.writeBuffer());
}

before(async () => {
  f = makeFactory(await createTenant());
  pointFocal = await f.user({ role: 'agent_accueil_php' });
  agent = await f.user();
});
after(async () => {
  await sequelize.query(`
    DELETE FROM php_repos WHERE excel_ref LIKE 'R:99%';
    DELETE FROM php_hospitalisations WHERE excel_ref LIKE 'H:99%';
    DELETE FROM php_consultations WHERE excel_ref LIKE 'C:99%';
    DELETE FROM php_bons_prise_en_charge WHERE numero_bon LIKE 'XL-99%';
    DELETE FROM php_patients WHERE matricule IN ('${M1}', '${M2}');
    DELETE FROM php_secteurs WHERE code = 'SEC_TESTIMPORT_SECTEUR';
    DELETE FROM php_infirmeries WHERE code = '${INF}';
  `);
  await sequelize.close();
});

test('lecture des cellules : heures, types, services, infirmeries, dates inversées', () => {
  assert.equal(toTime('07H33'), '07:33:00');
  assert.equal(toTime('8H'), '08:00:00');
  assert.equal(toTime('09:15'), '09:15:00');
  assert.equal(toTime('IMPORT'), null);
  assert.equal(toTypeVisite('rdv '), 'RDV');
  assert.equal(toTypeVisite('RVDV'), 'RDV');
  assert.equal(toTypeVisite('AUTRES'), 'AUTRE');
  assert.equal(toTypeVisite('CS A TITRE EXCEPTIONNEL P,O DG'), 'CS');
  assert.equal(toTypeVisite('3'), null);
  assert.equal(normalizeService('GASTROLOGUE'), 'GASTROENTEROLOGIE');
  assert.equal(normalizeService('OPTALMO'), 'OPHTALMOLOGIE');
  assert.equal(normalizeService('S A U'), 'SAU');
  assert.equal(normalizeService('MEDECINE+LABO 100%'), 'MEDECINE');
  assert.equal(normalizeInfirmerie('INF_PHP/BAS'), 'INF_PHP_BAS');
  assert.equal(normalizeInfirmerie('INF_ NYOMBE'), 'INF_NYOMBE');
  assert.equal(normalizeInfirmerie('INF_NJOMBE'), 'INF_NYOMBE');
  // 06/11 saisi pour le 11/06 au milieu des lignes de juin : corrigé, avant comme après le 6 novembre
  assert.deepEqual(fixSwappedDay('2026-11-06', '2026-06-10', '2026-10-30'), { day: '2026-06-11', fixed: true });
  assert.deepEqual(fixSwappedDay('2026-11-06', '2026-06-10', '2027-01-15'), { day: '2026-06-11', fixed: true });
  // Date normale, proche de la précédente : inchangée
  assert.deepEqual(fixSwappedDay('2026-10-29', '2026-10-28', '2026-10-30'), { day: '2026-10-29' });
  assert.deepEqual(fixSwappedDay('2026-11-06', '2026-11-05', '2026-11-07'), { day: '2026-11-06' });
  // Saut réel sans inversion plausible (reprise après les congés) : inchangé
  assert.deepEqual(fixSwappedDay('2026-01-05', '2025-12-10', '2026-10-30'), { day: '2026-01-05' });
  // Date future sans inversion possible : ignorée
  assert.deepEqual(fixSwappedDay('2026-12-25', null, '2026-10-30'), { day: null });
  // Registre pharmacie : faute sur l'année ou le mois, ramenée à côté de la ligne précédente
  assert.deepEqual(fixTypoDay('2025-07-30', '2026-07-29', '2026-10-30'), { day: '2026-07-30', fixed: true });
  assert.deepEqual(fixTypoDay('2026-01-31', '2026-07-30', '2026-10-30'), { day: '2026-07-31', fixed: true });
  assert.deepEqual(fixTypoDay('2026-08-03', '2026-07-30', '2026-10-30'), { day: '2026-08-03' });
  // Quantité écrite après le produit (grands espaces) ; un dosage collé au nom reste dans le nom
  assert.deepEqual(splitProduit('ANTALGEX-T                  1   '), { produit: 'ANTALGEX-T', quantite: 1 });
  assert.deepEqual(splitProduit('VIT  B  DENK                                    1'), { produit: 'VIT B DENK', quantite: 1 });
  assert.deepEqual(splitProduit('omeprazole 20'), { produit: 'OMEPRAZOLE 20', quantite: null });
});

test('simulation, import, puis réimport sans doublon', async () => {
  const buf = await workbook();
  const ctx = { userId: pointFocal.id, tenantId: f.tenant.id };

  const dry = await importPhpExcel(buf, ctx);
  assert.equal(dry.consultations.created, 7);
  assert.equal(dry.ignores.Consultations['matricule absent ou non numérique'], 1);
  const [[{ n }]] = await sequelize.query("SELECT count(*)::int n FROM php_consultations WHERE excel_ref LIKE 'C:99%'");
  assert.equal(n, 0, 'la simulation n\'écrit rien');

  const done = await importPhpExcel(buf, { ...ctx, apply: true });
  assert.equal(done.consultations.created, 7);
  assert.equal(done.patients.created, 2);
  assert.deepEqual(done.datesCorrigees.filter(c => c.feuille === 'Consultations').map(c => [c.n, c.corrige]), [[990004, '2026-06-11'], [990012, '2026-07-01']]);

  const [rows] = await sequelize.query(`
    SELECT excel_ref, date_consultation::text d, type_visite, numero_ordre, service_name, resultat,
           heure_arrivee::text a, heure_debut_consultation::text p, duree_attente_minutes w, bon_prise_en_charge_id IS NOT NULL bon
    FROM php_consultations WHERE excel_ref LIKE 'C:99%' ORDER BY excel_ref`);
  const byRef = Object.fromEntries(rows.map(r => [r.excel_ref, r]));
  assert.equal(byRef['C:990001'].resultat, 'repos');
  assert.equal(byRef['C:990001'].type_visite, null);
  assert.deepEqual(
    [byRef['C:990002'].type_visite, byRef['C:990002'].numero_ordre, byRef['C:990002'].service_name, byRef['C:990002'].a, byRef['C:990002'].p, byRef['C:990002'].w],
    ['RDV', 1, 'GASTROENTEROLOGIE', '07:33:00', '10:08:00', 155],
  );
  assert.equal(byRef['C:990003'].type_visite, 'AUTRE');
  // Infirmerie de la ligne de consultation (tableau du jour), la fiche du patient garde la sienne
  const [places] = await sequelize.query(`
    SELECT c.excel_ref, ci.code AS visite, pi.code AS fiche, c.secteur_id IS NOT NULL AS secteur
    FROM php_consultations c JOIN php_patients p ON p.id = c.patient_id
    LEFT JOIN php_infirmeries ci ON ci.id = c.infirmerie_id LEFT JOIN php_infirmeries pi ON pi.id = p.infirmerie_id
    WHERE c.excel_ref IN ('C:990010', 'C:990011') ORDER BY c.excel_ref`);
  assert.deepEqual(places.map(r => [r.excel_ref, r.visite, r.fiche, r.secteur]), [['C:990010', INF2, INF, true], ['C:990011', INF, INF, true]]);
  assert.equal(byRef['C:990004'].d, '2026-06-11');
  assert.ok(rows.every(r => r.bon), 'chaque consultation importée a son bon (statistiques)');
  const [[bon]] = await sequelize.query("SELECT b.date_emission::text d FROM php_bons_prise_en_charge b JOIN php_consultations c ON c.bon_prise_en_charge_id = b.id WHERE c.excel_ref = 'C:990004'");
  assert.equal(bon.d, '2026-06-11', 'le bon suit la date corrigée');

  const [[repos]] = await sequelize.query("SELECT consultation_id IS NOT NULL lie, status FROM php_repos WHERE excel_ref = 'R:99001'");
  assert.deepEqual(repos, { lie: true, status: 'termine' });
  const [[hosp]] = await sequelize.query("SELECT numero_chambre, status FROM php_hospitalisations WHERE excel_ref = 'H:99001'");
  assert.deepEqual(hosp, { numero_chambre: null, status: 'sorti' }, 'texte d\'aide « Chambre/Lit » non repris');

  // Pharmacie : 3 produits, la ligne sans produit ignorée
  assert.equal(done.pharmacie.created, 3);
  assert.equal(done.ignores.Pharmacie['produit absent'], 1);
  assert.ok(done.datesCorrigees.some(c => c.feuille === 'Pharmacie' && c.lu === '2025-10-30' && c.corrige === '2026-10-30'));
  const [pharma] = await sequelize.query(`
    SELECT l.produit, l.source, l.date_prescription::text d, l.quantite_prescrite q, l.quantite_servie s, c.excel_ref AS consultation, l.tenant_id = :t AS tenant
    FROM php_pharmacie_lignes l LEFT JOIN php_consultations c ON c.id = l.consultation_id
    WHERE l.produit LIKE 'TESTPHARMA%' ORDER BY l.produit`, { replacements: { t: f.tenant.id } });
  assert.deepEqual(pharma.map(r => [r.produit, r.source, r.d, r.q, r.s, r.consultation, r.tenant]), [
    ['TESTPHARMA ANTALGEX-T', 'hsjm', '2026-10-29', 1, 1, 'C:990003', true],
    ['TESTPHARMA OMEPRAZOLE 20', 'hsjm', '2026-10-29', 2, 1, 'C:990003', true],
    ['TESTPHARMA REVITAL', 'medecin_travail', '2026-10-30', 2, 0, null, true],
  ]);

  const again = await importPhpExcel(buf, { ...ctx, apply: true });
  for (const k of ['patients', 'consultations', 'hospitalisations', 'repos', 'pharmacie']) {
    assert.equal(again[k].created, 0, `${k} : aucun doublon`);
    assert.equal(again[k].updated, 0, `${k} : rien à modifier`);
  }
});

test('route : Point Focal PHP autorisé, simulation par défaut ; autres utilisateurs refusés', async () => {
  const buf = await workbook();
  const no = await request(app).post('/api/php/import-excel').set(as(agent)).attach('file', buf, 'HSJM.xlsm');
  assert.equal(no.status, 403);
  const yes = await request(app).post('/api/php/import-excel').set(as(pointFocal)).attach('file', buf, 'HSJM.xlsm');
  assert.equal(yes.status, 200, yes.body?.message);
  assert.equal(yes.body.report.apply, false);
  const bad = await request(app).post('/api/php/import-excel').set(as(pointFocal)).attach('file', Buffer.from('x'), 'notes.txt');
  assert.equal(bad.status, 400);
});
