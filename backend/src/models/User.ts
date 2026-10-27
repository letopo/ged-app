// backend/src/models/User.ts

import { DataTypes, Model } from 'sequelize';
import type { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import sequelize from '../config/database.js';
import bcrypt from 'bcryptjs';
import { initModel } from './types.js';
import type { ModelRegistry } from './types.js';

export type UserRole =
  | 'user' | 'validator' | 'director' | 'admin' | 'gardien'
  | 'agent_accueil_PHP' | 'agent_accueil_normal' | 'chef_de_service' | 'caissier' | 'superadmin';

class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<string>;
  declare email: string;
  /** Exclu par le defaultScope : lire avec User.scope('withPassword') ou unscoped(). */
  declare password: string;
  declare firstName: string;
  declare lastName: string;
  declare username: string;
  declare role: CreationOptional<UserRole>;
  declare signaturePath: string | null;
  declare stampPath: string | null;
  /** Largeur physique du tampon (mm), renvoyée en nombre. */
  declare stampWidthMm: CreationOptional<number>;
  declare stampHeightMm: CreationOptional<number>;
  declare isActive: CreationOptional<boolean>;
  /** L'incrémenter révoque toutes les sessions (utils/sessionTokens.js). */
  declare tokenVersion: CreationOptional<number>;
  declare lastLogin: Date | null;
  declare tenantId: CreationOptional<string>;
  declare totpSecret: string | null;
  declare totpEnabled: CreationOptional<boolean>;
  declare emailOtpEnabled: CreationOptional<boolean>;
  declare emailOtpHash: string | null;
  declare emailOtpExpiresAt: Date | null;
  declare emailOtpAttempts: CreationOptional<number>;
  declare emailOtpSentAt: Date | null;
  declare isAbsent: CreationOptional<boolean>;
  declare substituteId: string | null;
  declare lang: CreationOptional<string>;
  declare seenReleaseNotes: CreationOptional<string[]>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  async comparePassword(enteredPassword: string): Promise<boolean> {
    return await bcrypt.compare(enteredPassword, this.password);
  }

  static associate(models: ModelRegistry) {
    this.hasMany(models.Document, { foreignKey: 'userId', as: 'documents' });
    this.hasMany(models.Workflow, { foreignKey: 'validatorId', as: 'tasks' });
    this.hasMany(models.ServiceMember, { foreignKey: 'userId', as: 'serviceMemberships' });
    this.belongsTo(models.User, { foreignKey: 'substituteId', as: 'substitute' });
  }
}

initModel(User, {
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
  // Version des jetons : l'incrémenter révoque toutes les sessions (utils/sessionTokens.js)
  tokenVersion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'token_version' },
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
  sequelize,
  modelName: 'User',
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
    beforeSave: async (user: User) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

export default User;