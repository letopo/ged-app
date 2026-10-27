// backend/src/models/UserPasskey.ts — connexion sans mot de passe (WebAuthn)
// (migration 20261027160000-create-user-passkeys ; logique dans
// controllers/passkeyController.js). Sans tenantId : aucun filtre d'établissement.
import { DataTypes, Model } from 'sequelize';
import type { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import sequelize from '../config/database.js';
import { initModel } from './types.js';

class UserPasskey extends Model<InferAttributes<UserPasskey>, InferCreationAttributes<UserPasskey>> {
  declare id: CreationOptional<string>;
  declare userId: string;
  /** Identifiant de la clé (base64url), donné par l'appareil. */
  declare credentialId: string;
  /** Clé publique COSE (base64url). */
  declare publicKey: string;
  declare counter: CreationOptional<number>;
  declare transports: CreationOptional<string[]>;
  /** Appareil d'enregistrement, ex. « Chrome · Android ». */
  declare name: string | null;
  declare lastUsedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

initModel(UserPasskey, {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId:       { type: DataTypes.UUID, allowNull: false },
  credentialId: { type: DataTypes.TEXT, allowNull: false, unique: true },
  publicKey:    { type: DataTypes.TEXT, allowNull: false },
  // BIGINT : Sequelize le rend en chaîne ; converti en nombre à la lecture
  counter:      { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0, get() { return Number(this.getDataValue('counter')); } },
  transports:   { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  name:         { type: DataTypes.STRING(120), allowNull: true },
  lastUsedAt:   { type: DataTypes.DATE, allowNull: true },
}, {
  sequelize,
  modelName: 'UserPasskey',
  tableName: 'user_passkeys',
  timestamps: true,
  underscored: true,
});

export default UserPasskey;
