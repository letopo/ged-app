// backend/src/models/TenantSettings.ts — réglages généraux d'un tenant
// (migration 20261001120000-create-tenant-settings ; lecture via
// utils/tenantSettings.js, qui applique les valeurs par défaut).
import { DataTypes, Model } from 'sequelize';
import type { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import sequelize from '../config/database.js';
import { initModel } from './types.js';

class TenantSettings extends Model<InferAttributes<TenantSettings>, InferCreationAttributes<TenantSettings>> {
  declare id: CreationOptional<string>;
  declare tenantId: CreationOptional<string>;
  declare workflowDeadlineDays: CreationOptional<number>;
  declare lateDays: CreationOptional<number>;
  declare sessionIdleMinutes: CreationOptional<number>;
  declare sessionMaxDays: CreationOptional<number>;
  declare rememberMeDays: CreationOptional<number>;
  declare maxUploadMb: CreationOptional<number>;
  declare stampRealSize: CreationOptional<boolean>;
  /** Codes de postes autorisés à voir « BL PHP en attente ». */
  declare sageBlAccessPostes: CreationOptional<string[]>;
  declare fleetAdminAccess: CreationOptional<boolean>;
  /** Services qui remplissent le programme opératoire de la semaine. */
  declare blocServices: CreationOptional<string[]>;
  declare updatedBy: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

initModel(TenantSettings, {
  id:                   { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId:             { type: DataTypes.UUID, allowNull: false, unique: true },
  workflowDeadlineDays: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 7 },
  lateDays:             { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2 },
  sessionIdleMinutes:   { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
  sessionMaxDays:       { type: DataTypes.INTEGER, allowNull: false, defaultValue: 7 },
  // « Rester connecté sur cet appareil » (jours) ; 0 = option désactivée
  rememberMeDays:       { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
  maxUploadMb:          { type: DataTypes.INTEGER, allowNull: false, defaultValue: 50 },
  stampRealSize:        { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  // Postes autorisés à voir « BL PHP en attente » (le superadmin y a toujours accès)
  sageBlAccessPostes:   { type: DataTypes.JSONB, allowNull: false, defaultValue: ['facturation', 'dg', 'ccg'] },
  // Parc véhicules ouvert aux administrateurs (décidé par le superadmin)
  fleetAdminAccess:     { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'fleet_admin_access' },
  // Services qui remplissent le programme opératoire de la semaine
  blocServices:         { type: DataTypes.JSONB, allowNull: false, defaultValue: ['Chirurgie', 'Gynécologie', 'Pédiatrie', 'Médecine', 'ORL', 'Ophtalmologie'] },
  updatedBy:            { type: DataTypes.UUID, allowNull: true },
}, {
  sequelize,
  modelName: 'TenantSettings',
  tableName: 'tenant_settings',
  timestamps: true,
  underscored: true,
});

export default TenantSettings;
