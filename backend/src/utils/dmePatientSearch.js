// backend/src/utils/dmePatientSearch.js
// Recherche d'un patient PHP dans le DME, en croisant plusieurs informations
// (17/11/2026). Pourquoi : à l'accueil, le nom est découpé au hasard entre nom
// et prénom (« BEKONO / ATANGA SOLANGE » ↔ « BEKONO ATANGA / SOLANGE »), une
// partie du nom est parfois omise, le matricule peut avoir une faute de frappe,
// et le même patient peut avoir plusieurs fiches (doublons).
//
// Indices, du plus sûr au plus faible :
//  - matricule identique (une fois normalisé) ;
//  - compte tiers Sage confirmé pour ce patient (Module PHP › comptes Sage) ;
//  - nom complet : mêmes mots, dans n'importe quel ordre et découpage, une
//    petite faute tolérée sur les mots longs ;
//  - matricule voisin (un chiffre différent ou deux chiffres inversés) ;
//  - date de naissance identique (confirme) ou différente (infirme).
// Une fiche n'est retenue sur le nom seul que si elle est la seule possible ;
// les autres fiches de la même personne (mêmes mots du nom + même date de
// naissance qu'une fiche retenue) sont signalées comme doublons.
import { normMatricule, normCompteTiers } from './phpSageComptes.js';

const PARTICULES = new Set(['EPSE', 'EP', 'EPOUSE', 'VVE', 'VEUVE', 'DIT', 'DITE', 'MME', 'MLLE', 'MR', 'M']);
const PHP_TYPES = new Set(['AGENTS_PHP', 'FAMILLE_PHP']);

/** Mots du nom complet, sans accents ni particules (« épse », « dit »…). */
export function motsDuNom(...parts) {
  const s = parts.filter(Boolean).join(' ').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  return [...new Set(s.split(/[^A-Z]+/).filter((w) => w.length >= 2 && !PARTICULES.has(w)))];
}

/** Distance d'édition bornée à 1 (substitution, insertion, suppression). */
function auPlusUneFaute(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, fautes = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++fautes > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else { i++; j++; }
  }
  return fautes + (a.length - i) + (b.length - j) <= 1;
}
/**
 * Dates de naissance : 'ok' (identiques), 'ko' (différentes), null (on ne sait
 * pas). Ignorées si invraisemblables (la GED garde parfois la date
 * d'inscription) ; « 1er janvier » = année seule saisie dans le DME : on ne
 * compare alors que l'année (± 1 an).
 */
export function comparerNaissances(a, b, now = new Date()) {
  const ok = (d) => /^\d{4}-\d{2}-\d{2}/.test(d || '') && d.slice(0, 4) >= '1900' && Date.parse(d.slice(0, 10)) < now.getTime() - 365 * 86_400_000;
  if (!ok(a) || !ok(b)) return null;
  const [x, y] = [a.slice(0, 10), b.slice(0, 10)];
  if (x === y) return 'ok';
  if (x.endsWith('-01-01') || y.endsWith('-01-01')) return Math.abs(Number(x.slice(0, 4)) - Number(y.slice(0, 4))) <= 1 ? null : 'ko';
  return 'ko';
}

const memeMot = (a, b) => a === b || (a.length >= 5 && b.length >= 5 && auPlusUneFaute(a, b));

/** Matricules voisins : même longueur, un chiffre différent ou deux chiffres voisins inversés. */
export function matriculeVoisin(a, b) {
  if (!a || !b || a === b || a.length !== b.length || a.length < 4) return false;
  const diff = [...a].map((c, i) => (c === b[i] ? -1 : i)).filter((i) => i >= 0);
  if (diff.length === 1) return true;
  return diff.length === 2 && diff[1] === diff[0] + 1 && a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]];
}

/**
 * Comparaison des noms : `complet` = tous les mots du nom le plus court se
 * retrouvent dans l'autre (au moins 2 mots) ; `communs` = nombre de mots communs.
 */
export function comparerNoms(motsA, motsB) {
  const [court, long] = motsA.length <= motsB.length ? [motsA, motsB] : [motsB, motsA];
  const reste = [...long];
  let communs = 0;
  for (const w of court) {
    const k = reste.findIndex((x) => memeMot(w, x));
    if (k >= 0) { communs++; reste.splice(k, 1); }
  }
  return { communs, complet: communs >= 2 && communs === court.length, identique: communs === court.length && court.length === long.length && communs >= 2 };
}

/** Index des fiches DME (une fois par requête). */
export function indexerDme(fiches) {
  const parMat = new Map(), parCompte = new Map(), parMot = new Map();
  const push = (m, k, v) => { if (!k) return; if (!m.has(k)) m.set(k, []); m.get(k).push(v); };
  const items = fiches.map((f) => ({ f, mat: normMatricule(f.matricule_agent), compte: normCompteTiers(f.numero_compte_sage), mots: motsDuNom(f.nom, f.prenom), dob: f.date_naissance ? String(f.date_naissance).slice(0, 10) : null }));
  for (const it of items) {
    push(parMat, it.mat, it);
    push(parCompte, it.compte, it);
    for (const w of it.mots) push(parMot, w, it);
  }
  return { items, parMat, parCompte, parMot };
}

