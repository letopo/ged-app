// backend/src/utils/programmeWeekend.js
// Programme du week-end (19/11/2026), sur le modèle papier de l'hôpital :
//   - en-tête « Direction » (numéros, superviseur management) et responsables
//     du week-end (superviseur, pôles, pharmacie, consultation externe) ;
//   - un tableau services × 5 créneaux : vendredi nuit, samedi jour, samedi nuit,
//     dimanche jour, dimanche nuit ; un service peut avoir plusieurs lignes ;
//   - une case peut s'étendre sur les suivantes (ex. Radiologie d'astreinte
//     tout le week-end).
// Les noms sont du texte libre (« SOPPI/MOUNCHILI »), comme sur le papier.
import { Op } from 'sequelize';
import { Schedule } from '../models/index.js';

export const CRENEAUX = 5;
const MAX_SERVICES = 40;
const MAX_LIGNES = 8;
const MAX_ENTETE = 12;

const texte = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

const ligneVide = () => Array.from({ length: CRENEAUX }, () => ({ texte: '', span: 1 }));
const ligne = (cases) => normaliserLigne(cases.map((c) => (typeof c === 'string' ? { texte: c, span: 1 } : c)));

// Structure du modèle papier, sans les noms ni les numéros de téléphone
export function programmeParDefaut() {
  const toutLeWeekEnd = () => ligne([{ texte: '', span: CRENEAUX }]);
  const services = [
    ['S.A.U.', 2], ['PHARMACIE', 1], ['LABORATOIRE', 1], ['MEDECINE', 2], ['PEDIATRIE', 2],
    ['MATERNITE', 2], ['CHIRURGIE', 1], ['BLOC OPERATOIRE', 1], ['ANESTHESIE', 1],
  ].map(([nom, n]) => ({ nom, astreinte: false, lignes: Array.from({ length: n }, ligneVide) }));
  services.push(
    { nom: 'AMBULANCE', astreinte: false, lignes: [ligne(Array(CRENEAUX).fill('RO-SAU'))] },
    { nom: 'CELLULE INFORMATIQUE', astreinte: false, lignes: [toutLeWeekEnd()] },
    { nom: 'ASH', astreinte: false, lignes: [ligneVide()] },
    { nom: 'Lingerie', astreinte: false, lignes: [ligneVide()] },
    { nom: 'ACCUEIL', astreinte: false, lignes: [ligneVide()] },
    { nom: 'RADIOLOGIE', astreinte: true, lignes: [toutLeWeekEnd()] },
  );
  return {
    version: 1,
    entete: {
      direction: ['DIRECTEUR G', 'DS', 'D. adjointe', 'D. medical', 'DDS'].map((label) => ({ label, valeur: '' })),
      superviseurManagement: '',
      responsables: ['SUPERVISEUR', 'Pole medico l/Gyneco', 'pole chirurgical', 'Pharmacie', 'Consultation ext']
        .map((label) => ({ label, valeur: '' })),
    },
    services,
  };
}

// 5 cases ; une case qui s'étend (span > 1) recouvre les suivantes (span 0).
export function normaliserLigne(cases) {
  const src = Array.isArray(cases) ? cases : [];
  const out = [];
  let i = 0;
  let k = 0;
  while (i < CRENEAUX) {
    const c = src[k] && typeof src[k] === 'object' ? src[k] : {};
    k += 1;
    if (Number(c.span) === 0) continue; // case recouverte venue du client : ignorée
    const span = Math.min(Math.max(1, Math.floor(Number(c.span) || 1)), CRENEAUX - i);
    out.push({ texte: texte(c.texte, 120), span });
    for (let j = 1; j < span; j++) out.push({ texte: '', span: 0 });
    i += span;
  }
  return out;
}

const listeEntete = (liste) => (Array.isArray(liste) ? liste : []).slice(0, MAX_ENTETE)
  .map((e) => ({ label: texte(e?.label, 60), valeur: texte(e?.valeur, 120) }))
  .filter((e) => e.label || e.valeur);

/** Contenu reçu du navigateur → contenu propre (null si illisible). */
export function normaliserProgramme(content) {
  if (!content || typeof content !== 'object' || !Array.isArray(content.services)) return null;
  const entete = content.entete && typeof content.entete === 'object' ? content.entete : {};
  return {
    version: 1,
    entete: {
      direction: listeEntete(entete.direction),
      superviseurManagement: texte(entete.superviseurManagement, 120),
      responsables: listeEntete(entete.responsables),
    },
    services: content.services.slice(0, MAX_SERVICES).map((s) => {
      const lignes = (Array.isArray(s?.lignes) ? s.lignes : []).slice(0, MAX_LIGNES).map(normaliserLigne);
      return { nom: texte(s?.nom, 60), astreinte: !!s?.astreinte, lignes: lignes.length ? lignes : [ligneVide()] };
    }).filter((s) => s.nom),
  };
}

/** Nombre de cases remplies (un programme vide ne part pas en validation). */
export const casesRemplies = (content) => (content?.services || [])
  .reduce((n, s) => n + s.lignes.reduce((m, l) => m + l.filter((c) => c.span > 0 && c.texte).length, 0), 0);

/**
 * Nouveau programme : copie du dernier programme du week-end (en-tête, services
 * et noms, à corriger), sinon la structure du modèle papier.
 */
export async function programmeACopier({ avant, transaction } = {}) {
  const chercher = (where) => Schedule.findOne({
    where: { scheduleType: 'weekend', isActive: true, content: { [Op.ne]: null }, ...where },
    order: [['startDate', 'DESC'], ['createdAt', 'DESC']],
    transaction,
  });
  // Le week-end juste avant celui qu'on crée ; à défaut, le plus récent
  const precedent = (avant && await chercher({ startDate: { [Op.lt]: avant } })) || await chercher({});
  const copie = precedent ? normaliserProgramme(precedent.content) : null;
  return copie?.services.length ? { content: copie, copieDe: precedent.id } : { content: programmeParDefaut(), copieDe: null };
}
