import { Sequelize, Op } from 'sequelize';
import { createNamespace } from 'cls-hooked';
import dotenv from 'dotenv';

dotenv.config();

// Namespace CLS — propage le tenantId à travers tout le cycle de vie async d'une requête
export const tenantNamespace = createNamespace('ged-tenant-context');
Sequelize.useCLS(tenantNamespace);

const sequelize = new Sequelize({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ged_db',
  username: process.env.DB_USER || 'ged_user',
  password: process.env.DB_PASSWORD,
  dialect: 'postgres',
  logging: false,
  pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
  define: { timestamps: true, underscored: true }
});

// ── Hooks globaux : chaque requête reste dans l'établissement courant ────────
// Dans une requête HTTP (ou une tâche lancée avec tenantNamespace.runPromise),
// toute lecture, tout comptage et toute modification / suppression en masse
// d'un modèle qui a un tenantId est limité à cet établissement.
//  - Le modèle est `this` : Sequelize n'a pas encore renseigné options.model
//    au moment de beforeFind (l'ancienne version s'y fiait et ne filtrait donc
//    jamais rien).
//  - Un tenantId passé explicitement est respecté.
//  - Hors contexte (super-admin, socket, migrations), rien n'est ajouté.
export function scopeToTenant(model, options, { columnNames = false } = {}) {
  const tenantId = tenantNamespace.get('tenantId');
  const attr = model?.rawAttributes?.tenantId;
  if (!tenantId || !attr) return;
  // update / destroy en masse : Sequelize a déjà traduit les attributs en
  // noms de colonnes avant le hook → il faut « tenant_id »
  const key = columnNames ? (attr.field || 'tenantId') : 'tenantId';
  const where = options.where;
  if (where === undefined || where === null) {
    options.where = { [key]: tenantId };
  } else if (Object.getPrototypeOf(where) === Object.prototype) {
    if (where.tenantId === undefined && where[key] === undefined) where[key] = tenantId;
  } else {
    // sequelize.where(...), literal… : on combine sans y toucher
    options.where = { [Op.and]: [where, { [key]: tenantId }] };
  }
}
for (const hook of ['beforeFind', 'beforeCount']) {
  sequelize.addHook(hook, function tenantScope(options) { scopeToTenant(this, options); });
}
for (const hook of ['beforeBulkUpdate', 'beforeBulkDestroy']) {
  sequelize.addHook(hook, function tenantScope(options) { scopeToTenant(this, options, { columnNames: true }); });
}

// ── Hook global : injecte tenant_id à la création ────────────────────────────
// Doit tourner sur `beforeValidate` (pas `beforeCreate`) : Sequelize valide
// automatiquement les colonnes `allowNull: false` (dont tenant_id) juste après
// beforeValidate et avant beforeCreate. Sur beforeCreate, la validation
// notNull sur tenant_id échoue donc systématiquement pour tout Model.create()
// qui ne passe pas tenantId explicitement — ce hook n'avait alors jamais
// l'occasion de s'exécuter (bug constaté sur motifController.createMotif).
sequelize.addHook('beforeValidate', (instance) => {
  const tenantId = tenantNamespace.get('tenantId');
  if (!tenantId) return;
  if (!instance.constructor?.rawAttributes?.tenantId) return;
  if (!instance.tenantId) instance.tenantId = tenantId;
});

sequelize.addHook('beforeBulkCreate', (instances) => {
  const tenantId = tenantNamespace.get('tenantId');
  if (!tenantId) return;
  for (const inst of instances) {
    if (inst.constructor?.rawAttributes?.tenantId && !inst.tenantId) {
      inst.tenantId = tenantId;
    }
  }
});

export default sequelize;
