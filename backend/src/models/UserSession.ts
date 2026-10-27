// backend/src/models/UserSession.ts — appareils connectés d'un compte
// (migration 20261027140000-create-user-sessions ; logique dans
// utils/sessionTokens.js). Sans tenantId : aucun filtre d'établissement.
import { DataTypes, Model } from 'sequelize';
import type { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import sequelize from '../config/database.js';
import { initModel } from './types.js';

class UserSession extends Model<InferAttributes<UserSession>, InferCreationAttributes<UserSession>> {
  declare id: CreationOptional<string>;
  declare userId: string;
  /** Connexion avec « Rester connecté sur cet appareil ». */
  declare remember: CreationOptional<boolean>;
  declare ip: string | null;
  declare userAgent: string | null;
  declare lastSeenAt: Date;
  declare expiresAt: Date;
  /** Déconnecté (à distance, par déconnexion ou révocation des sessions). */
  declare revokedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

initModel(UserSession, {
  id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId:     { type: DataTypes.UUID, allowNull: false },
  remember:   { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  ip:         { type: DataTypes.STRING(64), allowNull: true },
  userAgent:  { type: DataTypes.TEXT, allowNull: true },
  lastSeenAt: { type: DataTypes.DATE, allowNull: false },
  expiresAt:  { type: DataTypes.DATE, allowNull: false },
  revokedAt:  { type: DataTypes.DATE, allowNull: true },
}, {
  sequelize,
  modelName: 'UserSession',
  tableName: 'user_sessions',
  timestamps: true,
  underscored: true,
});

export default UserSession;
