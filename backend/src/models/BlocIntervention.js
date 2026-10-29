// backend/src/models/BlocIntervention.js
// Une ligne du programme opératoire de la semaine, saisie par un service.
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const BlocIntervention = sequelize.define('BlocIntervention', {
  id:                 { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  programmeId:        { type: DataTypes.UUID, allowNull: false },
  service:            { type: DataTypes.STRING(80), allowNull: false },
  jour:               { type: DataTypes.STRING(10), allowNull: false },
  nomPatient:         { type: DataTypes.STRING(160), allowNull: false },
  age:                { type: DataTypes.STRING(20), allowNull: true },
  natureIntervention: { type: DataTypes.TEXT, allowNull: false },
  intervenant:        { type: DataTypes.STRING(120), allowNull: true },
  numeroSalle:        { type: DataTypes.STRING(20), allowNull: true },
  createdBy:          { type: DataTypes.UUID, allowNull: true },
  updatedBy:          { type: DataTypes.UUID, allowNull: true },
  tenantId:           { type: DataTypes.UUID, allowNull: false },
}, {
  tableName: 'bloc_interventions',
  timestamps: true,
  underscored: true,
});

BlocIntervention.associate = function (models) {
  this.belongsTo(models.BlocProgramme, { foreignKey: 'programmeId', as: 'programme' });
  this.belongsTo(models.User, { foreignKey: 'createdBy', as: 'author' });
};

export default BlocIntervention;
