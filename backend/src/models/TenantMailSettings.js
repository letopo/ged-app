// backend/src/models/TenantMailSettings.js — réglages SMTP d'un tenant
// (migration 20261001100000-create-tenant-mail-settings, utils/mailer.js,
// controllers/mailSettingsController.js). Le mot de passe est stocké chiffré
// (utils/secretBox.js) et n'est jamais renvoyé au navigateur.
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export const MAIL_SECURITY_MODES = ['none', 'starttls', 'ssl'];

const TenantMailSettings = sequelize.define('TenantMailSettings', {
  id:                { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId:          { type: DataTypes.UUID, allowNull: false, unique: true },
  enabled:           { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  host:              { type: DataTypes.STRING(255), allowNull: true },
  port:              { type: DataTypes.INTEGER, allowNull: true },
  security:          { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'starttls', validate: { isIn: [MAIL_SECURITY_MODES] } },
  username:          { type: DataTypes.STRING(255), allowNull: true },
  passwordEncrypted: { type: DataTypes.TEXT, allowNull: true },
  fromName:          { type: DataTypes.STRING(150), allowNull: true },
  fromEmail:         { type: DataTypes.STRING(255), allowNull: true },
  replyTo:           { type: DataTypes.STRING(255), allowNull: true },
  adminCanManage:    { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  lastTestAt:        { type: DataTypes.DATE, allowNull: true },
  lastTestOk:        { type: DataTypes.BOOLEAN, allowNull: true },
  lastTestError:     { type: DataTypes.TEXT, allowNull: true },
  lastSentAt:        { type: DataTypes.DATE, allowNull: true },
  lastErrorAt:       { type: DataTypes.DATE, allowNull: true },
  lastError:         { type: DataTypes.TEXT, allowNull: true },
  updatedBy:         { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'tenant_mail_settings',
  timestamps: true,
  underscored: true,
});

export default TenantMailSettings;
