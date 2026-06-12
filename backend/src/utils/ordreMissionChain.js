// backend/src/utils/ordreMissionChain.js
// Construit le circuit de validation d'un ordre de mission à partir de son type
// et des POSTES (plus aucun email figé) :
//   chef du service demandeur → chaîne du type → (comptable si frais de mission)

import { Service, ServiceMember, OrdreMissionType } from '../models/index.js';
import { getPosteHolder } from './posteResolver.js';

/**
 * @param {Document} document  document Ordre de mission (avec .metadata)
 * @returns {Promise<{validatorIds?: string[], comptableAdded?: boolean, error?: string}>}
 */
export async function buildOrdreMissionChain(document) {
  const meta = document.metadata || {};
  const chain = [];

  // 1) Chef du service demandeur (metadata.service_demandeur = nom du service)
  if (meta.service_demandeur) {
    const service = await Service.findOne({ where: { name: meta.service_demandeur } });
    if (service) {
      const chefMember = await ServiceMember.findOne({
        where: { serviceId: service.id, fonction: 'Chef de Service', isActive: true },
      });
      if (chefMember) chain.push(chefMember.userId);
      else console.warn(`[OM] Pas de chef pour le service "${meta.service_demandeur}" — étape ignorée`);
    } else {
      console.warn(`[OM] Service demandeur "${meta.service_demandeur}" introuvable — étape ignorée`);
    }
  }

  // 2) Chaîne du type d'ordre de mission
  const typeCode = meta.type_mission;
  if (!typeCode) {
    return { error: "Type d'ordre de mission manquant. Choisissez le type avant de soumettre." };
  }
  const type = await OrdreMissionType.findOne({ where: { code: typeCode, isActive: true } });
  if (!type) {
    return { error: `Type d'ordre de mission inconnu : ${typeCode}.` };
  }
  for (const posteCode of (type.posteChain || [])) {
    const holder = await getPosteHolder(posteCode);
    if (!holder) {
      return { error: `Aucun titulaire pour le poste « ${posteCode} ». Assignez-en un dans Admin → Postes & Fonctions.` };
    }
    chain.push(holder.id);
  }

  // 3) Comptable en fin de chaîne si la mission ouvre droit aux frais
  let comptableAdded = false;
  if (meta.frais_mission === true) {
    const comptable = await getPosteHolder('comptable');
    if (!comptable) {
      return { error: "La mission ouvre droit aux frais mais aucun comptable n'est assigné (Admin → Postes & Fonctions)." };
    }
    chain.push(comptable.id);
    comptableAdded = true;
  }

  // Dédupliquer en conservant l'ordre
  const seen = new Set();
  const validatorIds = chain.filter(id => id && !seen.has(id) && seen.add(id));

  if (validatorIds.length === 0) {
    return { error: 'Impossible de construire le circuit de validation (aucun validateur résolu).' };
  }
  return { validatorIds, comptableAdded };
}
