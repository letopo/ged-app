// backend/src/models/PlanMaintenance.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PlanMaintenance = sequelize.define('PlanMaintenance', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  equipement_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'equipements', key: 'id' },
  },
  // Array of month numbers [1..12] — e.g. [1,4,7,10] = quarterly
  mois: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
  jour_du_mois: {
    type: DataTypes.INTEGER, // 1-31
    allowNull: false,
  },
  duree_estimee: { type: DataTypes.FLOAT, allowNull: true },
  technicien_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },
  notes: { type: DataTypes.TEXT, allowNull: true },
  actif: { type: DataTypes.BOOLEAN, defaultValue: true, allowNull: false },
}, {
  tableName: 'plans_maintenance',
  timestamps: true,
  underscored: true,
});

export default PlanMaintenance;
