// Import du classeur Excel du Point Focal (module PHP) :
//  - les deux formats de la feuille Consultations (Devenir/Repos jusqu'en mars,
//    n° d'ordre / type CS-RDV-AUTRE / heures depuis avril) ;
//  - simulation sans écriture, puis import, puis réimport sans doublon ;
//  - infirmeries mal saisies ramenées à la liste, dates jour/mois inversées corrigées ;
//  - route réservée aux administrateurs et au Point Focal PHP.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import request from 'supertest';
import sequelize from '../../src/config/database.js';
import {
  toTime, toTypeVisite, normalizeService, normalizeInfirmerie, fixFutureDay, importPhpExcel,
} from '../../src/utils/phpExcelImport.js';
import { createTenant, makeFactory, authHeaders } from '../helpers/fixtures.js';

const { default: app } = await import('../../src/server.js');

let f, pointFocal, agent;
const as = (user) => authHeaders(f.tenant, user);
// Matricules et codes propres à ce test (colonnes uniques dans toute la base)
const M1 = '9900101', M2 = '9900102';
const INF = 'INF_TESTIMPORT';
const SEC = 'TESTIMPORT SECTEUR';

async function workbook() {
  const wb = new ExcelJS.Workbook();
  const sheet = (name, header, rows) => {
    const ws = wb.addWorksheet(name);
    ws.getRow(1).getCell(1).value = name;
    ws.getRow(3).values = header;
    rows.forEach((r, i) => { ws.getRow(4 + i).values = r; });
  };
  sheet('DB_Infirmeries', ['N°', 'Code Infirmerie', 'Localisation'], [[1, INF, 'TESTIMPORT']]);
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
    // date future (jour et mois inversés : 06/11 pour le 11/06)
    [990004, d('2026-11-06'), M1, 'TESTIMPORT JEAN PAUL', SEC, INF, 'BAV', 'OPTALMO', 3, 'CS', '', ''],
    // matricule non numérique : ignoré
    [990005, d('2026-10-29'), 'PHP', 'INCONNU', SEC, INF, 'X', 'MEDECINE', 4, 'CS'],
  ]);
  sheet('Hospitalisations', ['N°', 'Date Entrée', 'Matricule', 'Nom et Prénoms', 'Secteur', 'Infirmerie', 'Service', 'Chambre/Lit', 'Diagnostic', 'Date Sortie', 'Repos Maladie (jrs)'], [
    [99001, d('2026-10-01'), M1, 'TESTIMPORT JEAN PAUL', SEC, INF, 'CHIRURGIE', 'Chambre/Lit', 'HERNIE', d('2026-10-04'), 'Nombre de jours de repos'],
  ]);
  sheet('Repos', ['N°', 'ID_Consultation', 'Matricule', 'Nom', 'Secteur', 'Infirmerie', 'Service', 'Diagnostic', 'Date Debut', 'Nb Jours', 'Date Fin', 'Date RDV', 'Statut', 'Nb Prolongations', 'Total Jours Cumules', 'Historique Periodes'], [
    [99001, 990001, M1, 'TESTIMPORT JEAN PAUL', SEC, INF, 'MEDECINE', 'PALUDISME', d('2026-02-10'), 3, d('2026-02-13'), null, 'CLOTURE', 0, 3, '10/02/2026 > 13/02/2026 (3j)'],
  ]);
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
  assert.deepEqual(fixFutureDay('2026-11-06', '2026-10-30'), { day: '2026-06-11', fixed: true });
  assert.deepEqual(fixFutureDay('2026-10-29', '2026-10-30'), { day: '2026-10-29' });
});

test('simulation, import, puis réimport sans doublon', async () => {
  const buf = await workbook();
  const ctx = { userId: pointFocal.id, tenantId: f.tenant.id };

  const dry = await importPhpExcel(buf, ctx);
  assert.equal(dry.consultations.created, 4);
  assert.equal(dry.ignores.Consultations['matricule absent ou non numérique'], 1);
  const [[{ n }]] = await sequelize.query("SELECT count(*)::int n FROM php_consultations WHERE excel_ref LIKE 'C:99%'");
  assert.equal(n, 0, 'la simulation n\'écrit rien');

  const done = await importPhpExcel(buf, { ...ctx, apply: true });
  assert.equal(done.consultations.created, 4);
  assert.equal(done.patients.created, 2);
  assert.equal(done.datesCorrigees.length, 1);

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
  assert.equal(byRef['C:990004'].d, '2026-06-11');
  assert.ok(rows.every(r => r.bon), 'chaque consultation importée a son bon (statistiques)');

  const [[repos]] = await sequelize.query("SELECT consultation_id IS NOT NULL lie, status FROM php_repos WHERE excel_ref = 'R:99001'");
  assert.deepEqual(repos, { lie: true, status: 'termine' });
  const [[hosp]] = await sequelize.query("SELECT numero_chambre, status FROM php_hospitalisations WHERE excel_ref = 'H:99001'");
  assert.deepEqual(hosp, { numero_chambre: null, status: 'sorti' }, 'texte d\'aide « Chambre/Lit » non repris');

  const again = await importPhpExcel(buf, { ...ctx, apply: true });
  for (const k of ['patients', 'consultations', 'hospitalisations', 'repos']) {
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
