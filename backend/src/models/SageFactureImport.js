// backend/src/models/SageFactureImport.js — Suivi des factures patient PHP
// importées depuis Sage (voir utils/sageFactureSync.js). À ne pas confondre
// avec PhpFacture (factures FOURNISSEURS scannées par la secrétaire).
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const SageFactureImport = sequelize.define('SageFactureImport', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  sageDocPiece:   { type: DataTypes.STRING(64), allowNull: false, unique: true, field: 'sage_doc_piece' },
  sageClientNum:  { type: DataTypes.STRING(64), allowNull: true, field: 'sage_client_num' },
  patientNom:     { type: DataTypes.STRING(255), allowNull: true, field: 'patient_nom' },
  encounterKey:   { type: DataTypes.STRING(128), allowNull: true, field: 'encounter_key' },
  montantHT:      { type: DataTypes.DECIMAL(18, 2), allowNull: true, field: 'montant_ht' },
  montantTTC:     { type: DataTypes.DECIMAL(18, 2), allowNull: true, field: 'montant_ttc' },
  documentId:     { type: DataTypes.UUID, allowNull: true, field: 'document_id' },
  rawSnapshot:    { type: DataTypes.JSONB, allowNull: true, field: 'raw_snapshot' },
  importedAt:     { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'imported_at' },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  tableName: 'sage_facture_imports',
  timestamps: true,
  underscored: true,
});

SageFactureImport.associate = function (models) {
  this.belongsTo(models.Document, { foreignKey: 'documentId', as: 'document' });
};

export default SageFactureImport;
