// backend/src/models/Document.js - VERSION FINALE COMPLÈTE ET CORRIGÉE

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'file_name',
  },
  originalName: {
    type: DataTypes.STRING,
    allowNull: true, // Peut être null si on ne le sauvegarde pas
    field: 'original_name',
  },
  filePath: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'file_path',
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'file_size',
  },
  fileType: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'file_type',
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  linkedDocumentId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'linked_document_id',
  },
  dateDebut: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'date_debut',
  },
  dateFin: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'date_fin',
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'draft',
  },
  metadata: {
    type: DataTypes.JSONB,
  },
  extractedText: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'extracted_text',
  }
}, {
  tableName: 'documents',
  timestamps: true,
  underscored: true,
});

Document.associate = function(models) {
  this.belongsTo(models.User, { foreignKey: 'userId', as: 'uploadedBy' });
  this.hasMany(models.Workflow, { foreignKey: 'documentId', as: 'workflows' });
  this.belongsTo(models.Document, { foreignKey: 'linkedDocumentId', as: 'linkedDocument' });
  this.hasMany(models.Document, { foreignKey: 'linkedDocumentId', as: 'dependentDocuments' });
};

export default Document;