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
      attributes: ['id', 'firstName', 'lastName', 'email', 'isActive'],
      through: { attributes: [] },
    }],
  });
  if (!poste || !poste.holders) return [];
  return poste.holders.filter(u => u.isActive !== false);
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
