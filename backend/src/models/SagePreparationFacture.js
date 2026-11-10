// backend/src/models/SagePreparationFacture.js — Facturation assistée d'un BPC
// (voir controllers/sagePreparationController.js). La GED n'écrit jamais dans
// Sage : elle prépare la liste des BL, puis retrouve la facture créée.
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const SagePreparationFacture = sequelize.define('SagePreparationFacture', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  compteTiers: { type: DataTypes.STRING(17), allowNull: false, field: 'compte_tiers' },
  patientNom: { type: DataTypes.STRING(255), allowNull: true, field: 'patient_nom' },
  patientType: { type: DataTypes.STRING(40), allowNull: true, field: 'patient_type' },
  bpcStart: { type: DataTypes.DATEONLY, allowNull: false, field: 'bpc_start' },
  bpcEnd: { type: DataTypes.DATEONLY, allowNull: false, field: 'bpc_end' },
  bl: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  montant: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'a_transformer' },
  factures: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  manquants: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  oublies: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  checkedAt: { type: DataTypes.DATE, allowNull: true, field: 'checked_at' },
  invoicedAt: { type: DataTypes.DATE, allowNull: true, field: 'invoiced_at' },
  note: { type: DataTypes.STRING(500), allowNull: true },
  preparedBy: { type: DataTypes.UUID, allowNull: true, field: 'prepared_by' },
  preparedByName: { type: DataTypes.STRING(150), allowNull: true, field: 'prepared_by_name' },
  tenantId: { type: DataTypes.UUID, allowNull: false },
}, {
  tableName: 'sage_preparations_facture',
  timestamps: true,
  underscored: true,
});

export default SagePreparationFacture;