/**
 * Fiches DME d'un patient PHP.
 * patient : { matricule, nom, prenom, dateNaissance?, comptes?: [compte tiers confirmés] }
 * → { fiches: [{ ...fiche, raisons: [..] }], confiance: 'sure'|'probable'|'ambigu'|null, doublons, ecartMatricule }
 */
export function rechercherDansDme(patient, index) {
  const mat = normMatricule(patient.matricule);
  const mots = motsDuNom(patient.nom, patient.prenom);
  const dob = patient.dateNaissance ? String(patient.dateNaissance).slice(0, 10) : null;
  const comptes = new Set((patient.comptes || []).map(normCompteTiers).filter(Boolean));

  // Candidats : même matricule, même compte, ou au moins un mot du nom en commun
  const cands = new Map();
  const add = (it) => cands.set(it.f.id, it);
  if (mat) (index.parMat.get(mat) || []).forEach(add);
  for (const c of comptes) (index.parCompte.get(c) || []).forEach(add);
  for (const w of mots) (index.parMot.get(w) || []).forEach(add);

  const evals = [];
  for (const it of cands.values()) {
    const raisons = [];
    let fort = false;
    if (mat && it.mat === mat) { raisons.push('matricule'); fort = true; }
    if (it.compte && comptes.has(it.compte)) { raisons.push('compte Sage'); fort = true; }
    const nom = comparerNoms(mots, it.mots);
    if (nom.complet) raisons.push(nom.identique ? 'nom complet' : 'nom partiel');
    const voisin = mat && matriculeVoisin(mat, it.mat);
    if (voisin) raisons.push('matricule voisin');
    const naiss = comparerNaissances(dob, it.dob);
    const dobOk = naiss === 'ok';
    const dobKo = naiss === 'ko';
    if (dobOk) raisons.push('date de naissance');
    // Nom complet + matricule voisin (faute de frappe) = sûr
    if (!fort && nom.complet && voisin && !dobKo) fort = true;
    // Matricule différent mais renseigné des deux côtés : le nom seul ne suffit pas pour un autre agent
    const autreAgent = mat && it.mat && it.mat !== mat && !voisin;
    evals.push({ it, raisons, fort, nom, dobOk, dobKo, autreAgent });
  }

  const retenues = new Map();
  const garder = (e) => retenues.set(e.it.f.id, e);
  evals.filter((e) => e.fort && !(e.dobKo && !e.raisons.includes('matricule') && !e.raisons.includes('compte Sage'))).forEach(garder);
  let confiance = retenues.size ? 'sure' : null;

  if (!retenues.size) {
    // Nom seul. Possibles : nom complet, pas une autre date de naissance, pas un
    // autre agent (sauf nom identique : matricule mal saisi d'un côté).
    // Préférées : fiches PHP, nom identique ou même date de naissance.
    // Une seule → probable ; 2 ou 3 → on les montre ; davantage → nom trop courant.
    const possibles = evals.filter((e) => e.nom.complet && !e.dobKo && (!e.autreAgent || e.nom.identique));
    const preferees = possibles.filter((e) => PHP_TYPES.has(e.it.f.type_client) || e.nom.identique || e.dobOk);
    const choix = preferees.length === 1 ? preferees : possibles.length === 1 ? possibles : preferees.length ? preferees : possibles;
    if (choix.length === 1) { garder(choix[0]); confiance = 'probable'; }
    else if (choix.length > 1 && choix.length <= 3) { choix.forEach(garder); confiance = 'ambigu'; }
  }

  // Doublons : mêmes mots du nom + même date de naissance qu'une fiche retenue
  if (retenues.size && confiance !== 'ambigu') {
    const dobs = [...retenues.values()].map((e) => e.it.dob).filter(Boolean);
    for (const e of evals) {
      if (retenues.has(e.it.f.id) || !dobs.some((d) => comparerNaissances(d, e.it.dob) === 'ok')) continue;
      const proche = [...retenues.values()].some((r) => comparerNoms(r.it.mots, e.it.mots).complet);
      if (proche && !e.autreAgent) garder({ ...e, raisons: [...e.raisons, 'même personne (doublon)'] });
    }
  }

  const fiches = [...retenues.values()].map((e) => ({ ...e.it.f, raisons: e.raisons }));
  const matsDme = [...new Set(fiches.map((f) => normMatricule(f.matricule_agent)).filter(Boolean))];
  return {
    fiches,
    confiance,
    doublons: confiance !== 'ambigu' && fiches.length > 1,
    ecartMatricule: mat && matsDme.length && !matsDme.includes(mat) ? matsDme : null,
  };
}
