// backend/src/utils/ordreMissionChain.js
// Construit le circuit de validation d'un ordre de mission à partir de son type
// et des POSTES (plus aucun email figé) :
//   chef du service demandeur → chaîne du type → (comptable si frais de mission)
//
// Quand un poste a plusieurs titulaires (ex: plusieurs chefs de pôle), le
// soumetteur choisit le titulaire à la soumission (selections[posteCode]).

import { Service, ServiceMember, OrdreMissionType, Poste, User } from '../models/index.js';
import { getPosteHolders } from './posteResolver.js';

const fullName = (u) => `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;

/**
 * Résout les étapes du circuit avec, pour chaque étape, les titulaires possibles
 * et le titulaire retenu (auto si 1 seul, sinon selections[posteCode]).
 * @param {Document} document
 * @param {Object<string,string>} selections  { posteCode: userId }
 * @returns {Promise<{steps?: Array, error?: string}>}
 *   step = { key, posteCode?, label, holders:[{id,name}], chosenId, needsSelection }
 */
export async function resolveOrdreMissionChain(document, selections = {}) {
  const meta = document.metadata || {};
  const steps = [];

  // 1) Chef du service demandeur
  if (meta.service_demandeur) {
    const service = await Service.findOne({ where: { name: meta.service_demandeur } });
    if (service) {
      const chefMember = await ServiceMember.findOne({
        where: { serviceId: service.id, fonction: 'Chef de Service', isActive: true },
        include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      });
      if (chefMember?.user) {
        steps.push({
          key: 'chef',
          label: `Chef du service demandeur (${meta.service_demandeur})`,
          holders: [{ id: chefMember.user.id, name: fullName(chefMember.user) }],
          chosenId: chefMember.user.id,
          needsSelection: false,
        });
      } else {
        console.warn(`[OM] Pas de chef pour le service "${meta.service_demandeur}" — étape ignorée`);
      }
    } else {
      console.warn(`[OM] Service demandeur "${meta.service_demandeur}" introuvable — étape ignorée`);
    }
  }

  // 2) Chaîne du type
  const typeCode = meta.type_mission;
  if (!typeCode) return { error: "Type d'ordre de mission manquant. Choisissez le type avant de soumettre." };
  const type = await OrdreMissionType.findOne({ where: { code: typeCode, isActive: true } });
  if (!type) return { error: `Type d'ordre de mission inconnu : ${typeCode}.` };

  // Labels lisibles des postes du circuit (+ comptable éventuel)
  const chainCodes = [...(type.posteChain || [])];
  if (meta.frais_mission === true) chainCodes.push('comptable');
  const posteRecords = await Poste.findAll({ where: { code: chainCodes } });
  const labelByCode = Object.fromEntries(posteRecords.map(p => [p.code, p.label]));

  const addPosteStep = async (code) => {
    const holders = await getPosteHolders(code);
    if (holders.length === 0) {
      return `Aucun titulaire pour le poste « ${labelByCode[code] || code} ». Assignez-en un dans Admin → Postes & Fonctions.`;
    }
    const options = holders.map(u => ({ id: u.id, name: fullName(u) }));
    let chosenId = null;
    let needsSelection = false;
    if (holders.length === 1) {
      chosenId = holders[0].id;
    } else {
      const sel = selections[code];
      if (sel && holders.some(u => u.id === sel)) chosenId = sel;
      else needsSelection = true;
    }
    steps.push({ key: code, posteCode: code, label: labelByCode[code] || code, holders: options, chosenId, needsSelection });
    return null;
  };

  for (const code of (type.posteChain || [])) {
    const err = await addPosteStep(code);
    if (err) return { error: err };
  }

  // 3) Comptable en fin de chaîne si la mission ouvre droit aux frais
  if (meta.frais_mission === true) {
    const err = await addPosteStep('comptable');
    if (err) return { error: err };
  }

  if (steps.length === 0) {
    return { error: 'Impossible de construire le circuit de validation (aucun validateur résolu).' };
  }
  return { steps };
}

/**
 * Aplati la chaîne résolue en liste ordonnée de validatorIds (pour créer le workflow).
 * Renvoie une erreur si un poste multi-titulaires n'a pas été choisi.
 */
export async function buildOrdreMissionChain(document, selections = {}) {
  const { steps, error } = await resolveOrdreMissionChain(document, selections);
  if (error) return { error };

  const missing = steps.find(s => s.needsSelection);
  if (missing) {
    return { error: `Veuillez choisir le titulaire pour le poste « ${missing.label} ».` };
  }

  const seen = new Set();
  const validatorIds = steps
    .map(s => s.chosenId)
    .filter(id => id && !seen.has(id) && seen.add(id));

  if (validatorIds.length === 0) {
    return { error: 'Impossible de construire le circuit de validation (aucun validateur résolu).' };
  }
  const comptableAdded = (document.metadata || {}).frais_mission === true;
  return { validatorIds, comptableAdded };
}
