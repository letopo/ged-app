// backend/src/utils/documentVisibility.js
// Logique centralisée : qui peut voir quel document (évite la duplication qui existait
// auparavant dans getDocuments / getDocument / searchDocuments / getArchivedDocuments).

import { Op } from 'sequelize';
import { getPosteHolders, userHasPoste } from './posteResolver.js';
import { ServiceMember, Workflow } from '../models/index.js';

// Documents générés par le RH : visibles uniquement par l'admin
export const canViewHRDocuments = (user) => ['admin', 'superadmin'].includes(user.role);

// Catégories réservées RH : visibles uniquement par les titulaires du poste RH + admins
export const HR_ONLY_CATEGORIES = ['Attestation de départ en congé annuel'];
export const canViewHRCategory = async (user) =>
  ['admin', 'superadmin'].includes(user.role) || await userHasPoste(user.id, 'rh');

// Retourne les userId des titulaires du poste RH (documents restreints)
export const getHRUserIds = async () => (await getPosteHolders('rh')).map(u => u.id);

// Catégories réservées comptabilité : visibles uniquement par admin et titulaire du poste comptable
export const COMPTA_ONLY_CATEGORIES = ['Pièce comptable'];
export const canViewComptaCategory = async (user) =>
  ['admin', 'superadmin'].includes(user.role) || await userHasPoste(user.id, 'comptable');

export const isAdminOrDirector = (user) =>
  ['admin', 'superadmin'].includes(user.role) || user.role === 'director';

// Catégories bloquées pour cet utilisateur (RH et/ou Compta), toujours appliquées
// en plus de tout autre droit d'accès — c'est un plafond, pas une alternative.
export async function getRestrictedCategories(user) {
  const restricted = [];
  if (!(await canViewHRCategory(user))) restricted.push(...HR_ONLY_CATEGORIES);
  if (!(await canViewComptaCategory(user))) restricted.push(...COMPTA_ONLY_CATEGORIES);
  return restricted;
}

// Fragment Sequelize (à combiner via Op.and avec le reste du where, jamais un 2e Op.or
// directement sur le même objet) qui filtre les documents qu'un utilisateur peut lister.
// Retourne `null` si aucune restriction n'est nécessaire (admin/superadmin sans exclusion HR).
export async function buildDocumentAccessWhere(user) {
  if (isAdminOrDirector(user)) {
    if (canViewHRDocuments(user)) return null;
    const hrUserIds = await getHRUserIds();
    if (!hrUserIds.length) return null;
    return { userId: { [Op.notIn]: hrUserIds } };
  }

  const memberships = await ServiceMember.findAll({
    where: { userId: user.id, isActive: true },
    attributes: ['serviceId'],
  });
  const myServiceIds = memberships.map(m => m.serviceId);

  const validatorRows = await Workflow.findAll({
    where: { validatorId: user.id },
    attributes: ['documentId'],
  });
  const myValidatorDocIds = validatorRows.map(w => w.documentId);

  const orConditions = [{ userId: user.id }];
  if (myServiceIds.length) {
    orConditions.push({ visibility: 'service', serviceId: { [Op.in]: myServiceIds } });
  }
  if (myValidatorDocIds.length) {
    orConditions.push({ id: { [Op.in]: myValidatorDocIds } });
  }
  return { [Op.or]: orConditions };
}

// Vérifie l'accès à UN document déjà chargé (getDocument, downloadDocument, ...).
export async function hasDocumentReadAccess(document, user) {
  if (isAdminOrDirector(user)) {
    const hrUserIds = await getHRUserIds();
    if (hrUserIds.includes(document.userId) && !canViewHRDocuments(user) && document.userId !== user.id) {
      return false;
    }
  } else {
    let hasAccess = document.userId === user.id;
    if (!hasAccess && document.visibility === 'service' && document.serviceId) {
      const membership = await ServiceMember.findOne({
        where: { userId: user.id, serviceId: document.serviceId, isActive: true },
      });
      hasAccess = !!membership;
    }
    if (!hasAccess) {
      const validatorRow = await Workflow.findOne({
        where: { documentId: document.id, validatorId: user.id },
      });
      hasAccess = !!validatorRow;
    }
    if (!hasAccess) return false;
  }

  const restrictedCats = await getRestrictedCategories(user);
  return !restrictedCats.includes(document.category);
}

// Résout à quel service rattacher un nouveau document "service" au moment de l'upload :
// priorité au service où l'utilisateur est Chef de Service, sinon son service actif le plus ancien.
// Retourne `null` si l'utilisateur n'a aucun ServiceMember actif.
export async function resolveUploaderServiceId(userId) {
  const memberships = await ServiceMember.findAll({
    where: { userId, isActive: true },
    order: [['createdAt', 'ASC']],
  });
  if (!memberships.length) return null;
  const asChef = memberships.find(m => m.fonction === 'Chef de Service');
  return (asChef || memberships[0]).serviceId;
}
