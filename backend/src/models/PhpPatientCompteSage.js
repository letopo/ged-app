// backend/src/models/PhpPatientCompteSage.js — décision sur un compte tiers Sage
// d'un patient PHP (migration 20261111120000 ; logique : utils/phpSageComptes.js).
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PhpPatientCompteSage = sequelize.define('PhpPatientCompteSage', {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId:      { type: DataTypes.UUID, allowNull: false },
  patientId:     { type: DataTypes.UUID, allowNull: false },
  compteTiers:   { type: DataTypes.STRING(17), allowNull: false },
  statut:        { type: DataTypes.STRING(10), allowNull: false, validate: { isIn: [['confirme', 'ecarte']] } },
  source:        { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'auto', validate: { isIn: [['auto', 'manuel']] } },
  decidedBy:     { type: DataTypes.UUID, allowNull: true },
  decidedByName: { type: DataTypes.STRING(150), allowNull: true },
}, {
  tableName: 'php_patient_comptes_sage',
  timestamps: true,
  underscored: true,
});

export default PhpPatientCompteSage;
