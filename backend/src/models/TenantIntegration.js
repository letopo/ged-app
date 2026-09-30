// backend/src/models/TenantIntegration.js — intégration d'un tenant (IA, Sage…)
// (migration 20261001140000-create-tenant-integrations ; lecture via
// utils/integrations.js, écran : controllers/integrationController.js).
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export const INTEGRATION_KINDS = ['ai', 'sage'];

const TenantIntegration = sequelize.define('TenantIntegration', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId:        { type: DataTypes.UUID, allowNull: false },
  kind:            { type: DataTypes.STRING(20), allowNull: false, validate: { isIn: [INTEGRATION_KINDS] } },
  enabled:         { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  config:          { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  secretEncrypted: { type: DataTypes.TEXT, allowNull: true },
  adminCanManage:  { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  lastTestAt:      { type: DataTypes.DATE, allowNull: true },
  lastTestOk:      { type: DataTypes.BOOLEAN, allowNull: true },
  lastTestError:   { type: DataTypes.TEXT, allowNull: true },
  lastRunAt:       { type: DataTypes.DATE, allowNull: true },
  lastRunOk:       { type: DataTypes.BOOLEAN, allowNull: true },
  lastRunMessage:  { type: DataTypes.TEXT, allowNull: true },
  updatedBy:       { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'tenant_integrations',
  timestamps: true,
  underscored: true,
});

export default TenantIntegration;
