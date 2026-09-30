// backend/src/models/TenantSettings.js — réglages généraux d'un tenant
// (migration 20261001120000-create-tenant-settings ; lecture via
// utils/tenantSettings.js, qui applique les valeurs par défaut).
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const TenantSettings = sequelize.define('TenantSettings', {
  id:                   { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId:             { type: DataTypes.UUID, allowNull: false, unique: true },
  workflowDeadlineDays: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 7 },
  lateDays:             { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2 },
  sessionIdleMinutes:   { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
  sessionMaxDays:       { type: DataTypes.INTEGER, allowNull: false, defaultValue: 7 },
  maxUploadMb:          { type: DataTypes.INTEGER, allowNull: false, defaultValue: 50 },
  updatedBy:            { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'tenant_settings',
  timestamps: true,
  underscored: true,
});

export default TenantSettings;
