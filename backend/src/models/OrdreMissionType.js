// backend/src/models/OrdreMissionType.js
// Les 3 types d'ordre de mission et leur chaîne de validation (par code de poste).

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const OrdreMissionType = sequelize.define('OrdreMissionType', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING(40),
    allowNull: false,
    unique: true,
    comment: 'paramedical | administratif | strategie',
  },
  label: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  // Chaîne de validation : liste ordonnée de codes de poste, ex: ["dds","ds","dg"]
  // (le chef du service demandeur est ajouté en tête, le comptable en fin si frais).
  posteChain: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    field: 'poste_chain',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },
}, {
  tableName: 'ordre_mission_types',
  timestamps: true,
  underscored: true,
});

export default OrdreMissionType;
