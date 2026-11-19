// backend/src/utils/planningMedecins.js
// Planning des médecins (« ASTREINTES ET CONSULTATIONS DES MEDECINS », modèle
// papier de mars 2026), gardé dans schedules.content.tableau :
//   - une ligne par astreinte ou service, avec son superviseur du lundi au vendredi ;
//   - des cases qui couvrent une période du mois (par défaut chaque semaine du
//     lundi au vendredi et chaque week-end), avec les noms des médecins
//     (« Dr A/Dr B » : un nom par ligne sur le PDF) ; une case peut être grisée ;
//   - des notes en bas (congés, N.B.).
import { Op } from 'sequelize';
import { Schedule } from '../models/index.js';

const MAX_LIGNES = 30;
const texte = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

const nbJours = (annee, mois) => new Date(Date.UTC(annee, mois, 0)).getUTCDate();
const jourSemaine = (annee, mois, jour) => new Date(Date.UTC(annee, mois - 1, jour)).getUTCDay();
const estWeekEnd = (annee, mois, jour) => [0, 6].includes(jourSemaine(annee, mois, jour));

/** Périodes du mois : chaque suite de jours de semaine, chaque samedi-dimanche. */
export function periodesDuMois(annee, mois) {
  const out = [];
  for (let j = 1; j <= nbJours(annee, mois); j++) {
    const we = estWeekEnd(annee, mois, j);
    const der = out[out.length - 1];
    // Le samedi ouvre un nouveau week-end, le lundi une nouvelle semaine
    const coupe = !der || der.weekEnd !== we || (we && jourSemaine(annee, mois, j) === 6);
    if (coupe) out.push({ debut: j, fin: j, weekEnd: we }); else der.fin = j;
  }
  return out;
}

const casesParDefaut = (annee, mois, griserWeekEnds) => periodesDuMois(annee, mois)
  .map((p) => ({ debut: p.debut, fin: p.fin, texte: '', grise: griserWeekEnds && p.weekEnd }));

export function tableauParDefaut(annee, mois) {
  const astreintes = [
    'Astreinte Pôle médical et pédiatrique "Premier plan"',
    'Astreinte Pôle chirurgical "Deuxième plan"',
    'Superviseurs weekend',
  ].map((nom) => ({ nom, superviseur: '', superviseurGrise: true, cases: casesParDefaut(annee, mois, false) }));
  const services = ['SAU*', 'PEDIATRIE*', 'MEDECINE*', 'GYNECO*', 'CONSULTATION EXT*', 'CHIRURGIE*']
    .map((nom) => ({ nom, superviseur: '', superviseurGrise: false, cases: casesParDefaut(annee, mois, true) }));
  return {
    version: 1,
    mois: `${annee}-${String(mois).padStart(2, '0')}`,
    lignes: [...astreintes, ...services],
    notes: ['N.B. : Tous médecins sur site en cas de catastrophe (plan Rouge ou C)', 'Directeur Médical : Supervision générale'],
  };
}

// Cases d'une ligne : contiguës de 1 à la fin du mois, sinon découpage par défaut
function normaliserCases(cases, annee, mois) {
  const n = nbJours(annee, mois);
  const triees = (Array.isArray(cases) ? cases : [])
    .map((c) => ({ debut: Math.floor(Number(c?.debut)), fin: Math.floor(Number(c?.fin)), texte: texte(c?.texte, 200), grise: !!c?.grise }))
    .filter((c) => c.debut >= 1 && c.fin >= c.debut && c.fin <= n)
    .sort((a, b) => a.debut - b.debut);
  let attendu = 1;
  for (const c of triees) {
    if (c.debut !== attendu) return casesParDefaut(annee, mois, false);
    attendu = c.fin + 1;
  }
  return attendu === n + 1 ? triees : casesParDefaut(annee, mois, false);
}

/** Tableau reçu du navigateur → tableau propre pour ce mois (null si illisible). */
export function normaliserTableau(tableau, annee, mois) {
  if (!tableau || typeof tableau !== 'object' || !Array.isArray(tableau.lignes)) return null;
  return {
    version: 1,
    mois: `${annee}-${String(mois).padStart(2, '0')}`,
    lignes: tableau.lignes.slice(0, MAX_LIGNES).map((l) => ({
      nom: texte(l?.nom, 80),
      superviseur: texte(l?.superviseur, 80),
      superviseurGrise: !!l?.superviseurGrise,
      cases: normaliserCases(l?.cases, annee, mois),
    })).filter((l) => l.nom),
    notes: (Array.isArray(tableau.notes) ? tableau.notes : []).map((x) => texte(x, 200)).filter(Boolean).slice(0, 10),
  };
}

export const casesRempliesMedecins = (tableau) => (tableau?.lignes || [])
  .reduce((n, l) => n + l.cases.filter((c) => c.texte).length, 0);

/**
 * Nouveau mois : repris du mois précédent. Lignes, superviseurs et notes à
 * l'identique ; pour les cases, la k-ième semaine (ou le k-ième week-end)
 * reprend les noms de la k-ième du mois précédent (la dernière s'il en manque).
 */
export function reprendreTableau(precedent, annee, mois) {
  const [pa, pm] = String(precedent?.mois || '').split('-').map(Number);
  if (!pa || !Array.isArray(precedent?.lignes)) return null;
  const lignes = precedent.lignes.map((l) => {
    const anciennes = { semaine: [], weekEnd: [] };
    for (const c of l.cases || []) anciennes[estWeekEnd(pa, pm, c.debut) ? 'weekEnd' : 'semaine'].push(c);
    const rang = { semaine: 0, weekEnd: 0 };
    const cases = periodesDuMois(annee, mois).map((p) => {
      const sorte = p.weekEnd ? 'weekEnd' : 'semaine';
      const liste = anciennes[sorte];
      const src = liste[Math.min(rang[sorte]++, liste.length - 1)];
      return { debut: p.debut, fin: p.fin, texte: src?.texte || '', grise: !!src?.grise };
    });
    return { nom: l.nom, superviseur: l.superviseur || '', superviseurGrise: !!l.superviseurGrise, cases };
  });
  return normaliserTableau({ lignes, notes: precedent.notes }, annee, mois);
}

export async function tableauACopier({ annee, mois, transaction } = {}) {
  const avant = annee * 100 + mois;
  const candidats = await Schedule.findAll({
    where: { scheduleType: 'medical_duties', isActive: true, content: { [Op.ne]: null } },
    order: [['year', 'DESC'], ['month', 'DESC'], ['createdAt', 'DESC']],
    transaction,
  });
  const avecTableau = candidats.filter((s) => s.content?.tableau?.lignes?.length);
  const precedent = avecTableau.find((s) => s.year * 100 + s.month < avant) || avecTableau[0];
  return (precedent && reprendreTableau(precedent.content.tableau, annee, mois)) || tableauParDefaut(annee, mois);
}
