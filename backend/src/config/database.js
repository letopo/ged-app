import { Sequelize } from 'sequelize';
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

// ── Hook global : injecte tenant_id dans tous les SELECT ──────────────────────
sequelize.addHook('beforeFind', (options) => {
  const tenantId = tenantNamespace.get('tenantId');
  if (!tenantId) return;

  const model = options.model;
  // Ne filtre que si le modèle possède un attribut tenantId
  if (!model?.rawAttributes?.tenantId) return;

  options.where = options.where || {};
  // Ne pas écraser un tenantId explicitement passé (ex: super-admin)
  if (options.where.tenantId === undefined) {
    options.where.tenantId = tenantId;
  }
});

// ── Hook global : injecte tenant_id à la création ────────────────────────────
sequelize.addHook('beforeCreate', (instance) => {
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
