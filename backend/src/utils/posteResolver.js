// backend/src/utils/posteResolver.js
// Résolution dynamique « qui occupe tel poste » — remplace les emails figés.

import { Poste, User } from '../models/index.js';

/**
 * Retourne tous les utilisateurs (actifs) titulaires d'un poste donné.
 * @param {string} code  code du poste (ex: 'comptable', 'dg', 'rh')
 * @returns {Promise<User[]>}
 */
export const getPosteHolders = async (code) => {
  const poste = await Poste.findOne({
    where: { code },
    include: [{
      model: User,
      as: 'holders',
      attributes: ['id', 'firstName', 'lastName', 'email', 'isActive', 'isAbsent', 'substituteId'],
      through: { attributes: ['assignedAt'] },
    }],
  });
  if (!poste || !poste.holders) return [];
  return poste.holders
    .filter(u => u.isActive !== false)
    // Ordre déterministe : le plus ancien titulaire en premier (= titulaire principal)
    .sort((a, b) => new Date(a.UserPoste?.assignedAt || 0) - new Date(b.UserPoste?.assignedAt || 0));
};

/**
 * Comme getPosteHolders, mais pour la CONSTRUCTION d'un nouveau circuit de
 * signature (OM, Pièce de caisse) : un titulaire absent est remplacé par son
 * remplaçant fixe (en suivant la chaîne sur quelques niveaux si celui-ci est
 * lui aussi absent), pour qu'un nouveau document ne propose jamais quelqu'un
 * d'absent comme signataire à choisir.
 * Volontairement séparée de getPosteHolders : cette dernière sert aussi aux
 * vérifications de droits (userHasPoste, accès RH/Compta...), où l'absence ne
 * doit PAS faire perdre les droits associés au poste.
 * @param {string} code
 * @returns {Promise<User[]>}
 */
export const getPosteHoldersForAssignment = async (code) => {
  const holders = await getPosteHolders(code);
  const resolved = [];
  const seen = new Set();
  for (const holder of holders) {
    let current = holder;
    let hops = 0;
    while (current?.isAbsent && current.substituteId && hops < 5) {
      const next = await User.findByPk(current.substituteId, {
        attributes: ['id', 'firstName', 'lastName', 'email', 'isActive', 'isAbsent', 'substituteId'],
      });
      if (!next || next.isActive === false) break;
      current = next;
      hops += 1;
    }
    if (current && !seen.has(current.id)) {
      seen.add(current.id);
      resolved.push(current);
    }
  }
  return resolved;
};

/**
 * Retourne le premier titulaire d'un poste, ou null si aucun.
 * @param {string} code
 * @returns {Promise<User|null>}
 */
export const getPosteHolder = async (code) => {
  const holders = await getPosteHolders(code);
  return holders[0] || null;
};

/**
 * Vérifie si un utilisateur occupe un poste donné.
 * @param {string} userId
 * @param {string} code
 * @returns {Promise<boolean>}
 */
export const userHasPoste = async (userId, code) => {
  const holders = await getPosteHolders(code);
  return holders.some(u => u.id === userId);
};

/**
 * Retourne les codes des postes occupés par un utilisateur (ex: ['comptable']).
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
export const getUserPosteCodes = async (userId) => {
  const user = await User.findByPk(userId, {
    include: [{ model: Poste, as: 'postes', attributes: ['code'], through: { attributes: [] } }],
  });
  return (user?.postes || []).map(p => p.code);
};
