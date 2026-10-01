// backend/src/models/User.js

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import bcrypt from 'bcryptjs';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  role: {
    type: DataTypes.ENUM(
      'user',
      'validator',
      'director',
      'admin',
      'gardien',
      'agent_accueil_PHP',
      'agent_accueil_normal',
      'chef_de_service',
      'caissier',
      'superadmin'
    ),
    defaultValue: 'user'
  },
  signaturePath: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Chemin vers l\'image de la signature de l\'utilisateur'
  },
  stampPath: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Chemin vers l\'image du cachet de l\'utilisateur'
  },
  // Dimensions physiques du tampon (mm) : le cachet est apposé à cette largeur
  // exacte, la hauteur suit le ratio de l'image (utils/stampSize.js)
  stampWidthMm: {
    type: DataTypes.DECIMAL(5, 1),
    allowNull: false,
    defaultValue: 58,
    get() { const v = this.getDataValue('stampWidthMm'); return v == null ? null : Number(v); },
  },
  stampHeightMm: {
    type: DataTypes.DECIMAL(5, 1),
    allowNull: false,
    defaultValue: 22,
    get() { const v = this.getDataValue('stampHeightMm'); return v == null ? null : Number(v); },
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  totpSecret: {
    type: DataTypes.STRING,
    allowNull: true
  },
  totpEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // Double authentification par e-mail (controllers/twoFactorController.js)
  emailOtpEnabled:   { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'email_otp_enabled' },
  emailOtpHash:      { type: DataTypes.STRING(128), allowNull: true, field: 'email_otp_hash' },
  emailOtpExpiresAt: { type: DataTypes.DATE, allowNull: true, field: 'email_otp_expires_at' },
  emailOtpAttempts:  { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'email_otp_attempts' },
  emailOtpSentAt:    { type: DataTypes.DATE, allowNull: true, field: 'email_otp_sent_at' },
  // Statut présence — quand true, ses tâches de validation en cours/à venir
  // sont automatiquement redirigées vers substituteId (voir Workflow.isSubstituted).
  isAbsent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_absent',
  },
  // Remplaçant fixe ("n-1") désigné pour cet utilisateur, assigné par un admin.
  substituteId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'substitute_id',
  },
  // Langue de l'interface choisie par l'utilisateur (fr/en/es/ar).
  lang: {
    type: DataTypes.STRING(5),
    allowNull: false,
    defaultValue: 'fr',
  },
  // Identifiants des notes « Nouveautés » déjà vues (cf. frontend src/releaseNotes.js).
  seenReleaseNotes: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    field: 'seen_release_notes',
  },
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,
  // Secrets jamais renvoyés par défaut (liste des utilisateurs accessible à
  // tout utilisateur connecté) : lire avec User.unscoped() quand il le faut.
  defaultScope: {
    attributes: { exclude: ['password', 'totpSecret', 'emailOtpHash'] }
  },
  scopes: {
    withPassword: {
      attributes: { include: ['password'] }
    }
  },
  hooks: {
    beforeSave: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

User.prototype.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

User.associate = function(models) {
  this.hasMany(models.Document, { foreignKey: 'userId', as: 'documents' });
  this.hasMany(models.Workflow, { foreignKey: 'validatorId', as: 'tasks' });
  this.hasMany(models.ServiceMember, { foreignKey: 'userId', as: 'serviceMemberships' });
  this.belongsTo(models.User, { foreignKey: 'substituteId', as: 'substitute' });
};

export default User;