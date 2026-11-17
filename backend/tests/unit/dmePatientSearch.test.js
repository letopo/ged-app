// Recherche d'un patient PHP dans le DME : nom découpé autrement, faute de
// matricule, doublons, homonymes
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexerDme, rechercherDansDme, motsDuNom, matriculeVoisin, comparerNoms } from '../../src/utils/dmePatientSearch.js';

const DME = [
  { id: 101, dossier_numero: 'HSJM00000001', nom: 'BEKONO ATANGA', prenom: 'SOLANGE', date_naissance: '1986-01-01', type_client: 'AGENTS_PHP', matricule_agent: '512303', numero_compte_sage: '418028243' },
  { id: 102, dossier_numero: 'HSJM00000002', nom: 'BEKONO', prenom: 'Solange', date_naissance: '1986-01-01', type_client: 'PAYANT_COMPTANT', matricule_agent: null, numero_compte_sage: null },
  { id: 20, nom: 'NGO', prenom: 'MARIE', date_naissance: '1990-05-05', type_client: 'PAYANT_COMPTANT', matricule_agent: null },
  { id: 21, nom: 'NGO MARIE', prenom: 'CLAIRE', date_naissance: '1975-02-02', type_client: 'AGENTS_PHP', matricule_agent: '500100' },
  { id: 30, nom: 'TCHOUA', prenom: 'Jean Pierre', date_naissance: '1980-03-03', type_client: 'AGENTS_PHP', matricule_agent: '612345', numero_compte_sage: '418 0001' },
  { id: 40, nom: 'BIYONG', prenom: 'Samuel', date_naissance: '1970-01-01', type_client: 'AGENTS_PHP', matricule_agent: '700001' },
];
const idx = indexerDme(DME);
const find = (p) => rechercherDansDme(p, idx);

test('outils : mots du nom, matricules voisins, comparaison des noms', () => {
  assert.deepEqual(motsDuNom('Épse MBALLA', 'Marie-Thérèse'), ['MBALLA', 'MARIE', 'THERESE']);
  assert.equal(matriculeVoisin('512309', '512303'), true);
  assert.equal(matriculeVoisin('512309', '512390'), true); // deux chiffres inversés
  assert.equal(matriculeVoisin('512309', '512333'), false);
  assert.deepEqual(comparerNoms(motsDuNom('BEKONO', 'ATANGA SOLANGE'), motsDuNom('BEKONO ATANGA', 'SOLANGE')), { communs: 3, complet: true, identique: true });
  assert.equal(comparerNoms(['SOLANGE', 'BEKONO'], ['SOLANGEE', 'BEKONO']).complet, true); // une faute tolérée
});

test('cas réel : nom découpé autrement + matricule à un chiffre près + doublon signalé', () => {
  const r = find({ matricule: '512309', nom: 'BEKONO', prenom: 'ATANGA SOLANGE' });
  assert.equal(r.confiance, 'sure');
  assert.deepEqual(r.fiches.map((f) => f.id), [101, 102]);
  assert.equal(r.doublons, true);
  assert.deepEqual(r.ecartMatricule, ['512303']);
  assert.ok(r.fiches[0].raisons.includes('matricule voisin'));
  assert.ok(r.fiches[1].raisons.includes('même personne (doublon)'));
});

test('compte Sage confirmé, matricule exact', () => {
  assert.deepEqual(find({ matricule: '000', nom: 'X', prenom: 'Y', comptes: ['4180001'] }).fiches.map((f) => f.id), [30]);
  const r = find({ matricule: '612345', nom: 'TCHOUA', prenom: 'J.P.' });
  assert.equal(r.confiance, 'sure'); assert.deepEqual(r.fiches.map((f) => f.id), [30]); assert.equal(r.ecartMatricule, null);
});

test('homonymes : un autre agent (autre matricule) n’est pas pris sur le nom seul', () => {
  // GED « NGO MARIE » matricule 999999 : la fiche agent 21 a un autre matricule ; la fiche 20 (payante, 2 mots identiques) est probable
  const r = find({ matricule: '999999', nom: 'NGO', prenom: 'MARIE' });
  assert.deepEqual(r.fiches.map((f) => f.id), [20]); assert.equal(r.confiance, 'probable');
  // date de naissance différente : écartée
  assert.equal(find({ matricule: '999999', nom: 'NGO', prenom: 'MARIE', dateNaissance: '2001-01-01' }).fiches.length, 0);
  // un seul mot commun : rien
  assert.equal(find({ matricule: '123456', nom: 'BIYONG', prenom: 'Paul' }).fiches.length, 0);
});

test('dates de naissance : invraisemblables ignorées, année seule comparée à ± 1 an', async () => {
  const { comparerNaissances } = await import('../../src/utils/dmePatientSearch.js');
  const now = new Date('2026-11-17');
  assert.equal(comparerNaissances('2026-11-03', '2001-01-01', now), null); // date d'inscription dans la GED
  assert.equal(comparerNaissances('1986-01-01', '1986-01-01', now), 'ok');
  assert.equal(comparerNaissances('1986-06-12', '1987-01-01', now), null);
  assert.equal(comparerNaissances('1986-06-12', '1990-01-01', now), 'ko');
  assert.equal(comparerNaissances('1986-06-12', '1986-06-13', now), 'ko');
});

test('agent enregistré « payant comptant » au DME : retenu s’il est le seul possible ; nom trop courant : rien', () => {
  const rows = [
    { id: 1, nom: 'NDJOMO KEMBOU', prenom: 'Odile', date_naissance: '1980-01-01', type_client: 'PAYANT_COMPTANT' },
    ...[1, 2, 3, 4].map((i) => ({ id: 10 + i, nom: 'NGO', prenom: `MARIE X${'ABCD'[i - 1]}Z`, date_naissance: '1980-01-01', type_client: 'PAYANT_COMPTANT' })),
  ];
  const ix = indexerDme(rows);
  const r = rechercherDansDme({ matricule: '600999', nom: 'NDJOMO', prenom: 'ODILE', dateNaissance: '2026-11-03' }, ix);
  assert.equal(r.confiance, 'probable'); assert.deepEqual(r.fiches.map((f) => f.id), [1]);
  assert.equal(rechercherDansDme({ matricule: '1', nom: 'NGO', prenom: 'MARIE' }, ix).fiches.length, 0);
});

test('liens enregistrés : fiche confirmée toujours retenue, fiche écartée jamais reprise', () => {
  // confirmée à la main alors que rien ne correspond
  const r = find({ matricule: '123', nom: 'INCONNU', prenom: 'X', liens: { confirmes: [40], ecartes: [] } });
  assert.equal(r.confiance, 'sure'); assert.deepEqual(r.fiches.map((f) => f.id), [40]);
  assert.ok(r.fiches[0].raisons.includes('lien confirmé'));
  // le doublon écarté (« ce n'est pas lui ») disparaît, la bonne fiche reste
  const e = find({ matricule: '512309', nom: 'BEKONO', prenom: 'ATANGA SOLANGE', liens: { confirmes: [], ecartes: [102] } });
  assert.deepEqual(e.fiches.map((f) => f.id), [101]); assert.equal(e.doublons, false);
  // même une fiche au même matricule est ignorée si elle a été écartée
  assert.equal(find({ matricule: '612345', nom: 'Z', prenom: 'Z', liens: { ecartes: [30] } }).fiches.length, 0);
});
