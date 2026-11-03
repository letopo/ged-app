// backend/src/models/PharmacieLignePHP.js - Module PHP
// Registre de pharmacie : un produit prescrit à un patient (feuille PHARMACIE
// de l'Excel du Point Focal). Reste à servir = prescrite − servie.
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export const PHARMACIE_SOURCES = ['hsjm', 'hopital_ext', 'medecin_travail'];

const PharmacieLignePHP = sequelize.define('PharmacieLignePHP', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  patientId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'patient_id'
  },
  consultationId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'consultation_id'
  },
  datePrescription: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'date_prescription'
  },
  source: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'hsjm',
    validate: { isIn: [PHARMACIE_SOURCES] }
  },
  produit: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  quantitePrescrite: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    field: 'quantite_prescrite'
  },
  quantiteServie: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'quantite_servie'
  },
  serviLe: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'servi_le'
  },
  serviParId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'servi_par_id'
  },
  createdByUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'created_by_user_id'
  },
  // Ligne d'origine dans HSJM_Gestion_v3.xlsm (import sans doublons, utils/phpExcelImport.js)
  excelRef: {
    type: DataTypes.STRING(80),
    allowNull: true,
    field: 'excel_ref'
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'tenant_id'
  }
}, {
  tableName: 'php_pharmacie_lignes',
  timestamps: true,
  underscored: true
});

PharmacieLignePHP.associate = function(models) {
  PharmacieLignePHP.belongsTo(models.PatientPHP, { as: 'patient', foreignKey: 'patient_id' });
  PharmacieLignePHP.belongsTo(models.ConsultationPHP, { as: 'consultation', foreignKey: 'consultation_id' });
};

export default PharmacieLignePHP;
