// Rendez-vous du DME pour les patients PHP
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rdvDepuisDme, statutFinal, libelleSpecialite, nomSpecialiste } from '../../src/utils/phpRdvDme.js';

const today = '2026-11-24';
const P1 = { id: 'p-1', matricule: '100001', nom: 'TEST', prenom: 'Un' };
const P2 = { id: 'p-2', matricule: '100002', nom: 'TEST', prenom: 'Deux' };
const patientsParDme = new Map([[11, { patient: P1, dossier: 'D-11' }], [22, { patient: P2, dossier: null }]]);
const specialistes = [{ id: 5, nom: 'Spé', prenom: 'Cardio', specialite: 'CARDIOLOGUE' }, { id: 4, nom: 'X', prenom: null, specialite: 'GASTRO_ENTEROLOGUE' }];

test('libellés des spécialités', () => {
  assert.equal(libelleSpecialite('CARDIOLOGUE'), 'Cardiologue');
  assert.equal(libelleSpecialite('GASTRO_ENTEROLOGUE'), 'Gastro-entérologue');
  assert.equal(libelleSpecialite('ORL'), 'ORL');
  assert.equal(libelleSpecialite(null), null);
});

test('nom du spécialiste : sans « Dr » ni mots génériques', () => {
  assert.equal(nomSpecialiste({ prenom: 'Dr Dentiste', nom: 'Dr Spécialiste' }, 'Dentiste'), null);
  assert.equal(nomSpecialiste({ prenom: 'Dr', nom: 'Gastro-entérologue' }, 'Gastro-entérologue'), null);
  assert.equal(nomSpecialiste({ prenom: 'Cardio', nom: 'Spé' }, 'Cardiologue'), 'Dr Cardio Spé');
  assert.equal(nomSpecialiste(undefined, 'ORL'), null);
});

test('statut : date passée sans clôture du DME', () => {
  assert.deepEqual(statutFinal('planifie', { date: '2026-11-30', today, passe: false }), { status: 'planifie', detail: null });
  assert.equal(statutFinal('planifie', { date: today, today, passe: false }).status, 'planifie');
  assert.equal(statutFinal('confirme', { date: '2026-11-20', today, passe: true }).status, 'honore');
  assert.equal(statutFinal('planifie', { date: '2026-11-20', today, passe: false }).status, 'depasse');
  assert.equal(statutFinal('en_cours', { date: '2026-11-20', today, passe: false }).status, 'honore');
  // statut final du DME jamais modifié
  assert.equal(statutFinal('annule', { date: '2026-11-20', today, passe: true }).status, 'annule');
  assert.equal(statutFinal('non_honore', { date: '2026-11-20', today, passe: true }).status, 'non_honore');
});

test('rendez-vous spécialiste, suivi et agenda → lignes de la GED', () => {
  const items = rdvDepuisDme({
    specialistes,
    rdvs: [
      { id: 1, patient_id: 11, specialiste_id: 5, date_rdv: '2026-11-26', heure_rdv: '09:30:00', motif: ' Douleur thoracique ', statut: 'EN_ATTENTE' },
      { id: 2, patient_id: 22, specialiste_id: 4, date_rdv: '2026-11-18', heure_rdv: null, motif: null, statut: 'TERMINE' },
      { id: 3, patient_id: 99, specialiste_id: 5, date_rdv: '2026-11-26', statut: 'EN_ATTENTE' }, // pas un patient PHP
    ],
    suivis: [{ id: 7, patient_id: 11, prochain_rdv: '2026-11-19', prochain_type_suivi: 'MALADIE_CHRONIQUE' }],
    agenda: [{ id: 8, patient_id: 22, date_debut: '2026-12-02 00:00:00', statut: 'confirme', titre: 'RDV de suivi', salle: null }],
    passages: new Set(['11|2026-11-19']),
  }, { patientsParDme, gedRdvs: [{ id: 'g-1', patientId: 'p-1', dateRdv: '2026-11-26' }], today });

  assert.deepEqual(items.map((i) => i.id), ['dme-specialiste-2', 'dme-suivi-7', 'dme-specialiste-1', 'dme-agenda-8']);
  const [termine, suivi, cardio, agenda] = items;
  assert.equal(termine.status, 'honore');
  assert.equal(termine.service, 'Gastro-entérologue · Dr X');
  assert.equal(suivi.status, 'honore'); // passé au DME ce jour-là
  assert.equal(suivi.service, 'Suivi · maladie chronique');
  assert.equal(cardio.heureRdv, '09:30');
  assert.equal(cardio.service, 'Cardiologue · Dr Cardio Spé');
  assert.equal(cardio.motif, 'Douleur thoracique');
  assert.equal(cardio.status, 'planifie');
  assert.equal(cardio.gedRdvId, 'g-1'); // déjà saisi dans la GED
  assert.equal(cardio.dossier, 'D-11');
  assert.equal(cardio.patient.id, 'p-1');
  assert.equal(agenda.heureRdv, null); // minuit = pas d'heure
  assert.equal(agenda.status, 'confirme');
  assert.equal(agenda.motif, 'RDV de suivi');
});
