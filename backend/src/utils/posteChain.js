// backend/src/utils/posteChain.js
// Circuits de validation IMPOSÉS par le serveur pour certains types de documents :
// une suite de postes (DG, comptable…) résolus en personnes au moment de la
// soumission. Les validateurs éventuellement envoyés par la page sont ignorés,
// comme pour l'Ordre de mission (ordreMissionChain.js) et la Pièce de caisse
// (pieceDeCaisseChain.js), qui ont chacun leur logique propre.
//
// Pour verrouiller un nouveau type : ajouter une entrée dans FIXED_POSTE_CHAINS.

import { getPosteHoldersForAssignment } from './posteResolver.js';

export const FIXED_POSTE_CHAINS = {
  // Le DG écrit à l'employé : il est l'unique signataire du document.
  "Demande d'explication": [
    { key: 'dg', code: 'dg', label: 'Directeur Général' },
  ],
};

export const hasFixedPosteChain = (category) => Boolean(FIXED_POSTE_CHAINS[category]);

const fullName = (u) => `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;

/**
 * Étapes du circuit avec les titulaires possibles de chaque poste.
 * @param {string} category
 * @param {Object<string,string>} selections  { key: userId } pour les postes à titulaires multiples
 * @returns {Promise<{steps?: Array, error?: string}>}
 */
export async function resolveFixedPosteChain(category, selections = {}) {
  const definition = FIXED_POSTE_CHAINS[category];
  if (!definition) return { error: `Aucun circuit imposé pour « ${category} ».` };

  const steps = [];
  for (const { key, code, label } of definition) {
    const holders = await getPosteHoldersForAssignment(code);
    if (holders.length === 0) {
      return { error: `Aucun titulaire pour le poste « ${label} ». Assignez-en un dans Admin → Postes & Fonctions.` };
    }
    let chosenId = null;
    let needsSelection = false;
    if (holders.length === 1) {
      chosenId = holders[0].id;
    } else {
      const sel = selections[key];
      if (sel && holders.some(u => u.id === sel)) chosenId = sel;
      else needsSelection = true;
    }
    // posteCode = key : même format que les aperçus OM / Pièce de caisse côté frontend
    steps.push({ key, posteCode: key, label, holders: holders.map(u => ({ id: u.id, name: fullName(u) })), chosenId, needsSelection });
  }
  return { steps };
}

export async function buildFixedPosteChain(category, selections = {}) {
  const { steps, error } = await resolveFixedPosteChain(category, selections);
  if (error) return { error };

  const missing = steps.find(s => s.needsSelection);
  if (missing) return { error: `Veuillez choisir le titulaire pour « ${missing.label} ».` };

  const seen = new Set();
  const validatorIds = steps.map(s => s.chosenId).filter(id => id && !seen.has(id) && seen.add(id));
  if (validatorIds.length === 0) {
    return { error: 'Impossible de construire le circuit de validation (aucun validateur résolu).' };
  }
  return { validatorIds };
}
