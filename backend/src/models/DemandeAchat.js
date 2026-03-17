// backend/src/models/DemandeAchat.js
// Remplacer le fichier complet par cette version corrigée :
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const DemandeAchat = sequelize.define('DemandeAchat', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  daNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  requesterId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'requester_id',
  },
  daDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'da_date',
  },
  domain: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  domainDescription: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'domain_description',
  },
  deliveryDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'delivery_date',
  },
  purchaseType: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'purchase_type',
  },
  articleNature: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'article_nature',
  },
  requestDescription: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'request_description',
  },
  beneficiaryName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'beneficiary_name',
  },
  beneficiaryEmail: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'beneficiary_email',
  },
  beneficiaryPhone: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'beneficiary_phone',
  },
  isMagasinOutput: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_magasin_output',
  },
  linkedDocNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'linked_doc_number',
  },
  isForWorks: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_for_works',
  },
  nonRefArticles: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    field: 'non_ref_articles',
  },
  totalRefValue: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    field: 'total_ref_value',
  },
  totalNonRefValue: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    field: 'total_non_ref_value',
  },
  attachedDocuments: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    field: 'attached_documents',
  },
  supplierId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'supplier_id',
  },
  status: {
    type: DataTypes.ENUM('draft', 'pending_approval', 'approved', 'rejected', 'in_progress', 'completed'),
    defaultValue: 'draft',
  },
}, {
  tableName: 'demandes_achats',
  timestamps: true,
  underscored: true,
});

DemandeAchat.associate = function(models) {
  this.belongsTo(models.User, {
    as: 'requester',
    foreignKey: 'requesterId',
  });
};

export default DemandeAchat;