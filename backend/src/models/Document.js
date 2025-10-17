// backend/src/models/Document.js - MISE À JOUR
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false
  },
  originalName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'original_name'
  },
  path: {
    type: DataTypes.STRING,
    allowNull: false
  },
  size: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('draft', 'pending_validation', 'validated', 'rejected', 'archived'),
    defaultValue: 'draft'
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Métadonnées supplémentaires (OCR, workflow, etc.)'
  },
  extractedText: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'extracted_text',
    comment: 'Texte extrait par OCR'
  }
}, {
  tableName: 'documents',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['type'] },
    { fields: ['status'] },
    { fields: ['category'] },
    { fields: ['created_at'] }
  ]
});

export default Document;