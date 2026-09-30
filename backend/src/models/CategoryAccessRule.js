// backend/src/models/CategoryAccessRule.js — confidentialité d'une catégorie de
// documents (migration 20261001160100 ; logique : utils/categoryAccess.js).
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const CategoryAccessRule = sequelize.define('CategoryAccessRule', {
  id:                  { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId:            { type: DataTypes.UUID, allowNull: false },
  category:            { type: DataTypes.STRING(150), allowNull: false },
  allowedPostes:       { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  includeParticipants: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  updatedBy:           { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'category_access_rules',
  timestamps: true,
  underscored: true,
});

export default CategoryAccessRule;
