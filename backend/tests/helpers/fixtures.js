// Données de test : chaque fichier de test crée son propre établissement
// (tenant), isolé des autres par son domaine. Les appels directs aux fonctions
// passent par inTenant() (contexte CLS, comme une vraie requête).
import './env.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { tenantNamespace } from '../../src/config/database.js';
import {
  Tenant, User, Service, ServiceMember, Poste, UserPoste, Document, Workflow, DocumentTransmission, TenantSettings,
} from '../../src/models/index.js';

const uid = () => crypto.randomBytes(4).toString('hex');

/** Exécute fn dans le contexte du tenant (hooks tenantId, filtres). */
export function inTenant(tenantId, fn) {
  return tenantNamespace.runPromise(async () => {
    tenantNamespace.set('tenantId', tenantId);
    return fn();
  });
}

// domainSuffix : domaine accepté par CORS (ex. 'hsjmcam.net') pour les tests
// qui envoient un en-tête Origin, comme le navigateur (connexion par passkey)
export async function createTenant({ domainSuffix = 'test' } = {}) {
  const slug = `test-${uid()}`;
  return Tenant.create({ name: `Hôpital ${slug}`, slug, domain: `${slug}.${domainSuffix}` });
}

export function makeFactory(tenant) {
  const run = (fn) => inTenant(tenant.id, fn);
  return {
    tenant,
    run,
    user: (attrs = {}) => run(() => {
      const n = uid();
      return User.create({
        email: `u${n}@test.local`, username: `u${n}`, password: 'motdepasse-test', firstName: 'Test', lastName: n,
        role: 'user', isActive: true, ...attrs,
      });
    }),
    service: (name = `Service ${uid()}`) => run(() => Service.create({ name })),
    member: (user, service, attrs = {}) => run(() => ServiceMember.create({ userId: user.id, serviceId: service.id, fonction: 'Personnel paramédical', isActive: true, ...attrs })),
    poste: async (code, holders = []) => run(async () => {
      const poste = await Poste.findOne({ where: { code } }) || await Poste.create({ code, label: code });
      for (const u of holders) await UserPoste.create({ posteId: poste.id, userId: u.id, assignedAt: new Date() });
      return poste;
    }),
    // Les codes de poste sont uniques dans toute la base : un fichier de test qui
    // crée 'rh' ou 'dg' les retire à la fin pour que les suivants puissent les créer
    dropPostes: async () => {
      await Document.sequelize.query('DELETE FROM user_postes WHERE poste_id IN (SELECT id FROM postes WHERE tenant_id = :t)', { replacements: { t: tenant.id } });
      await Document.sequelize.query('DELETE FROM postes WHERE tenant_id = :t', { replacements: { t: tenant.id } });
    },
    document: (owner, attrs = {}) => run(() => Document.create({
      title: `Doc ${uid()}`, fileName: 'x.pdf', filePath: 'uploads/x.pdf', fileType: 'application/pdf',
      userId: owner.id, status: 'draft', visibility: 'personal', ...attrs,
    })),
    validator: (doc, user, attrs = {}) => run(() => Workflow.create({ documentId: doc.id, validatorId: user.id, step: 1, status: 'pending', ...attrs })),
    transmit: (doc, from, to) => run(() => DocumentTransmission.create({ documentId: doc.id, fromUserId: from.id, toUserId: to.id })),
    settings: (attrs) => run(async () => {
      const row = await TenantSettings.findOne({ where: { tenantId: tenant.id } });
      return row ? row.update(attrs) : TenantSettings.create({ tenantId: tenant.id, ...attrs });
    }),
  };
}

/** En-têtes d'une requête HTTP authentifiée sur le domaine du tenant. */
export const authHeaders = (tenant, user) => ({
  Host: tenant.domain,
  Authorization: `Bearer ${jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' })}`,
});
