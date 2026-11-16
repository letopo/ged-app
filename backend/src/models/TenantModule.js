// backend/src/models/TenantModule.js — réglage d'un module pour un tenant
// (migration 20261116100000-tenant-modules ; catalogue : config/modules.js ;
// lecture : utils/tenantModules.js).
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const TenantModule = sequelize.define('TenantModule', {
  id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId:  { type: DataTypes.UUID, allowNull: false },
  moduleKey: { type: DataTypes.STRING(40), allowNull: false },
  enabled:   { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  // Accordé par le super-administrateur, même s'il n'est pas dans la licence
  granted:   { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  updatedBy: { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'tenant_modules',
  timestamps: true,
  underscored: true,
});

export default TenantModule;
