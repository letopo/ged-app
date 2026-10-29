// backend/src/models/BlocProgramme.js
// Programme opératoire d'une semaine (lundi = weekStart), rempli par tous les
// services (migration 20261029120000-programme-operatoire, routes/bloc.js).
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const BlocProgramme = sequelize.define('BlocProgramme', {
  id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  weekStart:  { type: DataTypes.DATEONLY, allowNull: false },
  // ouvert → cloture (plus de saisie) → envoye (document créé et parti à la signature)
  status:     { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'ouvert' },
  closedBy:   { type: DataTypes.UUID, allowNull: true },
  closedAt:   { type: DataTypes.DATE, allowNull: true },
  documentId: { type: DataTypes.UUID, allowNull: true },
  tenantId:   { type: DataTypes.UUID, allowNull: false },
}, {
  tableName: 'bloc_programmes',
  timestamps: true,
  underscored: true,
});

BlocProgramme.associate = function (models) {
  this.hasMany(models.BlocIntervention, { foreignKey: 'programmeId', as: 'interventions' });
  this.belongsTo(models.User, { foreignKey: 'closedBy', as: 'closedByUser' });
};

export default BlocProgramme;
