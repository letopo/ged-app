// backend/src/models/PhpPatientDme.js — lien patient PHP ↔ fiche du DME
// (migration 20261117130000 ; logique : utils/phpPatientDme.js).
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PhpPatientDme = sequelize.define('PhpPatientDme', {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId:      { type: DataTypes.UUID, allowNull: false },
  patientId:     { type: DataTypes.UUID, allowNull: false },
  dmePatientId:  { type: DataTypes.INTEGER, allowNull: false },
  dossierNumero: { type: DataTypes.STRING(50), allowNull: true },
  dmeNom:        { type: DataTypes.STRING(220), allowNull: true },
  statut:        { type: DataTypes.STRING(10), allowNull: false, validate: { isIn: [['confirme', 'ecarte']] } },
  source:        { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'auto', validate: { isIn: [['auto', 'manuel']] } },
  decidedBy:     { type: DataTypes.UUID, allowNull: true },
  decidedByName: { type: DataTypes.STRING(150), allowNull: true },
}, {
  tableName: 'php_patient_dme',
  timestamps: true,
  underscored: true,
});

export default PhpPatientDme;
