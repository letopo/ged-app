// Suivi DME des consultations PHP : rapprochement des fiches et état du jour
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suiviDuPatient, todayLocal } from '../../src/utils/phpSuiviDme.js';
import { indexerDme, rechercherDansDme } from '../../src/utils/dmePatientSearch.js';
const matchDmePatients = (p, rows) => rechercherDansDme(p, indexerDme(rows));

const DME = [
  { id: 1, nom: 'NGO', prenom: 'Paul', type_client: 'AGENTS_PHP', matricule_agent: '0735106', statut_parcours: 'ATTENTE_CONSULTATION', modifie: '2026-11-17 08:10:00' },
  { id: 2, nom: 'Ngo', prenom: 'Paul', type_client: 'AGENTS_PHP', matricule_agent: '735106 / A', statut_parcours: 'SORTI', modifie: '2026-10-02 10:00:00' },
  { id: 3, nom: 'ÉTOUNDI', prenom: 'Marie', type_client: 'AGENTS_PHP', matricule_agent: null, statut_parcours: 'EN_CONSULTATION', modifie: '2026-11-17 09:00:00' },
  { id: 4, nom: 'MBA', prenom: 'Luc', type_client: 'AGENTS_PHP', matricule_agent: '', statut_parcours: 'SORTI', modifie: '2026-11-17 09:00:00' },
  { id: 5, nom: 'MBA', prenom: 'Luc', type_client: 'AGENTS_PHP', matricule_agent: '', statut_parcours: 'SORTI', modifie: '2026-11-17 09:00:00' },
];
const services = new Map([[20, 'Consultation Ext. PHP']]);

test('rapprochement : matricule normalisé (doublons gardés), sinon nom unique', () => {
  assert.deepEqual(matchDmePatients({ matricule: '735106', nom: 'X' }, DME).fiches.map((f) => f.id), [1, 2]);
  const m = matchDmePatients({ matricule: '', nom: 'Etoundi', prenom: 'MARIE' }, DME);
  assert.equal(m.confiance, 'probable'); assert.deepEqual(m.fiches.map((f) => f.id), [3]);
  // deux fiches au même nom sans matricule : on ne devine pas, on les montre
  const amb = matchDmePatients({ matricule: '999999', nom: 'MBA', prenom: 'Luc' }, DME);
  assert.equal(amb.confiance, 'ambigu'); assert.equal(amb.fiches.length, 2);
});

test("aujourd'hui : étape en cours du DME, frise consultation → labo → imagerie", () => {
  const match = matchDmePatients({ matricule: '735106' }, DME);
  const s = suiviDuPatient(match, {
    consultations: [{ patient_id: 2, date_consultation: '2026-11-17 08:20:00', date_cloture: null, statut: 'en_cours', service_id: 20 }],
    labos: [{ patient_id: 1, date_creation: '2026-11-17 08:45:00', statut: 'EN_ANALYSE' }],
    imageries: [{ patient_id: 9, date_creation: '2026-11-17 08:50:00', statut: 'EN_ATTENTE', type_examen: 'radiographie' }],
  }, { date: '2026-11-17', today: '2026-11-17', services });
  assert.equal(s.trouve, true);
  assert.equal(s.etat.code, 'attente'); // fiche la plus récente (id 1), modifiée aujourd'hui
  assert.deepEqual(s.frise.map((e) => [e.kind, e.heure]), [['consultation', '08:20'], ['labo', '08:45']]);
  assert.equal(s.frise[0].titre, 'Consultation · Consultation Ext. PHP');
  assert.equal(s.frise[1].statut, 'en analyse');
});

test('jour passé : vu par le médecin ; sans passage ; patient introuvable', () => {
  const match = { fiches: [DME[0]], confiance: 'sure' };
  const vu = suiviDuPatient(match, { consultations: [{ patient_id: 1, date_consultation: '2026-11-16 10:05:00', date_cloture: '2026-11-16 10:40:00', statut: 'terminee', service_id: 20, devenir: 'SORTIE' }] },
    { date: '2026-11-16', today: '2026-11-17', services });
  assert.equal(vu.etat.code, 'vu'); assert.equal(vu.etat.heure, '10:05');
  assert.equal(vu.frise[0].fin, '10:40'); assert.equal(vu.frise[0].detail, 'Devenir : sortie');
  assert.equal(suiviDuPatient(match, {}, { date: '2026-11-16', today: '2026-11-17' }).etat.code, 'pas_de_passage');
  assert.equal(suiviDuPatient({ fiches: [] }, {}, { date: '2026-11-16', today: '2026-11-17' }).etat.code, 'introuvable');
});

test("aujourd'hui : « sorti » après consultation = vu ; étape non modifiée aujourd'hui ignorée", () => {
  const sorti = { ...DME[0], statut_parcours: 'SORTI' };
  const s = suiviDuPatient({ fiches: [sorti] }, { consultations: [{ patient_id: 1, date_consultation: '2026-11-17 08:20:00', statut: 'terminee' }] },
    { date: '2026-11-17', today: '2026-11-17' });
  assert.equal(s.etat.code, 'vu'); assert.equal(s.etat.label, 'Vu par le médecin, sorti');
  const ancien = suiviDuPatient({ fiches: [DME[1]] }, {}, { date: '2026-11-17', today: '2026-11-17' });
  assert.equal(ancien.etat.code, 'pas_de_passage'); assert.equal(ancien.etat.label, 'Fiche trouvée · pas encore arrivé');
});

test('date du jour à Douala', () => {
  assert.equal(todayLocal(new Date('2026-11-16T23:30:00Z')), '2026-11-17');
});

test('dernier passage au DME avant le jour affiché', () => {
  const s = suiviDuPatient({ fiches: [{ id: 1 }, { id: 2 }] }, { derniers: [{ patient_id: 1, d: '2026-09-29 12:43:10' }, { patient_id: 2, d: '2026-10-21 12:54:09' }, { patient_id: 9, d: '2026-11-01 08:00:00' }] },
    { date: '2026-11-17', today: '2026-11-17' });
  assert.equal(s.dernierPassage, '2026-10-21 12:54');
  assert.equal(s.etat.label, 'Fiche trouvée · pas encore arrivé');
});
