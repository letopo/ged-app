// Hospitalisations PHP tenues à jour avec le DME : décision par hospitalisation
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deciderHospit } from '../../src/utils/phpHospitDme.js';

const H = { dateEntree: '2026-11-02' };
const opt = { trouve: true, dossier: 'HSJM0001' };

test('toujours hospitalisé dans le DME : on garde', () => {
  const d = deciderHospit(H, [{ id: 1, date_admission: '2026-11-03 10:00:00', date_sortie_effective: null, statut: 'en_cours', service: 'Médecine' }], opt);
  assert.equal(d.action, 'garder'); assert.equal(d.etat.code, 'hospitalise'); assert.equal(d.etat.label, 'Hospitalisé dans le DME · Médecine');
});

test('sorti dans le DME : date et type de sortie du séjour correspondant', () => {
  const d = deciderHospit(H, [
    { id: 1, date_admission: '2026-11-01 22:00:00', date_sortie_effective: '2026-11-06 09:00:00', statut: 'termine', type_sortie: 'transfert' },
    { id: 2, date_admission: '2026-06-01 08:00:00', date_sortie_effective: '2026-06-03 09:00:00', statut: 'termine', type_sortie: 'guerison' },
  ], opt);
  assert.equal(d.action, 'cloturer'); assert.equal(d.dateSortie, '2026-11-06'); assert.equal(d.status, 'transfert');
  assert.match(d.note, /dossier HSJM0001/); assert.match(d.note, /06\/11\/2026, transfert/);
});

test('séjour DME décalé (pas de correspondance) : première sortie après l’entrée ; décès', () => {
  const d = deciderHospit(H, [{ id: 3, date_admission: '2026-10-20 08:00:00', date_sortie_effective: '2026-11-09 07:00:00', statut: 'termine', type_sortie: 'deces' }], opt);
  assert.equal(d.status, 'deces'); assert.equal(d.dateSortie, '2026-11-09');
});

test('plus aucun séjour en cours ni sortie après l’entrée : clôture non datée', () => {
  const d = deciderHospit(H, [{ id: 4, date_admission: '2026-05-01 08:00:00', date_sortie_effective: '2026-05-04 08:00:00', statut: 'termine' }], opt);
  assert.equal(d.action, 'cloturer'); assert.equal(d.dateSortie, null); assert.equal(d.status, 'sorti'); assert.match(d.note, /date de sortie inconnue/);
});

test('nouveau séjour ouvert bien après l’entrée GED : l’ancienne hospitalisation est close', () => {
  const d = deciderHospit({ dateEntree: '2026-01-10' }, [
    { id: 5, date_admission: '2026-01-10 08:00:00', date_sortie_effective: '2026-01-15 08:00:00', statut: 'termine', type_sortie: 'guerison' },
    { id: 6, date_admission: '2026-11-15 08:00:00', date_sortie_effective: null, statut: 'en_cours' },
  ], opt);
  assert.equal(d.action, 'cloturer'); assert.equal(d.dateSortie, '2026-01-15'); assert.equal(d.status, 'sorti');
});

test('patient non retrouvé dans le DME : aucune action', () => {
  const d = deciderHospit(H, [], { trouve: false });
  assert.equal(d.action, 'aucune'); assert.equal(d.etat.code, 'introuvable');
});
