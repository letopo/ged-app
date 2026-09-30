// backend/src/utils/categoryAccess.js
// Confidentialité par type de document (Paramètres › Confidentialité).
//
// Une catégorie « restreinte » n'est visible que par :
//   - les administrateurs (admin, superadmin) ;
//   - les titulaires d'un des postes autorisés (ex. rh, comptable) ;
//   - si la règle le prévoit (includeParticipants), l'auteur du document, ses
//     validateurs et les personnes à qui il a été transmis.
// C'est un plafond appliqué EN PLUS des autres droits (service, validation…) :
// il retire l'accès, il n'en donne jamais.
import { Op } from 'sequelize';
import { tenantNamespace } from '../config/database.js';
import { CategoryAccessRule, Workflow, DocumentTransmission } from '../models/index.js';
import { getUserPosteCodes } from './posteResolver.js';

const TTL_MS = 60_000;
const cache = new Map(); // tenantId -> { rules, at }

export async function getCategoryRules(tenantId = tenantNamespace.get('tenantId')) {
  if (!tenantId) return [];
  const hit = cache.get(tenantId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.rules;
  const rows = await CategoryAccessRule.findAll({ where: { tenantId }, order: [['category', 'ASC']] });
  const rules = rows.map(r => ({
    id: r.id, category: r.category, allowedPostes: r.allowedPostes || [], includeParticipants: r.includeParticipants,
  }));
  cache.set(tenantId, { rules, at: Date.now() });
  return rules;
}

export const invalidateCategoryRules = (tenantId) => cache.delete(tenantId);

const isAdmin = (user) => ['admin', 'superadmin'].includes(user?.role);

// Catégories que cet utilisateur ne peut pas voir d'office :
//  strict       → jamais (même auteur ou validateur) ;
//  participants → seulement s'il est auteur, validateur ou destinataire.
export async function getBlockedCategories(user) {
  const blocked = { strict: [], participants: [] };
  if (isAdmin(user)) return blocked;
  const rules = await getCategoryRules(user.tenantId);
  if (!rules.length) return blocked;
  const myPostes = new Set(await getUserPosteCodes(user.id));
  for (const rule of rules) {
    if (rule.allowedPostes.some(code => myPostes.has(code))) continue;
    (rule.includeParticipants ? blocked.participants : blocked.strict).push(rule.category);
  }
  return blocked;
}

async function participantDocumentIds(userId) {
  const [validated, received] = await Promise.all([
    Workflow.findAll({ where: { validatorId: userId }, attributes: ['documentId'] }),
    DocumentTransmission.findAll({ where: { toUserId: userId }, attributes: ['documentId'] }),
  ]);
  return [...new Set([...validated, ...received].map(r => r.documentId))];
}

// Condition Sequelize à ajouter (Op.and) aux listes de documents, ou null.
export async function buildCategoryRestrictionWhere(user) {
  const { strict, participants } = await getBlockedCategories(user);
  const blocked = [...strict, ...participants];
  if (!blocked.length) return null;
  const allowed = [
    { category: null },                          // documents sans catégorie : non concernés
    { category: { [Op.notIn]: blocked } },
  ];
  if (participants.length) {
    const ids = await participantDocumentIds(user.id);
    const mine = [{ userId: user.id }];
    if (ids.length) mine.push({ id: { [Op.in]: ids } });
    allowed.push({ [Op.and]: [{ category: { [Op.in]: participants } }, { [Op.or]: mine }] });
  }
  return { [Op.or]: allowed };
}

// Pour UN document déjà chargé
export async function canReadDocumentCategory(document, user) {
  if (!document.category) return true;
  const { strict, participants } = await getBlockedCategories(user);
  if (strict.includes(document.category)) return false;
  if (!participants.includes(document.category)) return true;
  if (document.userId === user.id) return true;
  const [asValidator, asRecipient] = await Promise.all([
    Workflow.findOne({ where: { documentId: document.id, validatorId: user.id }, attributes: ['id'] }),
    DocumentTransmission.findOne({ where: { documentId: document.id, toUserId: user.id }, attributes: ['id'] }),
  ]);
  return Boolean(asValidator || asRecipient);
}
