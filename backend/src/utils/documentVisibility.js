// backend/src/utils/documentVisibility.js
// Logique centralisée : qui peut voir quel document (évite la duplication qui existait
// auparavant dans getDocuments / getDocument / searchDocuments / getArchivedDocuments).

import { Op } from 'sequelize';
import { getPosteHolders } from './posteResolver.js';
import { ServiceMember, Workflow, DocumentTransmission } from '../models/index.js';
import { canReadDocumentCategory } from './categoryAccess.js';

// Documents générés par le RH : visibles uniquement par l'admin
export const canViewHRDocuments = (user) => ['admin', 'superadmin'].includes(user.role);

// Retourne les userId des titulaires du poste RH (documents générés par les RH,
// masqués aux directeurs — voir buildDocumentAccessWhere)
export const getHRUserIds = async () => (await getPosteHolders('rh')).map(u => u.id);

export const isAdminOrDirector = (user) =>
  ['admin', 'superadmin'].includes(user.role) || user.role === 'director';

// Confidentialité par catégorie (plafond appliqué en plus des autres droits) :
// règles réglées par tenant dans Paramètres › Confidentialité (utils/categoryAccess.js).
export { buildCategoryRestrictionWhere } from './categoryAccess.js';

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

  // Documents qu'on m'a transmis (cf. documentTransmissionController)
  const receivedRows = await DocumentTransmission.findAll({
    where: { toUserId: user.id },
    attributes: ['documentId'],
  });
  const myReceivedDocIds = receivedRows.map(r => r.documentId);

  const orConditions = [{ userId: user.id }];
  if (myServiceIds.length) {
    orConditions.push({ visibility: 'service', serviceId: { [Op.in]: myServiceIds } });
  }
  if (myValidatorDocIds.length) {
    orConditions.push({ id: { [Op.in]: myValidatorDocIds } });
  }
  if (myReceivedDocIds.length) {
    orConditions.push({ id: { [Op.in]: myReceivedDocIds } });
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
    if (!hasAccess) {
      const received = await DocumentTransmission.findOne({
        where: { documentId: document.id, toUserId: user.id },
      });
      hasAccess = !!received;
    }
    if (!hasAccess) return false;
  }

  return canReadDocumentCategory(document, user);
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
