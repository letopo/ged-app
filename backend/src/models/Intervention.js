// backend/src/models/Intervention.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Intervention = sequelize.define('Intervention', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  equipement_id: { type: DataTypes.INTEGER, allowNull: false },
  plan_id: { type: DataTypes.INTEGER, allowNull: true },
  type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'preventive',
    validate: { isIn: [['preventive', 'corrective']] }
  },
  statut: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'planifiee',
    validate: { isIn: [['planifiee', 'en_cours', 'terminee', 'reportee']] }
  },
  priorite: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'normal',
    validate: { isIn: [['faible', 'normal', 'urgent']] }
  },
  date_planifiee: { type: DataTypes.DATEONLY, allowNull: false },
  date_realisation: { type: DataTypes.DATEONLY, allowNull: true },
  technicien_id: { type: DataTypes.UUID, allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  actions_effectuees: { type: DataTypes.TEXT, allowNull: true },
  pieces_remplacees: { type: DataTypes.TEXT, allowNull: true },
  duree_reelle: { type: DataTypes.FLOAT, allowNull: true },
  observations: { type: DataTypes.TEXT, allowNull: true },
  signale_par: { type: DataTypes.STRING(255), allowNull: true },
}, {
  tableName: 'interventions',
  timestamps: true,
  underscored: true
});

export default Intervention;
