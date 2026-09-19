// backend/src/utils/pieceDeCaisseChain.js
// Construit le circuit de validation d'une Pièce de caisse :
//   Directeur Général → Comptable → Bénéficiaire (si compte de connexion) → Caissière
// Calqué sur ordreMissionChain.js. Le bénéficiaire n'est pas un poste : c'est une
// personne précise choisie à la création de la PC (metadata.beneficiaire_id/_source).
// Si elle n'a pas de compte User (fiche Employee sans compte lié), son étape est
// simplement absente de la chaîne — pas une erreur.

import { getPosteHoldersForAssignment } from './posteResolver.js';
import { User, Employee } from '../models/index.js';

const fullName = (u) => `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;

async function resolveBeneficiaireUserId(document) {
  const meta = document.metadata || {};
  if (!meta.beneficiaire_id) return null;
  if (meta.beneficiaire_source === 'user') return meta.beneficiaire_id;
  if (meta.beneficiaire_source === 'employee') {
    const employee = await Employee.findByPk(meta.beneficiaire_id, { attributes: ['userId'] });
    return employee?.userId || null;
  }
  return null;
}

/**
 * @param {Document} document
 * @param {Object<string,string>} selections  { key: userId } pour les étapes à titulaires multiples
 * @returns {Promise<{steps?: Array, error?: string}>}
 */
export async function resolvePieceDeCaisseChain(document, selections = {}) {
  const steps = [];

  const addPosteStep = async (key, code, label) => {
    const holders = await getPosteHoldersForAssignment(code);
    if (holders.length === 0) {
      return `Aucun titulaire pour le poste « ${label} ». Assignez-en un dans Admin → Postes & Fonctions.`;
    }
    const options = holders.map(u => ({ id: u.id, name: fullName(u) }));
    let chosenId = null;
    let needsSelection = false;
    if (holders.length === 1) {
      chosenId = holders[0].id;
    } else {
      const sel = selections[key];
      if (sel && holders.some(u => u.id === sel)) chosenId = sel;
      else needsSelection = true;
    }
    // posteCode dupliqué depuis key : permet au frontend de réutiliser tel quel
    // le composant de sélection déjà construit pour l'Ordre de mission.
    steps.push({ key, posteCode: key, label, holders: options, chosenId, needsSelection });
    return null;
  };

  const dgErr = await addPosteStep('dg', 'dg', 'Directeur Général');
  if (dgErr) return { error: dgErr };

  const comptableErr = await addPosteStep('comptable', 'comptable', 'Comptable');
  if (comptableErr) return { error: comptableErr };

  const beneficiaireUserId = await resolveBeneficiaireUserId(document);
  if (beneficiaireUserId) {
    const beneficiaire = await User.findByPk(beneficiaireUserId, { attributes: ['id', 'firstName', 'lastName', 'email'] });
    if (beneficiaire) {
      steps.push({
        key: 'beneficiaire', posteCode: 'beneficiaire', label: 'Bénéficiaire',
        holders: [{ id: beneficiaire.id, name: fullName(beneficiaire) }],
        chosenId: beneficiaire.id, needsSelection: false,
      });
    }
  }
  // Sinon : pas de compte de connexion pour ce bénéficiaire → étape sautée, comportement voulu.

  // Les caissières absentes ne sont pas proposées pour un NOUVEAU circuit (pas de
  // notion de "poste" ici pour appliquer la substitution automatique comme pour dg/comptable).
  const caissiers = await User.findAll({ where: { role: 'caissier', isActive: true, isAbsent: false }, attributes: ['id', 'firstName', 'lastName', 'email'] });
  if (caissiers.length === 0) {
    return { error: 'Aucune caissière active. Assignez le rôle "caissier" à un compte utilisateur.' };
  }
  const caissierOptions = caissiers.map(u => ({ id: u.id, name: fullName(u) }));
  let caissierChosenId = null;
  let caissierNeedsSelection = false;
  if (caissiers.length === 1) {
    caissierChosenId = caissiers[0].id;
  } else {
    const sel = selections.caissier;
    if (sel && caissiers.some(u => u.id === sel)) caissierChosenId = sel;
    else caissierNeedsSelection = true;
  }
  steps.push({ key: 'caissier', posteCode: 'caissier', label: 'Caissière', holders: caissierOptions, chosenId: caissierChosenId, needsSelection: caissierNeedsSelection });

  if (steps.length === 0) {
    return { error: 'Impossible de construire le circuit de validation (aucun validateur résolu).' };
  }
  return { steps };
}

export async function buildPieceDeCaisseChain(document, selections = {}) {
  const { steps, error } = await resolvePieceDeCaisseChain(document, selections);
  if (error) return { error };

  const missing = steps.find(s => s.needsSelection);
  if (missing) {
    return { error: `Veuillez choisir le titulaire pour « ${missing.label} ».` };
  }

  const seen = new Set();
  const validatorIds = steps
    .map(s => s.chosenId)
    .filter(id => id && !seen.has(id) && seen.add(id));

  if (validatorIds.length === 0) {
    return { error: 'Impossible de construire le circuit de validation (aucun validateur résolu).' };
  }
  return { validatorIds };
}
