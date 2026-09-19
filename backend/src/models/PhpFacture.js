// backend/src/models/PhpFacture.js — Module factures PHP (secrétaire)
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PhpFacture = sequelize.define('PhpFacture', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  // N° DATE — numéro d'ordre séquentiel
  numeroOrdre:     { type: DataTypes.INTEGER, allowNull: true, field: 'numero_ordre' },
  // DATE — date de réception/saisie
  dateReception:   { type: DataTypes.DATEONLY, allowNull: true, field: 'date_reception' },
  // DESIGNATION — fournisseur (extrait)
  fournisseur:     { type: DataTypes.STRING(255), allowNull: true },
  // DATE FACTURE — date de la facture (extraite)
  dateFacture:     { type: DataTypes.DATEONLY, allowNull: true, field: 'date_facture' },
  // N° FACTURE — numéro de facture (extrait)
  numeroFacture:   { type: DataTypes.STRING(120), allowNull: true, field: 'numero_facture' },
  // N° C — code comptable attribué par la secrétaire
  numeroComptable: { type: DataTypes.STRING(120), allowNull: true, field: 'numero_comptable' },
  // MONTANT — montant total (extrait)
  montant:         { type: DataTypes.DECIMAL(18, 2), allowNull: true },
  devise:          { type: DataTypes.STRING(8), allowNull: false, defaultValue: 'XAF' },
  documentId:      { type: DataTypes.UUID, allowNull: true, field: 'document_id' },
  statut:          { type: DataTypes.ENUM('brouillon', 'valide'), allowNull: false, defaultValue: 'brouillon' },
  extraction:      { type: DataTypes.JSONB, allowNull: true },
  saisiPar:        { type: DataTypes.UUID, allowNull: true, field: 'saisi_par' },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false
  },
}, {
  tableName: 'php_factures',
  timestamps: true,
  underscored: true,
});

PhpFacture.associate = function (models) {
  this.belongsTo(models.Document, { foreignKey: 'documentId', as: 'document' });
  this.belongsTo(models.User, { foreignKey: 'saisiPar', as: 'saisiParUser' });
};

export default PhpFacture;
