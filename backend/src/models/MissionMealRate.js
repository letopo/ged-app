// backend/src/models/MissionMealRate.js
// Barème des indemnités de repas de mission, par catégorie de personnel.
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const MissionMealRate = sequelize.define('MissionMealRate', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  categorie: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  montantPetitDejeuner: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'montant_petit_dejeuner',
  },
  montantDejeuner: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'montant_dejeuner',
  },
  montantDiner: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'montant_diner',
  },
  montantHebergement: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'montant_hebergement',
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  tableName: 'mission_meal_rates',
  timestamps: true,
  underscored: true,
  indexes: [
    { unique: true, fields: ['tenant_id', 'categorie'] },
  ],
});

export default MissionMealRate;
